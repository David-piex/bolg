param(
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$artifacts = Join-Path $root "artifacts"
if (-not (Test-Path $artifacts)) {
  New-Item -ItemType Directory -Path $artifacts | Out-Null
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $artifacts "rinana-docker-source.tgz"
}

$tempPath = Join-Path $env:TEMP ("rinana-docker-source-" + [guid]::NewGuid().ToString("N") + ".tgz")

try {
  $tarArgs = @(
    "-czf", $tempPath,
    "--exclude=./.git",
    "--exclude=./node_modules",
    "--exclude=./.next",
    "--exclude=./.open-next",
    "--exclude=./.netlify",
    "--exclude=./.wrangler",
    "--exclude=./backend/target",
    "--exclude=./artifacts",
    "--exclude=./.env.local",
    "--exclude=./deploy/env/*.env",
    "--exclude=./C*UsersYao",
    "--exclude=./*cd*",
    "--exclude=./node-v*",
    "--exclude=./node.tar.xz",
    "--exclude=./*.codex-backup",
    "--exclude=./next-*.log",
    "--exclude=./backend-*.log",
    "--exclude=./*.log",
    "--exclude=./tsconfig.tsbuildinfo",
    "-C", $root.Path,
    "."
  )
  & tar.exe @tarArgs

  Move-Item -LiteralPath $tempPath -Destination $OutputPath -Force
  Get-Item -LiteralPath $OutputPath | Select-Object FullName, Length, LastWriteTime
} finally {
  Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
}
