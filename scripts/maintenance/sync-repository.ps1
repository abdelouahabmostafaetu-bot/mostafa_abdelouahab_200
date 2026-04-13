while ($true) {
    # Check if there are any changes
    $changes = git status --porcelain
    
    if ($changes) {
        Write-Host "Changes detected, syncing to GitHub..." -ForegroundColor Cyan
        git add .
        git commit -m "Auto-commit: Sync updates"
        git push
        Write-Host "Successfully pushed changes to GitHub at $(Get-Date)" -ForegroundColor Green
    }
    
    # Wait for 30 seconds before checking again
    Start-Sleep -Seconds 30
}
