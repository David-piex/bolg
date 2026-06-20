param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Read-DotEnv($Path) {
  $values = [ordered]@{}
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
    if ($name) {
      $values[$name] = $value.Trim()
    }
  }

  return $values
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$examplePath = Join-Path $root ".env.example"
$localPath = Join-Path $root ".env.local"

if (-not (Test-Path $examplePath)) {
  throw "Missing .env.example at $examplePath"
}

$exampleValues = Read-DotEnv $examplePath
$existingValues = Read-DotEnv $localPath

if ((Test-Path $localPath) -and -not $Force) {
  Write-Host ".env.local already exists. Missing keys will be appended; existing values will be kept."
}

$lines = @(
  "# Local frontend configuration.",
  "# Backend production secrets live in deploy/env/*.example copies.",
  "# Do not commit this file.",
  ""
)

foreach ($entry in $exampleValues.GetEnumerator()) {
  $name = $entry.Key
  $value = $entry.Value
  if ($existingValues.Contains($name) -and -not [string]::IsNullOrWhiteSpace($existingValues[$name])) {
    $value = $existingValues[$name]
  }

  $lines += "$name=$value"
}

Set-Content -LiteralPath $localPath -Value $lines -Encoding UTF8

[pscustomobject]@{
  Path = $localPath
  Keys = $exampleValues.Keys -join ","
  ExistingValuesKept = ($existingValues.Keys | Where-Object { -not [string]::IsNullOrWhiteSpace($existingValues[$_]) }) -join ","
}
