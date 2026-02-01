<#
PowerShell helper to start Frontend with the correct env vars.
Usage: Open PowerShell in this folder and run: .\start-frontend.ps1
#>

$env:VITE_API_BASE_URL = $env:VITE_API_BASE_URL -or 'http://localhost:3001'
$env:VITE_PORT = $env:VITE_PORT -or '5173'

npm run dev
