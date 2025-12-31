#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "📦 Staging changes..."
git add .

echo "📝 Committing changes..."
git commit -m "Migrate to Cloudflare Pages + D1 + R2

- Remove old Supabase/SQLite files
- Add Cloudflare Pages + D1 configuration
- Update database client for D1 (async operations)
- Add migration files for D1
- Update documentation (AGENTS.md, README.md, .cursor/rules)
- Add deployment documentation" || echo "No changes to commit"

echo "🔗 Adding remote (if needed)..."
git remote add cloudflare https://github.com/room8inc/ai-pulse-cloudflare.git 2>/dev/null || git remote set-url cloudflare https://github.com/room8inc/ai-pulse-cloudflare.git 2>/dev/null || echo "Remote already configured"

echo "🚀 Pushing to GitHub..."
if git push -u cloudflare main 2>&1 | grep -q "secret"; then
    echo "⚠️  GitHub Push Protection detected secrets in history"
    echo "📝 Removing secrets from Git history..."
    git filter-branch --force --index-filter "git rm --cached --ignore-unmatch *-*.json" --prune-empty --tag-name-filter cat -- --all 2>&1 | tail -5
    echo "🔄 Force pushing (rewritten history)..."
    git push -u cloudflare main --force
else
    git push -u cloudflare main
fi

echo "✅ Done!"

