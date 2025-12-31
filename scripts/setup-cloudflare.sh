#!/bin/bash

# Cloudflare Pages + D1 セットアップスクリプト

set -e

echo "🚀 Cloudflare Pages + D1 セットアップを開始します..."

# 1. Wranglerのログイン確認
echo ""
echo "📋 1. Cloudflareへのログイン確認..."
if ! npx wrangler whoami > /dev/null 2>&1; then
    echo "⚠️  Cloudflareにログインしていません。ログインしてください。"
    echo "   実行: npm run cf:login"
    echo "   または: npx wrangler login"
    exit 1
fi
echo "✅ ログイン済み"

# 2. D1データベースの作成
echo ""
echo "📋 2. D1データベースを作成中..."
DB_OUTPUT=$(npx wrangler d1 create ai-pulse-db 2>&1)
echo "$DB_OUTPUT"

# database_idを抽出
DATABASE_ID=$(echo "$DB_OUTPUT" | grep -oP 'database_id = "\K[^"]+' || echo "")

if [ -z "$DATABASE_ID" ]; then
    echo "⚠️  database_idの抽出に失敗しました。手動でwrangler.tomlに設定してください。"
else
    echo ""
    echo "✅ D1データベースが作成されました"
    echo "   database_id: $DATABASE_ID"
    echo ""
    echo "📝 wrangler.tomlにdatabase_idを設定してください:"
    echo "   database_id = \"$DATABASE_ID\""
fi

# 3. マイグレーションの実行（database_idが設定されている場合）
echo ""
echo "📋 3. マイグレーションを実行中..."
if npx wrangler d1 migrations apply ai-pulse-db 2>&1; then
    echo "✅ マイグレーションが完了しました"
else
    echo "⚠️  マイグレーションに失敗しました。wrangler.tomlのdatabase_idを確認してください。"
fi

# 4. Pagesプロジェクトの作成
echo ""
echo "📋 4. Cloudflare Pagesプロジェクトを作成中..."
if npx wrangler pages project create ai-pulse 2>&1; then
    echo "✅ Pagesプロジェクトが作成されました"
else
    echo "⚠️  プロジェクトの作成に失敗しました（既に存在する可能性があります）"
fi

# 5. プロジェクト一覧の確認
echo ""
echo "📋 5. プロジェクト一覧を確認中..."
npx wrangler pages project list

echo ""
echo "✨ セットアップが完了しました！"
echo ""
echo "📝 次のステップ:"
echo "   1. wrangler.tomlにdatabase_idを設定（まだの場合）"
echo "   2. GitHubリポジトリをCloudflare Pagesに連携"
echo "   3. 環境変数をCloudflare Pagesダッシュボードで設定"
echo "   4. D1バインディングをCloudflare Pagesダッシュボードで設定"

