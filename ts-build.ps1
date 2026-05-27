# SPDX-License-Identifier: MIT

$RuntimeDir = Join-Path $PSScriptRoot "runtimes\typescript"

Write-Host "Building TypeScript runtime..."
Push-Location $RuntimeDir

try {
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    npm run build
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
