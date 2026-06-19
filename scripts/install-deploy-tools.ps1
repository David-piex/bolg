param(
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

function Find-Command($Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  return $null
}

function Add-ExistingPath($Path) {
  if ((Test-Path $Path) -and -not ($env:PATH.Split(";") -contains $Path)) {
    $env:PATH = "$Path;$env:PATH"
  }
}

function Show-Status {
  $tools = @("node", "npm", "npx", "vercel", "netlify", "winget")
  foreach ($tool in $tools) {
    $path = Find-Command $tool
    [pscustomobject]@{
      Tool = $tool
      Path = if ($path) { $path } else { "missing" }
    }
  }
}

Add-ExistingPath "C:\Program Files\nodejs"
Add-ExistingPath "C:\Users\Yao\AppData\Local\OpenAI\Codex\runtimes\cua_node\a89897d3d9baa117\bin"
Add-ExistingPath "C:\Users\Yao\AppData\Local\nvm\v22.22.1"
Add-ExistingPath "C:\Users\Yao\AppData\Roaming\npm"

if ($CheckOnly) {
  Show-Status
  return
}

if (-not (Find-Command "npm")) {
  if (-not (Find-Command "winget")) {
    throw "npm is missing and winget is not available. Install Node.js LTS manually, then rerun this script."
  }

  Write-Host "npm is missing. Installing or repairing Node.js LTS with winget..."
  winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -eq 1618) {
    throw "Windows Installer is already running another install. Wait for it to finish or reboot Windows, then rerun this script."
  }
  if ($LASTEXITCODE -ne 0) {
    throw "winget failed to install Node.js LTS. Exit code: $LASTEXITCODE"
  }

  Add-ExistingPath "C:\Program Files\nodejs"
  Add-ExistingPath "C:\Users\Yao\AppData\Local\OpenAI\Codex\runtimes\cua_node\a89897d3d9baa117\bin"
  Add-ExistingPath "C:\Users\Yao\AppData\Roaming\npm"
}

if (-not (Find-Command "npm")) {
  throw "Node.js install completed or returned, but npm is still missing in this shell. Open a new PowerShell window and rerun this script."
}

if (-not (Find-Command "vercel")) {
  Write-Host "Installing Vercel CLI..."
  npm install -g vercel
}

if (-not (Find-Command "netlify")) {
  Write-Host "Installing Netlify CLI..."
  npm install -g netlify-cli
}

Show-Status
