# Cloudflare Pages + D1 + R2 セットアップガイド

このプロジェクトをCloudflare Pages + D1 + R2で動作させるためのセットアップ手順です。

## 前提条件

- Cloudflareアカウント（無料プランでOK）
- Node.js 18以上
- Wrangler CLI（Cloudflare CLI）

## セットアップ手順

### 1. Wrangler CLIのインストール

```bash
npm install -g wrangler
```

### 2. Cloudflareにログイン

```bash
wrangler login
```

### 3. D1データベースの作成

```bash
wrangler d1 create ai-pulse-db
```

このコマンドを実行すると、`database_id`が表示されます。`wrangler.toml`の`database_id`に設定してください。

### 4. wrangler.tomlの設定

`wrangler.toml`を開き、`database_id`を設定します：

```toml
[[d1_databases]]
binding = "DB"
database_name = "ai-pulse-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ここに上記で取得したIDを設定
```

### 5. データベースマイグレーションの実行

```bash
# ローカル環境でマイグレーションをテスト
npm run cf:migrate:local

# 本番環境にマイグレーションを適用
npm run cf:migrate
```

### 6. 環境変数の設定

Cloudflare Pagesダッシュボードで環境変数を設定します：

1. Cloudflareダッシュボードにログイン
2. Pagesプロジェクトを選択
3. Settings > Environment variables に移動
4. 以下の環境変数を設定：

```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_ANALYTICS_PROPERTY_ID=your_ga_property_id
GOOGLE_ANALYTICS_CREDENTIALS=your_ga_credentials_json
```

### 7. ビルドとデプロイ

```bash
# ビルド
npm run build:cf

# デプロイ
npm run cf:deploy
```

または、GitHubと連携して自動デプロイを設定することもできます。

## ローカル開発

### ローカルでD1データベースを使用する場合

```bash
# ローカル開発サーバーを起動
npm run dev:cf
```

### ローカルでマイグレーションを実行

```bash
npm run cf:migrate:local
```

## R2ストレージの設定（オプション）

R2ストレージを使用する場合：

### 1. R2バケットの作成

```bash
wrangler r2 bucket create ai-pulse-storage
```

### 2. wrangler.tomlの更新

```toml
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "ai-pulse-storage"
```

### 3. コードでの使用

```typescript
// APIルートで使用
export async function GET(request: NextRequest, { env }: { env: Env }) {
  const storage = env.STORAGE;
  // R2操作を実行
}
```

## トラブルシューティング

### D1データベースに接続できない

- `wrangler.toml`の`database_id`が正しく設定されているか確認
- `wrangler d1 list`でデータベースが存在するか確認

### マイグレーションが失敗する

- ローカルでテスト: `npm run cf:migrate:local`
- SQLファイルの構文エラーを確認
- D1は一部のSQL構文をサポートしていない場合がある

### 環境変数が取得できない

- Cloudflare Pagesダッシュボードで環境変数が設定されているか確認
- 本番環境とプレビュー環境で別々に設定が必要な場合がある

## 注意事項

- D1はSQLiteベースですが、一部のSQL構文がサポートされていない場合があります
- トリガーはサポートされていますが、制限がある場合があります
- ローカル開発時は、`wrangler pages dev`を使用する必要があります
- `@cloudflare/next-on-pages`を使用することで、Next.js App RouterがCloudflare Pagesで動作します

## 参考リンク

- [Cloudflare Pages ドキュメント](https://developers.cloudflare.com/pages/)
- [D1 ドキュメント](https://developers.cloudflare.com/d1/)
- [R2 ドキュメント](https://developers.cloudflare.com/r2/)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)

