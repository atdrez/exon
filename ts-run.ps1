# SPDX-License-Identifier: MIT

if ($args.Count -eq 0) {
    Write-Error "Usage: ts-run.ps1 <file.exon> [-e] [-p <path>]"
    exit 1
}

$Main = Join-Path $PSScriptRoot "runtimes\typescript\bin\main.js"
node $Main @args
exit $LASTEXITCODE
