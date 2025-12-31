# Cloudflare Pages + GitHub デプロイガイド

このガイドでは、GitHubリポジトリからCloudflare Pagesに自動デプロイする手順を説明します。

## 前提条件

- GitHubアカウント
- Cloudflareアカウント
- ローカルにGitリポジトリがセットアップされていること

## 手順

### 1. GitHubリポジトリの準備

#### 既存のリポジトリを使用する場合

既存のリポジトリがある場合は、そのまま使用できます。

```bash
# 現在のリモートを確認
git remote -v

# 既存のリモートがある場合は、そのまま使用
# 新しいリモートを追加する場合
git remote add origin https://github.com/YOUR_USERNAME/ai-pulse.git
```

#### 新しいリポジトリを作成する場合

1. GitHubで新しいリポジトリを作成
   - リポジトリ名: `ai-pulse`
   - 公開/非公開: お好みで
   - README、.gitignore、ライセンスは追加しない（既にローカルにあるため）

2. ローカルリポジトリをGitHubにプッシュ

```bash
# 変更をステージング
git add .

# コミット
git commit -m "Migrate to Cloudflare Pages + D1 + R2"

# リモートを追加（まだ追加していない場合）
git remote add origin https://github.com/YOUR_USERNAME/ai-pulse.git

# メインブランチをプッシュ
git push -u origin main
```

### 2. Cloudflare Pagesプロジェクトの作成

#### 方法1: CLIで作成（推奨）

```bash
# Cloudflareにログイン（まだの場合）
wrangler login

# Pagesプロジェクトを作成
wrangler pages project create ai-pulse

# GitHubリポジトリと連携（対話形式）
wrangler pages project create ai-pulse --compatibility-date=2024-01-01
```

または、GitHubリポジトリを直接指定：

```bash
# GitHubリポジトリと連携してプロジェクトを作成
wrangler pages project create ai-pulse \
  --production-branch=main \
  --compatibility-date=2024-01-01
```

**注意**: CLIでGitHub連携を設定するには、事前にGitHub OAuth認証が必要な場合があります。その場合は、ダッシュボードから連携する方が簡単です。

#### 方法2: ダッシュボードから作成

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)にログイン
2. 左サイドバーから「Workers & Pages」を選択
3. 「Create application」→「Pages」→「Connect to Git」をクリック
4. GitHubを選択して認証
5. リポジトリ `ai-pulse-cloudflare` を選択
6. プロジェクト名を設定（例: `ai-pulse`）

### 3. ビルド設定

Cloudflare Pagesのビルド設定で以下を設定：

- **Framework preset**: `Next.js`
- **Build command**: `npm run build:cf`
- **Build output directory**: `.vercel/output/static`
- **Root directory**: `/`（プロジェクトルート）

### 4. 環境変数の設定

Cloudflare Pagesダッシュボードで環境変数を設定：

1. プロジェクトの「Settings」→「Environment variables」に移動
2. 以下の環境変数を追加：

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

**注意**: 本番環境とプレビュー環境で別々に設定できます。

### 5. D1データベースの設定

#### D1データベースの作成

```bash
# ローカルでD1データベースを作成
wrangler d1 create ai-pulse-db
```

作成後、`database_id`が表示されます。`wrangler.toml`に設定：

```toml
[[d1_databases]]
binding = "DB"
database_name = "ai-pulse-db"
database_id = "YOUR_DATABASE_ID_HERE"
migrations_dir = "./migrations"
```

#### マイグレーションの実行

```bash
# 本番環境にマイグレーションを適用
wrangler d1 migrations apply ai-pulse-db
```

#### Cloudflare PagesとD1の連携

1. Cloudflareダッシュボードでプロジェクトを開く
2. 「Settings」→「Functions」に移動
3. 「D1 database bindings」セクションで、作成したD1データベースを選択
4. Binding name: `DB`（`wrangler.toml`の`binding`と一致させる）

### 6. ビルド設定の詳細

Cloudflare Pagesのビルド設定画面で以下を設定：

#### 基本設定
- **Framework preset**: `Next.js`（自動検出される場合もあります）
- **Build command**: `npm run build:cf`
- **Build output directory**: `.vercel/output/static`
- **Root directory**: `/`（プロジェクトルート）

#### 環境変数
ビルド時に必要な環境変数があれば、ここでも設定できます（ただし、実行時の環境変数は「Environment variables」で設定）。

#### Node.js バージョン
- **Node version**: `18` または `20`（推奨）

### 7. 初回デプロイ

GitHubにプッシュすると、自動的にビルドとデプロイが開始されます：

```bash
# 変更をコミット
git add .
git commit -m "Setup Cloudflare Pages deployment"

# GitHubにプッシュ
git push origin main
```

Cloudflare Pagesダッシュボードでビルドの進行状況を確認できます。

**注意**: 初回ビルドには数分かかる場合があります。

### 8. カスタムドメインの設定（オプション）

1. Cloudflare Pagesプロジェクトの「Custom domains」に移動
2. 「Set up a custom domain」をクリック
3. ドメイン名を入力して設定

## 自動デプロイの仕組み

- **mainブランチへのプッシュ**: 本番環境に自動デプロイ
- **プルリクエスト**: プレビュー環境が自動的に作成される
- **ビルド失敗時**: メール通知が送信される（設定により）

## トラブルシューティング

### ビルドが失敗する

1. ビルドログを確認
2. 環境変数が正しく設定されているか確認
3. `package.json`の依存関係が正しいか確認

### D1データベースに接続できない

1. D1データベースのbindingが正しく設定されているか確認
2. `wrangler.toml`の`database_id`が正しいか確認
3. マイグレーションが実行されているか確認

### 環境変数が取得できない

1. Cloudflare Pagesダッシュボードで環境変数が設定されているか確認
2. 本番環境とプレビュー環境で別々に設定が必要な場合がある

## 参考リンク

- [Cloudflare Pages ドキュメント](https://developers.cloudflare.com/pages/)
- [D1 ドキュメント](https://developers.cloudflare.com/d1/)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)

