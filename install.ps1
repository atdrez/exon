# SPDX-License-Identifier: MIT

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required. Install it from https://nodejs.org"
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is required. Install it from https://nodejs.org"
    exit 1
}

$RuntimeDir = Join-Path $PSScriptRoot "runtimes\typescript"
Push-Location $RuntimeDir

try {
    Write-Host "Building TypeScript runtime..."
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "Installing Exon..."
    npm install -g .

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Done. Run: exon <file.exon>"
    } else {
        Write-Host ""
        $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
        if (-not $isAdmin) {
            Write-Error "Permission denied. Re-run PowerShell as Administrator and try again."
        }
        exit 1
    }
} finally {
    Pop-Location
}
