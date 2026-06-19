param(
  [switch]$Production,
  [switch]$SkipBuild,
  [switch]$SkipEnv
)

$ErrorActionPreference = "Stop"

function Read-DotEnv($Path) {
  $values = @{}
  if (-not (Test-Path $Path)) {
    return $values
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }

    $name, $value = $line.Split("=", 2)
    $name = $name.Trim()
    $value = $value.Trim().Trim('"').Trim("'")
    if ($name) {
      $values[$name] = $value
    }
  }

  return $values
}

function Get-ConfigValue($Name, $DotEnv) {
  $envValue = [Environment]::GetEnvironmentVariable($Name)
  if (-not [string]::IsNullOrWhiteSpace($envValue)) {
    return $envValue
  }

  if ($DotEnv.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace($DotEnv[$Name])) {
    return $DotEnv[$Name]
  }

  return $null
}

function Require-Command($Name, $InstallHint) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "$Name is not installed or not in PATH. $InstallHint"
  }

  return $command.Source
}

function Add-ExistingPath($Path) {
  if ((Test-Path $Path) -and -not ($env:PATH.Split(";") -contains $Path)) {
    $env:PATH = "$Path;$env:PATH"
  }
}

function Test-NetlifyLogin($Token) {
  if ([string]::IsNullOrWhiteSpace($Token)) {
    throw "Netlify CLI is installed, but this script needs non-interactive auth. Run: netlify login and deploy manually, or set NETLIFY_AUTH_TOKEN in .env.local."
  }

  $env:NETLIFY_AUTH_TOKEN = $Token
  $output = & netlify status --json --auth $Token 2>&1
  $message = ($output | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $message -match "Authentication required|Not logged in|NETLIFY_AUTH_TOKEN is not set") {
    throw "NETLIFY_AUTH_TOKEN is set but Netlify authentication failed. $message"
  }

  $output | Out-Host
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$node = "C:\Users\Yao\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$envPath = Join-Path $root ".env.local"
$dotEnv = Read-DotEnv $envPath
$requiredEnv = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDINARY_UPLOAD_FOLDER",
  "NEXT_PUBLIC_SITE_URL",
  "ADMIN_EMAIL"
)
$netlifyToken = Get-ConfigValue "NETLIFY_AUTH_TOKEN" $dotEnv

Add-ExistingPath "C:\Users\Yao\AppData\Local\OpenAI\Codex\runtimes\cua_node\a89897d3d9baa117\bin"
Add-ExistingPath "C:\Users\Yao\AppData\Roaming\npm"

Push-Location $root
try {
  Require-Command "netlify" "Install it with: npm install -g netlify-cli"

  if (-not $SkipBuild) {
    if (-not (Test-Path $node)) {
      throw "Bundled Node runtime is missing: $node"
    }

    & $node ".\node_modules\vitest\vitest.mjs" run
    & $node ".\node_modules\typescript\bin\tsc" --noEmit
    & $node ".\node_modules\next\dist\bin\next" build
  }

  Test-NetlifyLogin $netlifyToken

  if (-not $SkipEnv) {
    foreach ($name in $requiredEnv) {
      $value = Get-ConfigValue $name $dotEnv
      if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Missing $name. Put it in .env.local or set it as a process/user environment variable."
      }

      & netlify env:set $name $value
    }
  }

  if ($Production) {
    & netlify deploy --build --prod
  } else {
    & netlify deploy --build
  }
} finally {
  Pop-Location
}
