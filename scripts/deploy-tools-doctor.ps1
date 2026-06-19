param(
  [switch]$WithInstallHints
)

$ErrorActionPreference = "Stop"

function Find-Command($Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  return "missing"
}

function Add-ExistingPath($Path) {
  if ((Test-Path $Path) -and -not ($env:PATH.Split(";") -contains $Path)) {
    $env:PATH = "$Path;$env:PATH"
  }
}

$candidatePaths = @(
  "C:\Users\Yao\AppData\Local\OpenAI\Codex\runtimes\cua_node\a89897d3d9baa117\bin",
  "C:\Users\Yao\AppData\Local\nvm\v22.22.1",
  "C:\Users\Yao\AppData\Roaming\npm"
)

foreach ($path in $candidatePaths) {
  Add-ExistingPath $path
}

$checks = [ordered]@{
  "node" = Find-Command "node"
  "npm" = Find-Command "npm"
  "npx" = Find-Command "npx"
  "vercel" = Find-Command "vercel"
  "netlify" = Find-Command "netlify"
  "winget" = Find-Command "winget"
}

$checks.GetEnumerator() | ForEach-Object {
  [pscustomobject]@{
    Tool = $_.Key
    Path = $_.Value
  }
}

if ($WithInstallHints) {
  Write-Host ""
  Write-Host "If npm is missing, install or repair Node.js first:"
  Write-Host "  winget install OpenJS.NodeJS.LTS"
  Write-Host ""
  Write-Host "After npm works, install deployment CLIs:"
  Write-Host "  npm install -g vercel netlify-cli"
  Write-Host "  vercel login"
  Write-Host "  netlify login"
  Write-Host ""
  Write-Host "Then deploy from this project:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\vercel-deploy.ps1"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\netlify-deploy.ps1"
}
