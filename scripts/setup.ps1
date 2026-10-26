$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$versionParts = (node --version).TrimStart('v').Split('.')
if ([int]$versionParts[0] -lt 22 -or ([int]$versionParts[0] -eq 22 -and [int]$versionParts[1] -lt 12)) { throw 'Install Node.js 22.12 or newer.' }
if (Test-Path -LiteralPath package-lock.json) { npm ci } else { npm install }
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
if (!(Test-Path -LiteralPath backend/.env)) { Copy-Item -LiteralPath backend/.env.example -Destination backend/.env }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
Write-Output 'Built successfully. Start local MongoDB and Ollama, install llama3.2:1b, then run npm start.'
