# CLI での Cloudflare Pages デプロイガイド

このガイドでは、コマンドライン（CLI）のみでCloudflare Pagesプロジェクトを作成・デプロイする手順を説明します。

## 前提条件

- Cloudflareアカウント
- Wrangler CLIがインストールされていること
- GitHubリポジトリが作成済みであること

## 手順

### 1. Wrangler CLIのインストールとログイン

```bash
# Wrangler CLIをインストール（まだの場合）
npm install -g wrangler

# Cloudflareにログイン
wrangler login
```

### 2. D1データベースの作成

```bash
# D1データベースを作成
wrangler d1 create ai-pulse-db
```

出力例：
```
✅ Successfully created DB 'ai-pulse-db' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but backs up your data via snapshots to R2.

[[d1_databases]]
binding = "DB"
database_name = "ai-pulse-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

`database_id`を`wrangler.toml`に設定します。

### 3. マイグレーションの実行

```bash
# 本番環境にマイグレーションを適用
wrangler d1 migrations apply ai-pulse-db
```

### 4. Cloudflare Pagesプロジェクトの作成

```bash
# Pagesプロジェクトを作成
wrangler pages project create ai-pulse
```

### 5. GitHubリポジトリと連携

CLIから直接GitHub連携を設定する場合：

```bash
# GitHub OAuth認証（初回のみ）
# ブラウザが開いて認証を求められます
wrangler pages project create ai-pulse \
  --production-branch=main
```

または、ダッシュボードからGitHub連携を設定することもできます。

### 6. ビルドとデプロイ

```bash
# ビルド
npm run build:cf

# デプロイ
wrangler pages deploy .vercel/output/static --project-name=ai-pulse
```

または、`package.json`のスクリプトを使用：

```bash
npm run cf:deploy
```

### 7. 環境変数の設定（CLI）

```bash
# 環境変数を設定
wrangler pages secret put OPENAI_API_KEY --project-name=ai-pulse
wrangler pages secret put ANTHROPIC_API_KEY --project-name=ai-pulse
# ... 他の環境変数も同様に設定
```

### 8. D1データベースのバインディング設定

CLIからD1バインディングを設定するには、`wrangler.toml`に設定を追加します：

```toml
[[d1_databases]]
binding = "DB"
database_name = "ai-pulse-db"
database_id = "YOUR_DATABASE_ID"
```

その後、Cloudflare Pagesダッシュボードで：
1. プロジェクトの「Settings」→「Functions」に移動
2. 「D1 database bindings」セクションで、作成したD1データベースを選択
3. Binding name: `DB`

## 便利なCLIコマンド

### プロジェクト一覧の確認

```bash
wrangler pages project list
```

### デプロイ履歴の確認

```bash
wrangler pages deployment list --project-name=ai-pulse
```

### ローカル開発サーバーの起動

```bash
npm run dev:cf
```

または：

```bash
wrangler pages dev .vercel/output/static --project-name=ai-pulse
```

### 環境変数の一覧

```bash
wrangler pages secret list --project-name=ai-pulse
```

### 環境変数の削除

```bash
wrangler pages secret delete SECRET_NAME --project-name=ai-pulse
```

## 自動デプロイの設定

GitHubにプッシュするたびに自動デプロイするには：

1. Cloudflare Pagesダッシュボードでプロジェクトを開く
2. 「Settings」→「Builds & deployments」に移動
3. 「GitHub」を選択してリポジトリを連携
4. ビルド設定を入力：
   - Build command: `npm run build:cf`
   - Build output directory: `.vercel/output/static`

これで、`main`ブランチにプッシュするたびに自動的にデプロイされます。

## トラブルシューティング

### ログインに失敗する

```bash
# 再ログイン
wrangler logout
wrangler login
```

### プロジェクトが見つからない

```bash
# プロジェクト一覧を確認
wrangler pages project list

# 正しいプロジェクト名を確認
```

### デプロイが失敗する

```bash
# ビルドログを確認
wrangler pages deployment tail --project-name=ai-pulse
```

## 参考

- [Wrangler CLI ドキュメント](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Pages CLI ドキュメント](https://developers.cloudflare.com/pages/platform/build-configuration/)

