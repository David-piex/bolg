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
  $OutputPath = Join-Path $artifacts "rinana-vercel-source.tgz"
}

$tempPath = Join-Path $env:TEMP ("rinana-vercel-source-" + [guid]::NewGuid().ToString("N") + ".tgz")

try {
  tar.exe -czf $tempPath `
    --exclude="./node_modules" `
    --exclude="./.next" `
    --exclude="./artifacts" `
    --exclude="./.env.local" `
    --exclude="./*.codex-backup" `
    --exclude="./next-dev.out.log" `
    --exclude="./next-dev.err.log" `
    --exclude="./tsconfig.tsbuildinfo" `
    -C $root .

  Move-Item -LiteralPath $tempPath -Destination $OutputPath -Force
  Get-Item -LiteralPath $OutputPath | Select-Object FullName, Length, LastWriteTime
} finally {
  Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
}
