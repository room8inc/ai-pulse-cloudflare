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
git push -u cloudflare main

echo "✅ Done!"

