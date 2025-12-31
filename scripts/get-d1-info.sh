#!/bin/bash

# 既存のD1データベース情報を取得するスクリプト

echo "📋 既存のD1データベース一覧を取得中..."
echo ""

wrangler d1 list

echo ""
echo "📝 上記の一覧から 'ai-pulse-db' の database_id をコピーして、"
echo "   wrangler.toml の database_id に設定してください。"
echo ""
echo "   または、以下のコマンドで詳細情報を確認できます："
echo "   wrangler d1 info ai-pulse-db"

