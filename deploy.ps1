# ============================================================
# SAMS — Script Deploy ke Vercel + Neon
# Jalankan script ini setelah mendapatkan Connection String Neon
# ============================================================

param(
    [string]$DatabaseUrl = "",
    [string]$DirectUrl = ""
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SAMS — Deploy ke Vercel + Neon" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $DatabaseUrl) {
    Write-Host "Masukkan Neon Connection String (Pooled):" -ForegroundColor Yellow
    Write-Host "(Dari Neon dashboard > Connection Details > Pooled connection)" -ForegroundColor Gray
    $DatabaseUrl = Read-Host "DATABASE_URL"
}

if (-not $DirectUrl) {
    Write-Host ""
    Write-Host "Masukkan Neon Direct Connection String:" -ForegroundColor Yellow
    Write-Host "(Dari Neon dashboard > Connection Details > Direct connection)" -ForegroundColor Gray
    $DirectUrl = Read-Host "DIRECT_URL"
}

# Generate NEXTAUTH_SECRET
Write-Host ""
Write-Host "Generating NEXTAUTH_SECRET..." -ForegroundColor Green
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
Write-Host "NEXTAUTH_SECRET = $secret" -ForegroundColor Gray

# Simpan ke .env.local untuk keperluan prisma db push lokal
$envContent = "DATABASE_URL=`"$DatabaseUrl`"`nDIRECT_URL=`"$DirectUrl`"`nNEXTAUTH_SECRET=`"$secret`""
$envContent | Set-Content -Path ".env.local.neon" -Encoding UTF8
Write-Host "File .env.local.neon disimpan (jangan di-commit!)" -ForegroundColor Yellow

Write-Host ""
Write-Host "Step 1: Menjalankan prisma db push ke Neon..." -ForegroundColor Cyan
$env:DATABASE_URL = $DatabaseUrl
$env:DIRECT_URL = $DirectUrl
npx prisma db push --skip-generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: prisma db push gagal!" -ForegroundColor Red
    exit 1
}
Write-Host "OK - Schema berhasil di-push ke Neon!" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Menjalankan seed untuk buat akun admin..." -ForegroundColor Cyan
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: seed gagal. Bisa dijalankan manual nanti." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Login ke Vercel..." -ForegroundColor Cyan
vercel login

Write-Host ""
Write-Host "Step 4: Set environment variables di Vercel..." -ForegroundColor Cyan
Write-Host "DATABASE_URL..." -ForegroundColor Gray
echo $DatabaseUrl | vercel env add DATABASE_URL production
Write-Host "DIRECT_URL..." -ForegroundColor Gray
echo $DirectUrl | vercel env add DIRECT_URL production
Write-Host "NEXTAUTH_SECRET..." -ForegroundColor Gray
echo $secret | vercel env add NEXTAUTH_SECRET production

Write-Host ""
Write-Host "Step 5: Deploy ke Vercel production..." -ForegroundColor Cyan
vercel --prod

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOY SELESAI!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Langkah terakhir:" -ForegroundColor Yellow
Write-Host "1. Salin URL Vercel dari output di atas"
Write-Host "2. Set NEXTAUTH_URL di Vercel dashboard:"
Write-Host "   vercel env add NEXTAUTH_URL production"
Write-Host "3. Redeploy: vercel --prod"
Write-Host ""
