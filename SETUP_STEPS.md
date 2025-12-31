# Cloudflare Pages セットアップ手順（グローバルインストール版）

wranglerをグローバルにインストールした後の手順です。

## ステップ1: Cloudflareにログイン

```bash
wrangler login
```

ブラウザが開いてCloudflareアカウントでログインします。

## ステップ2: D1データベースの作成または確認

### 既存のデータベースがない場合

```bash
wrangler d1 create ai-pulse-db
```

**重要**: 出力された`database_id`をコピーしてください。次のステップで使用します。

出力例：
```
✅ Successfully created DB 'ai-pulse-db' in region APAC

[[d1_databases]]
binding = "DB"
database_name = "ai-pulse-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 既存のデータベースがある場合（エラー: "A database with that name already exists"）

既存のデータベースの情報を取得：

```bash
# データベース一覧を確認
wrangler d1 list

# または、詳細情報を取得
wrangler d1 info ai-pulse-db
```

出力から`database_id`をコピーして、次のステップで`wrangler.toml`に設定してください。

## ステップ3: wrangler.tomlにdatabase_idを設定

`wrangler.toml`ファイルを開いて、`database_id`を設定してください：

```toml
[[d1_databases]]
binding = "DB"
database_name = "ai-pulse-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← ここに貼り付け
migrations_dir = "./migrations"
```

## ステップ4: マイグレーションの実行

```bash
wrangler d1 migrations apply ai-pulse-db
```

データベーススキーマが作成されます。

## ステップ5: Cloudflare Pagesプロジェクトの作成

```bash
wrangler pages project create ai-pulse
```

## ステップ6: プロジェクトの確認

```bash
wrangler pages project list
```

作成されたプロジェクトが表示されます。

## ステップ7: GitHubリポジトリとの連携（手動設定）

Cloudflare Pagesダッシュボードで以下を設定：

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)にログイン
2. 「Workers & Pages」→「Pages」を選択
3. プロジェクト `ai-pulse` を選択
4. 「Settings」→「Builds & deployments」に移動
5. 「Connect to Git」をクリック
6. GitHubを選択して認証
7. リポジトリ `ai-pulse-cloudflare` を選択
8. ビルド設定を入力：
   - **Build command**: `npm run build:cf`
   - **Build output directory**: `.vercel/output/static`
   - **Framework preset**: `Next.js`
   - **Root directory**: `/`

## ステップ8: D1バインディングの設定（手動設定）

Cloudflare Pagesダッシュボードで：

1. プロジェクト `ai-pulse` を選択
2. 「Settings」→「Functions」に移動
3. 「D1 database bindings」セクションで「Add binding」をクリック
4. 以下を設定：
   - **Variable name**: `DB`
   - **D1 database**: `ai-pulse-db`を選択
5. 「Save」をクリック

## ステップ9: 環境変数の設定（手動設定）

Cloudflare Pagesダッシュボードで：

1. プロジェクト `ai-pulse` を選択
2. 「Settings」→「Environment variables」に移動
3. 以下の環境変数を追加（本番環境）：

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

**注意**: 
- 機密情報は「Encrypt」にチェックを入れてください
- プレビュー環境にも必要に応じて設定してください

## ステップ10: 初回デプロイ

### 方法1: GitHubにプッシュ（自動デプロイ）

```bash
git add .
git commit -m "Setup Cloudflare Pages"
git push cloudflare main
```

GitHubにプッシュすると、自動的にビルドとデプロイが開始されます。

### 方法2: 手動デプロイ

```bash
npm run build:cf
wrangler pages deploy .vercel/output/static --project-name=ai-pulse
```

## 確認コマンド

セットアップ後、以下で確認できます：

```bash
# プロジェクト一覧
wrangler pages project list

# デプロイ履歴
wrangler pages deployment list --project-name=ai-pulse

# D1データベース一覧
wrangler d1 list
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

