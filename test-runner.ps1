#!/usr/bin/env pwsh

# Simple test runner script for local development
# This script starts the test server and runs Playwright tests

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting test server..." -ForegroundColor Green
$serverProcess = & npm.cmd run serve:test &

Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🧪 Running Playwright tests..." -ForegroundColor Blue
try {
    npm test
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All tests passed!" -ForegroundColor Green
        $exitCode = 0
    } else {
        Write-Host "❌ Some tests failed!" -ForegroundColor Red
        $exitCode = 1
    }
} catch {
    Write-Host "❌ Test execution failed: $_" -ForegroundColor Red
    $exitCode = 1
}


Write-Host "🛑 Stopping test server..." -ForegroundColor Yellow
# No need to stop process when using call operator

exit $exitCode