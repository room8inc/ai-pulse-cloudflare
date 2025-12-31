# クイックスタートガイド

GitHubからCloudflare Pagesにデプロイする最短手順です。

## 1. ローカルで変更をコミット

```bash
# 変更をステージング
git add .

# コミット
git commit -m "Migrate to Cloudflare Pages + D1 + R2"
```

## 2. GitHubにプッシュ

```bash
# 既存のリモートがある場合
git push origin main

# 新しいリモートを追加する場合
git remote add origin https://github.com/YOUR_USERNAME/ai-pulse.git
git push -u origin main
```

## 3. Cloudflare Pagesでプロジェクトを作成

### CLIで作成（推奨）

```bash
# Cloudflareにログイン
wrangler login

# Pagesプロジェクトを作成
wrangler pages project create ai-pulse
```

### ダッシュボードから作成

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)にログイン
2. 「Workers & Pages」→「Create application」→「Pages」→「Connect to Git」
3. GitHubを選択して認証
4. リポジトリ `ai-pulse-cloudflare` を選択
5. プロジェクト名を設定

## 4. ビルド設定

- **Build command**: `npm run build:cf`
- **Build output directory**: `.vercel/output/static`
- **Framework preset**: `Next.js`

## 5. D1データベースの作成と設定

```bash
# D1データベースを作成
wrangler d1 create ai-pulse-db

# database_idを取得したら、wrangler.tomlに設定
# その後、マイグレーションを実行
wrangler d1 migrations apply ai-pulse-db
```

Cloudflare Pagesダッシュボードで：
1. 「Settings」→「Functions」→「D1 database bindings」
2. 作成したD1データベースを選択
3. Binding name: `DB`

## 6. 環境変数の設定

Cloudflare Pagesダッシュボードで：
1. 「Settings」→「Environment variables」
2. 必要な環境変数を追加

## 7. デプロイ完了

GitHubにプッシュすると自動的にデプロイされます。デプロイが完了すると、URLが表示されます。

詳細は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

