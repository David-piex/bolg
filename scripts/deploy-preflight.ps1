param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Test-Command($Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  return $null
}

function Test-CommandOrMissing($Name) {
  $source = Test-Command $Name
  if ($source) {
    return $source
  }

  return "missing"
}

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

function Add-ExistingPath($Path) {
  if ((Test-Path $Path) -and -not ($env:PATH.Split(";") -contains $Path)) {
    $env:PATH = "$Path;$env:PATH"
  }
}

function Test-Env($Name, $DotEnv) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    if ($DotEnv.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace($DotEnv[$Name])) {
      return ".env.local"
    }

    return "missing"
  }

  return "environment"
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$node = "C:\Users\Yao\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$artifact = Join-Path $root "artifacts\rinana-vercel-source.tgz"
$dotEnv = Read-DotEnv (Join-Path $root ".env.local")

Add-ExistingPath "C:\Users\Yao\AppData\Local\OpenAI\Codex\runtimes\cua_node\a89897d3d9baa117\bin"
Add-ExistingPath "C:\Users\Yao\AppData\Roaming\npm"

$checks = [ordered]@{
  "project_root" = $root.Path
  "node" = if (Test-Path $node) { $node } else { "missing" }
  "vercel_cli" = Test-CommandOrMissing "vercel"
  "netlify_cli" = Test-CommandOrMissing "netlify"
  "npm" = Test-CommandOrMissing "npm"
  "pnpm" = Test-CommandOrMissing "pnpm"
  "NEXT_PUBLIC_SUPABASE_URL" = Test-Env "NEXT_PUBLIC_SUPABASE_URL" $dotEnv
  "NEXT_PUBLIC_SUPABASE_ANON_KEY" = Test-Env "NEXT_PUBLIC_SUPABASE_ANON_KEY" $dotEnv
  "SUPABASE_SERVICE_ROLE_KEY" = Test-Env "SUPABASE_SERVICE_ROLE_KEY" $dotEnv
  "CLOUDINARY_CLOUD_NAME" = Test-Env "CLOUDINARY_CLOUD_NAME" $dotEnv
  "CLOUDINARY_API_KEY" = Test-Env "CLOUDINARY_API_KEY" $dotEnv
  "CLOUDINARY_API_SECRET" = Test-Env "CLOUDINARY_API_SECRET" $dotEnv
  "NEXT_PUBLIC_SITE_URL" = Test-Env "NEXT_PUBLIC_SITE_URL" $dotEnv
  "ADMIN_EMAIL" = Test-Env "ADMIN_EMAIL" $dotEnv
  "VERCEL_TOKEN_optional" = Test-Env "VERCEL_TOKEN" $dotEnv
  "NETLIFY_AUTH_TOKEN_optional" = Test-Env "NETLIFY_AUTH_TOKEN" $dotEnv
  "source_artifact" = if (Test-Path $artifact) { $artifact } else { "missing" }
}

if (-not $SkipBuild) {
  if (-not (Test-Path $node)) {
    throw "Bundled Node runtime is missing: $node"
  }

  Push-Location $root
  try {
    & $node ".\node_modules\vitest\vitest.mjs" run
    & $node ".\node_modules\typescript\bin\tsc" --noEmit
    & $node ".\node_modules\next\dist\bin\next" build
  } finally {
    Pop-Location
  }
}

$checks.GetEnumerator() | ForEach-Object {
  [pscustomobject]@{
    Check = $_.Key
    Result = $_.Value
  }
}
