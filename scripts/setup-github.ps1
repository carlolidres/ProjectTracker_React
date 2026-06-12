# Configures GitHub remote, repository secrets, and GitHub Pages (Actions source).
# Run from project root: .\scripts\setup-github.ps1
# Requires: gh CLI authenticated as repo owner.

$ErrorActionPreference = "Stop"
$Repo = "carlolidres/ProjectTracker_React"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "==> Checking gh auth..."
gh auth status

Write-Host "==> Ensuring git remote origin..."
$remote = git remote get-url origin 2>$null
if (-not $remote) {
  git remote add origin "https://github.com/$Repo.git"
} else {
  Write-Host "Remote already set: $remote"
}

Write-Host "==> Reading Supabase env from .env.local..."
$envFile = Join-Path $Root ".env.local"
if (-not (Test-Path $envFile)) {
  throw ".env.local not found. Copy .env.example and fill in Supabase values."
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $vars[$Matches[1].Trim()] = $Matches[2].Trim()
  }
}

$url = $vars["VITE_SUPABASE_URL"]
$key = $vars["VITE_SUPABASE_ANON_KEY"]
if (-not $url -or -not $key) {
  throw "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local"
}

Write-Host "==> Setting GitHub repository secrets..."
gh secret set VITE_SUPABASE_URL --body $url -R $Repo
gh secret set VITE_SUPABASE_ANON_KEY --body $key -R $Repo

Write-Host "==> Enabling GitHub Pages (GitHub Actions source)..."
gh api "repos/$Repo/pages" -X PUT -f build_type=workflow 2>$null
if ($LASTEXITCODE -ne 0) {
  gh api "repos/$Repo/pages" -X POST -f build_type=workflow
}

Write-Host ""
Write-Host "Done. Next:"
Write-Host "  1. Push to main: git push -u origin main"
Write-Host "  2. In Supabase Auth > URL Configuration, add redirect:"
Write-Host "     https://carlolidres.github.io/ProjectTracker_React/"
Write-Host "  3. Run migrations in Supabase SQL editor if not applied yet"
Write-Host "  4. Verify: npx tsx scripts/verify-supabase.ts"
