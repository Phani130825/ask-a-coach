# Helper to remove sensitive files from git history or index
# WARNING: Rewriting history is destructive for shared repos. Coordinate with collaborators.

param(
  [string]$FileToRemove = "backend/.env"
)

Write-Host "Step 1: Ensure you have a backup or are OK rewriting history."
Write-Host "Step 2: Remove the file from current index (keeps file on disk):"

# remove from index (safe)
git rm --cached -q $FileToRemove 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "File not tracked or git not initialized"
} else {
  Write-Host "Removed $FileToRemove from index. Commit the change and push."
  Write-Host "git commit -m 'chore: remove sensitive files from index' && git push origin main"
}

Write-Host "
If the file exists in previous commits and you want to purge it from history,
use one of the following approaches (careful - these rewrite history):

1) Using BFG Repo-Cleaner (recommended):
   - Install BFG (https://rtyley.github.io/bfg-repo-cleaner/)
   - Run:
       bfg --delete-files $FileToRemove
       git reflog expire --expire=now --all && git gc --prune=now --aggressive
       git push --force

2) Using git-filter-repo (powerful & fast):
   - Install git-filter-repo
   - Run:
       git filter-repo --invert-paths --path $FileToRemove
       git push --force

Note: After rewriting history, other collaborators must re-clone or reset.
