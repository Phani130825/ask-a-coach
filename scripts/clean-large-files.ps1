# PowerShell helper: untrack large files and remove from index
# Usage: run from repository root in PowerShell as Admin if needed

$sizeLimitMB = 5
Write-Host "Scanning for files larger than $sizeLimitMB MB..."
Get-ChildItem -Recurse -File | Where-Object { ($_.Length / 1MB) -ge $sizeLimitMB } | ForEach-Object {
    Write-Host "Untracking:" $_.FullName " (" [math]::Round($_.Length/1MB,2) "MB)"
    git rm --cached -q "$_"
}

Write-Host "Done. Commit the changes to remove these files from the index."
Write-Host "Example: git commit -m 'Remove large files from git index' && git push origin main"
