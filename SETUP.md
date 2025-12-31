# セットアップガイド（Cloudflare Pages + D1版）

## 概要

このプロジェクトは**Cloudflare Pages + D1 + R2**で動作します。無料プランで利用可能です。

**注意**: このドキュメントは古いSQLite版のものです。Cloudflare Pages版のセットアップについては以下を参照してください：
- [SETUP_STEPS.md](./SETUP_STEPS.md) - グローバルインストール後の手順
- [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) - 自動化スクリプト付き手順
- [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) - 詳細なセットアップ手順
- [DEPLOYMENT.md](./DEPLOYMENT.md) - GitHub連携とデプロイ手順

## 1. 依存関係のインストール

```bash
npm install
```

## 2. データベースの初期化

### 2-1. データベースを初期化

開発サーバーを起動する前に、データベースを初期化します：

```bash
# 開発サーバーを起動
npm run dev

# 別のターミナルで、またはブラウザで以下にアクセス
curl http://localhost:3000/api/init-db
```

または、ブラウザで以下にアクセス：
```
http://localhost:3000/api/init-db
```

**成功時のレスポンス:**
```json
{
  "success": true,
  "message": "Database initialized successfully"
}
```

### 2-2. データベースファイルの確認

`data/ai-pulse.db` ファイルが作成されていることを確認してください。

## 3. 動作確認

### 3-1. 開発サーバーの起動

```bash
npm run dev
```

### 3-2. APIエンドポイントのテスト

ブラウザまたはcurlで以下にアクセス：

```bash
# ローカル環境
curl http://localhost:3000/api/fetch-official
```

または、ブラウザで以下にアクセス：
```
http://localhost:3000/api/fetch-official
```

### 3-3. 結果の確認

**成功時のレスポンス:**
```json
{
  "success": true,
  "message": "fetch-official completed",
  "data": {
    "total": 10,
    "success": 10,
    "failed": 0,
    "errors": []
  }
}
```

**データベースの確認:**
- `data/ai-pulse.db` ファイルが存在することを確認
- データベースビューア（DB Browser for SQLiteなど）で `raw_events` テーブルを確認

## 4. トラブルシューティング

### エラー: "Cannot find module 'better-sqlite3'"
```bash
npm install
```

### エラー: "no such table: raw_events"
データベースが初期化されていません。`/api/init-db` にアクセスして初期化してください。

### RSSフィードの取得エラー
- インターネット接続を確認
- RSSフィードのURLが正しいか確認（`lib/rss-feeds.ts`）
- タイムアウトエラーの場合は、ネットワーク環境を確認

## 5. データベースの場所

- **データベースファイル**: `data/ai-pulse.db`
- **バックアップ**: `data/` ディレクトリごとコピーするだけでOK
- **リセット**: `data/ai-pulse.db` を削除して `/api/init-db` に再度アクセス

## 6. 次のステップ

動作確認が完了したら：
1. `/api/fetch-community` の実装に進む
2. ダッシュボードの基本表示を実装

## メリット

✅ **完全無料** - 外部サービス不要  
✅ **ローカル完結** - インターネット接続不要（データベース操作時）  
✅ **高速** - ローカルファイルなので非常に高速  
✅ **シンプル** - セットアップが簡単  
✅ **バックアップ容易** - ファイルをコピーするだけ
