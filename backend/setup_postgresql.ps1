# PostgreSQL Setup Script for EduCompose
# This script helps you configure PostgreSQL for login authentication

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EduCompose PostgreSQL Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item env.example .env
}

# Get PostgreSQL password
Write-Host "Enter your PostgreSQL password (for user 'postgres'):" -ForegroundColor Yellow
Write-Host "(This is the password you set during PostgreSQL installation)" -ForegroundColor Gray
$postgresPassword = Read-Host -AsSecureString
$postgresPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($postgresPassword))

# Read current .env
$envContent = Get-Content .env -Raw

# Update DATABASE_URL
$newDatabaseUrl = "DATABASE_URL=postgresql://postgres:$postgresPasswordPlain@localhost:5432/educompose_db"
$envContent = $envContent -replace "DATABASE_URL=.*", $newDatabaseUrl
$envContent = $envContent -replace "# DATABASE_URL=postgresql://.*", ""

# Generate a secure SECRET_KEY if it's still the default
if ($envContent -match "SECRET_KEY=your-secret-key-here") {
    Write-Host ""
    Write-Host "Generating a secure SECRET_KEY..." -ForegroundColor Yellow
    $secretKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    $envContent = $envContent -replace "SECRET_KEY=your-secret-key-here", "SECRET_KEY=$secretKey"
}

# Write updated .env
$envContent | Set-Content .env -NoNewline

Write-Host ""
Write-Host "✅ .env file updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Initialize the database: python database/init_database.py" -ForegroundColor White
Write-Host "2. Test connection: python -c `"from app.database import engine; engine.connect(); print('✅ Connected!')`"" -ForegroundColor White
Write-Host "3. Start server: python start.py" -ForegroundColor White
Write-Host ""

