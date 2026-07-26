# SPDX-License-Identifier: MIT

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is required. Install it from https://nodejs.org"
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is required. Install it from https://nodejs.org"
    exit 1
}

function Install-Global {
    param(
        [string]$Dir,
        [string]$Name
    )

    Push-Location $Dir

    try {
        Write-Host "Building $Name..."
        npm install
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

        npm run build
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

        Write-Host "Installing $Name..."
        npm install -g .

        if ($LASTEXITCODE -ne 0) {
            $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
            if (-not $isAdmin) {
                Write-Error "Permission denied. Re-run PowerShell as Administrator and try again."
            }
            exit 1
        }
    } finally {
        Pop-Location
    }
}

$RuntimeDir = Join-Path $PSScriptRoot "runtimes\typescript"
$PackageManagerDir = Join-Path $PSScriptRoot "tools\package-manager"

Install-Global -Dir $RuntimeDir -Name "exon"
Install-Global -Dir $PackageManagerDir -Name "expm"

Write-Host ""
Write-Host "Done. Run: exon <file.exon>"
Write-Host "           expm install"
