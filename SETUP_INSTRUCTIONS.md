# Cloudflare Pages セットアップ手順

## CLIで自動実行できること

以下のスクリプトを実行すると、CLIで実行可能な作業を自動化します：

```bash
./scripts/setup-cloudflare.sh
```

または、個別に実行：

```bash
# 1. D1データベースの作成
npm run cf:d1:create

# 2. マイグレーションの実行（wrangler.toml設定後）
npm run cf:migrate

# 3. Pagesプロジェクトの作成
npm run cf:project:create
```

## 手動で設定が必要な項目

### 1. wrangler.tomlのdatabase_id設定

D1データベース作成後、出力された`database_id`を`wrangler.toml`に設定してください：

```toml
[[d1_databases]]
binding = "DB"
database_name = "ai-pulse-db"
database_id = "YOUR_DATABASE_ID_HERE"  # ← ここに設定
migrations_dir = "./migrations"
```

### 2. GitHubリポジトリとの連携

Cloudflare Pagesダッシュボードで：

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)にログイン
2. 「Workers & Pages」→「Pages」を選択
3. 作成したプロジェクト `ai-pulse` を選択
4. 「Settings」→「Builds & deployments」に移動
5. 「Connect to Git」をクリック
6. GitHubを選択して認証
7. リポジトリ `ai-pulse-cloudflare` を選択
8. ビルド設定を入力：
   - **Build command**: `npm run build:cf`
   - **Build output directory**: `.vercel/output/static`
   - **Framework preset**: `Next.js`
   - **Root directory**: `/`

### 3. D1データベースのバインディング設定

Cloudflare Pagesダッシュボードで：

1. プロジェクト `ai-pulse` を選択
2. 「Settings」→「Functions」に移動
3. 「D1 database bindings」セクションで「Add binding」をクリック
4. 以下を設定：
   - **Variable name**: `DB`（wrangler.tomlの`binding`と一致）
   - **D1 database**: `ai-pulse-db`を選択
5. 「Save」をクリック

### 4. 環境変数の設定

Cloudflare Pagesダッシュボードで：

1. プロジェクト `ai-pulse` を選択
2. 「Settings」→「Environment variables」に移動
3. 以下の環境変数を追加：

#### 本番環境（Production）

```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GEMINI_API_KEY=your_gemini_api_key
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
GOOGLE_CUSTOM_SEARCH_KEY=your_google_custom_search_key
GOOGLE_CSE_ID=your_google_cse_id
GOOGLE_ANALYTICS_PROPERTY_ID=your_ga_property_id
GOOGLE_ANALYTICS_CREDENTIALS=your_ga_credentials_json
GOOGLE_SEARCH_CONSOLE_SITE_URL=your_site_url
GOOGLE_SEARCH_CONSOLE_CREDENTIALS=your_search_console_credentials_json
```

#### プレビュー環境（Preview）

必要に応じて、プレビュー環境にも同じ環境変数を設定してください。

**注意**: 
- `GOOGLE_ANALYTICS_CREDENTIALS`と`GOOGLE_SEARCH_CONSOLE_CREDENTIALS`はJSON文字列です
- 機密情報は「Encrypt」にチェックを入れてください

### 5. 初回デプロイ

GitHubにプッシュすると自動的にデプロイされます：

```bash
git add .
git commit -m "Setup Cloudflare Pages"
git push cloudflare main
```

または、手動でデプロイ：

```bash
npm run build:cf
npm run cf:deploy
```

## 確認コマンド

セットアップ後、以下で確認できます：

```bash
# プロジェクト一覧
npm run cf:project:list

# デプロイ履歴
npm run cf:deployments:list

# D1データベース一覧
npm run cf:d1:list
```

## トラブルシューティング

### D1データベースに接続できない

- `wrangler.toml`の`database_id`が正しく設定されているか確認
- Cloudflare PagesダッシュボードでD1バインディングが設定されているか確認

### ビルドが失敗する

- 環境変数が正しく設定されているか確認
- ビルドログを確認（Cloudflare Pagesダッシュボード）

### 環境変数が取得できない

- Cloudflare Pagesダッシュボードで環境変数が設定されているか確認
- 本番環境とプレビュー環境で別々に設定が必要な場合がある

