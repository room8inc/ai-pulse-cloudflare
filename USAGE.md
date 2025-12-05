# AI Pulse - 使い方ガイド

## システムの使い方

このシステムは、**毎日ブログネタを自動生成して、ダッシュボードで確認・選択する**ためのツールです。

## 基本的な使い方

### 1. システムを起動する

```bash
npm run dev
```

ブラウザで `http://localhost:3000/dashboard` にアクセスすると、ダッシュボードが表示されます。

### 2. データを取得する（自動実行）

以下のAPIを実行すると、データが取得されます：

#### 公式情報を取得
```bash
curl http://localhost:3000/api/fetch-official
```

#### コミュニティの声を取得
```bash
curl http://localhost:3000/api/fetch-community
```

#### トレンド分析を実行
```bash
curl http://localhost:3000/api/analyze-trends
```

#### ブログ候補を生成
```bash
curl http://localhost:3000/api/summarize-today
```

### 3. ダッシュボードで確認・選択

1. `http://localhost:3000/dashboard` にアクセス
2. 「ブログ候補」セクションで生成された候補を確認
3. 「採用」ボタンで記事にする候補を選択
4. 「ボツ」ボタンで不要な候補を除外

## 自動実行の設定（Vercel Cron）

本番環境では、以下のスケジュールで自動実行されます：

- `/api/fetch-official` → 毎時
- `/api/fetch-community` → 3時間ごと
- `/api/fetch-arena` → 毎時
- `/api/analyze-trends` → 6時間ごと
- `/api/summarize-today` → 毎朝8時
- `/api/fetch-ga-data` → 毎日1回（前日のデータ取得）
- `/api/fetch-search-console` → 毎日1回（前日のデータ取得）

## ローカルでの定期実行（手動）

ローカル環境で定期実行する場合は、以下の方法があります：

### 方法1: cronコマンドを使用（macOS/Linux）

```bash
# crontabを編集
crontab -e

# 以下を追加（例：毎朝8時にブログ候補を生成）
0 8 * * * curl http://localhost:3000/api/summarize-today
```

### 方法2: 手動で実行

必要なタイミングで、上記のAPIを手動で実行します。

## データの確認方法

### ダッシュボードで確認
- `http://localhost:3000/dashboard` にアクセス
- 統計情報、最新の公式アップデート、ブログ候補を確認

### APIで直接確認
```bash
# 統計情報を取得
curl http://localhost:3000/api/dashboard/stats | jq '.'

# ブログ候補一覧を取得
curl http://localhost:3000/api/dashboard/blog-ideas | jq '.'
```

## よくある質問

### Q: ブログ候補が生成されない
A: 以下のAPIを順番に実行してください：
1. `fetch-official` - 公式情報を取得
2. `analyze-trends` - トレンド分析を実行
3. `summarize-today` - ブログ候補を生成

### Q: LLM APIが設定されていない
A: `.env.local`に以下のいずれかを設定してください：
- `OPENAI_API_KEY`（推奨）
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

設定しない場合は、テンプレートベースのサマリーが生成されます。

### Q: データが古い
A: 各APIを再実行して、最新データを取得してください。

## トラブルシューティング

### エラーが発生した場合
1. ブラウザのコンソールでエラーを確認
2. サーバーのログを確認（ターミナルに表示されます）
3. `/api/dashboard/stats`でデータの状態を確認

### データベースをリセットしたい場合
```bash
# データベースファイルを削除
rm -rf data/ai-pulse.db*

# 再初期化
curl http://localhost:3000/api/init-db
```

## 次のステップ

1. **実際に使ってみる**: 毎日ブログ候補を生成して、ダッシュボードで確認
2. **精度を上げる**: LLM APIを設定して、より高品質なブログ候補を生成
3. **自動化**: Vercelにデプロイして、自動実行を設定
4. **改善**: 使いながら問題があれば修正

