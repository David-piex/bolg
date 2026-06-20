param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

function Test-CommandOrMissing($Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  return "missing"
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$nodeBin = "C:\Users\Yao\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$env:PATH = "$nodeBin;$root\scripts;$env:PATH"

$checks = [ordered]@{
  "project_root" = $root.Path
  "node" = Test-CommandOrMissing "node"
  "pnpm" = Test-CommandOrMissing "pnpm"
  "java" = Test-CommandOrMissing "java"
  "mvn" = Test-CommandOrMissing "mvn"
  "docker" = Test-CommandOrMissing "docker"
  "docker_compose_file" = if (Test-Path (Join-Path $root "deploy/docker-compose.yml")) { "present" } else { "missing" }
  "nginx_config" = if (Test-Path (Join-Path $root "deploy/nginx/site.conf")) { "present" } else { "missing" }
}

Push-Location $root
try {
  if (-not $SkipBuild) {
    Push-Location (Join-Path $root "backend")
    try {
      mvn test
      if ($LASTEXITCODE -ne 0) { throw "backend tests failed" }
    } finally {
      Pop-Location
    }

    .\node_modules\.bin\vitest.CMD run
    if ($LASTEXITCODE -ne 0) { throw "frontend tests failed" }

    .\node_modules\.bin\next.CMD build
    if ($LASTEXITCODE -ne 0) { throw "frontend build failed" }
  }
} finally {
  Pop-Location
}

$checks.GetEnumerator() | ForEach-Object {
  [pscustomobject]@{
    Check = $_.Key
    Result = $_.Value
  }
}
