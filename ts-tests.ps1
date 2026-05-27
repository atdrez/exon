# SPDX-License-Identifier: MIT

$Main     = Join-Path $PSScriptRoot "runtimes\typescript\bin\main.js"
$Examples = Join-Path $PSScriptRoot "examples"
$Fixtures = Join-Path $PSScriptRoot "tests\fixtures"

$ok   = 0
$fail = 0

if ($args[0] -eq "-r") {
    # Run all example .exon files and report pass/fail per file
    Get-ChildItem -Path $Examples -Filter "*.exon" -Recurse | Sort-Object FullName | ForEach-Object {
        $f = $_.FullName
        if ($f -like "*.run.exon") {
            node $Main -r $f -p $Examples 2>&1 | Out-Null
        } else {
            node $Main -t -p $Examples $f 2>&1 | Out-Null
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK]   " -ForegroundColor Green -NoNewline
            Write-Host $f
            $ok++
        } else {
            Write-Host "[ERROR]" -ForegroundColor Red -NoNewline
            Write-Host " $f"
            $fail++
        }
    }
} else {
    # Run fixture tests and colorize [OK] / [FAIL] lines
    Get-ChildItem -Path $Fixtures -Filter "*.exon" | Sort-Object Name | ForEach-Object {
        $output = node $Main -t -p $Examples $_.FullName 2>&1
        foreach ($line in $output) {
            $str = "$line"
            if ($str -match '\[OK\]') {
                $ok++
                Write-Host $str -ForegroundColor Green
            } elseif ($str -match '\[FAIL\]') {
                $fail++
                Write-Host $str -ForegroundColor Red
            } else {
                Write-Host $str
            }
        }
    }
}

Write-Host ""
$color = if ($fail -gt 0) { "Red" } else { "Green" }

if ($args[0] -eq "-r") {
    Write-Host "Results: $ok ok, $fail errors" -ForegroundColor $color
} else {
    Write-Host "Results: $ok passed, $fail failed" -ForegroundColor $color
}

exit ($fail -gt 0)
