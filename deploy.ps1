# Deploy to server
# Usage: .\deploy.ps1

Write-Host "📤 Deploying to server..." -ForegroundColor Cyan

# Stage all changes
git add -A
Write-Host "✓ Changes staged" -ForegroundColor Green

# Commit if there are changes
$status = git status --porcelain
if ($status) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git commit -m "Deploy: $timestamp"
    Write-Host "✓ Committed" -ForegroundColor Green
} else {
    Write-Host "⚠ No changes to commit" -ForegroundColor Yellow
}

# Push to server
Write-Host "📡 Pushing to server..." -ForegroundColor Cyan
git push server main
Write-Host "✓ Deployed!" -ForegroundColor Green
Write-Host ""
Write-Host "The server is now building and restarting the app..." -ForegroundColor Cyan
