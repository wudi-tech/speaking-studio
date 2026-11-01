$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskUrl = 'http://localhost:8765'
try {
    $taskStatus = Invoke-RestMethod -Uri "$taskUrl/api/status" -TimeoutSec 2
    if ($taskStatus.app -eq 'speaking-studio') {
        Start-Process $taskUrl
        exit 0
    }
} catch {}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js 22 or newer is required. Install Node.js LTS, then reopen this launcher.'
    Read-Host 'Press Enter to close'
    exit 1
}
Write-Host "Speaking Studio: $taskUrl"
Write-Host 'Keep this window open. Press Ctrl+C to stop.'
$env:OPEN_BROWSER = '1'
& node (Join-Path $PSScriptRoot 'server.mjs')
if ($LASTEXITCODE -ne 0) { Read-Host 'Press Enter to close' }
