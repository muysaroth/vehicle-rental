# Set up (first run) and start the Vehicle Sales & Rental system.
#   .\start.ps1            set up if needed, build, serve on http://localhost:8090
#   .\start.ps1 -Reset     also wipe the database and reload the demo data
param([switch]$Reset)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

Push-Location "$root\backend"
try {
    if (-not (Test-Path vendor)) { composer install --no-interaction }
    if (-not (Test-Path .env)) {
        Copy-Item .env.example .env
        php artisan key:generate
    }
    if (-not (Test-Path database\database.sqlite)) {
        New-Item database\database.sqlite -ItemType File | Out-Null
        $Reset = $true
    }
    if ($Reset) { php artisan migrate:fresh --seed --force } else { php artisan migrate --force }
}
finally { Pop-Location }

Push-Location "$root\frontend"
try {
    if (-not (Test-Path node_modules)) { npm install }
    if (-not (Test-Path "$root\backend\public\build\index.html")) { npm run build }
}
finally { Pop-Location }

Write-Host ''
Write-Host 'Open http://localhost:8090  (admin@rental.test / admin123)' -ForegroundColor Green
Write-Host ''
Push-Location "$root\backend"
try { php artisan serve --port=8090 }
finally { Pop-Location }
