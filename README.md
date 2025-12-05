# AI News Aggregator / Next.js Project

## (Room8 AI Labo – Automated AI Update & User Voice Collector)

このプロジェクトは **AIモデルの最新情報とトレンドを自動収集・分析し、ブログ記事ネタを自動生成するためのシステム** です。

目的は「速報性 × トレンド × 比較 × ユーザーの生の声」を一括で集めて、**毎日、記事ネタが降ってくる状態をつくること。**

Cursor での開発を前提に、以下の構成で設計されています。

---

## ■ 全体構成

```text
Next.js (App Router)

 ├─ /api/

 │   ├─ fetch-official      ← 公式ニュース（RSS/API）

 │   ├─ fetch-community     ← Reddit/HN/HuggingFaceなど

 │   ├─ fetch-twitter       ← Twitter/Xクローリング

 │   ├─ fetch-arena         ← LMSYS/Arenaスコア取得

 │   ├─ summarize-today     ← 収集データをLLMで統合サマリー化

 │   ├─ analyze-trends      ← トレンド分析（急上昇・感情変化・言及数推移）

 │   ├─ fetch-ga-data       ← Google Analyticsデータ取得

 │   ├─ fetch-search-console ← Search Consoleデータ取得

 │   ├─ analyze-blog-performance ← 過去記事のパフォーマンス分析

 │   └─ push-blog-idea      ← ブログ候補をDBに登録

 │

 ├─ /dashboard              ← ネタ管理画面（非公開）

 │   ├─ 今日のアップデート

 │   ├─ 声のサマリー

 │   ├─ モデル別タイムライン

 │   └─ ブログ候補（採用/保留/ボツ管理）

 │

SQLite (ローカルデータベース)

 ├─ raw_events             ← 各クローラーの生データ

 ├─ model_updates          ← モデルごとのアップデート整理

 ├─ user_voices            ← Reddit/X/HN の口コミ要約

 ├─ trends                 ← トレンド分析結果（急上昇キーワード・感情変化など）

 ├─ blog_ideas             ← 記事候補一覧

 ├─ blog_posts             ← 過去のブログ記事とパフォーマンス

 ├─ search_queries         ← Search Consoleの検索クエリ

 └─ logs                   ← バッチログ
```

---

## ■ 何が自動化されるか？

### 1. **AIモデルの公式アップデートの自動収集**

- OpenAI (RSS / API)

- Anthropic (RSS)

- Google DeepMind (RSS)

- xAI (RSS)

- Microsoft AI Blog

- LMSYS/Arena（性能変動）

### 2. **技術コミュニティの反反応**

- HackerNews  

- Reddit各サブ（MachineLearning, LocalLLaMA, OpenAI etc）

- HuggingFace Discussions

- GitHub Issues

### 3. **一般ユーザーの声（感情データ）**

- X（Twitter）投稿

- YouTubeタイトル（レビュー系）

- 個人ブログ（Google Custom Search）

### 4. **トレンド分析**

- 過去N日間との比較（言及数の増加率）

- 急上昇キーワードの検出

- 感情の変化トレンド（ポジティブ/ネガティブの推移）

- Arenaスコアの変動トレンド

- 複数ソースでの同時言及（トレンドの確度向上）

- モデル別の注目度推移

### 5. **AIによる統合サマリー**

- 公式（事実）

- 技術者の声（専門性）

- 一般ユーザーの感情（本音）

- Arenaなどの客観スコア

- トレンド情報（急上昇・注目度）

- 記事ネタ候補生成

### 6. **過去のパフォーマンス分析（Google Analytics/Search Console連携）**

- 過去のブログ記事のパフォーマンス分析（PV、滞在時間、CTR）
- 検索クエリの分析（どのキーワードで検索されているか）
- 人気記事の傾向分析
- 類似ネタの優先度付け

### 7. **ダッシュボードで "選ぶだけ"**

- 「書く／保留／ボツ」選択機能
- 過去のパフォーマンスに基づく推奨度表示

---

## ■ 技術スタック

- **Next.js 14 / App Router**

- **SQLite** (better-sqlite3) - 完全無料・ローカル完結

- **Vercel Cron**

- **Node-fetch / Cheerio / RSS parser**

- **OpenAI / Anthropic / Gemini API**

- **Twitter/X API**

- **Google Analytics API**

- **Google Search Console API**

---

## ■ セットアップ

### 1. 環境変数

```bash
# SQLiteは環境変数不要（完全無料・ローカル完結）

# AI APIs（後で設定）
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
TWITTER_BEARER_TOKEN=
GOOGLE_CUSTOM_SEARCH_KEY=
GOOGLE_CSE_ID=

# Google Analytics / Search Console
GOOGLE_ANALYTICS_PROPERTY_ID=
GOOGLE_ANALYTICS_CREDENTIALS=
GOOGLE_SEARCH_CONSOLE_SITE_URL=
GOOGLE_SEARCH_CONSOLE_CREDENTIALS=
```

### 2. ローカル実行

```bash
npm install
npm run dev
```

### 3. Cron設定

- `/api/fetch-official` → 毎時

- `/api/fetch-community` → 3時間ごと

- `/api/fetch-arena` → 毎時

- `/api/analyze-trends` → 6時間ごと（過去データと比較）

- `/api/fetch-ga-data` → 毎日1回（前日のデータ取得）

- `/api/fetch-search-console` → 毎日1回（前日のデータ取得）

- `/api/analyze-blog-performance` → 毎週1回（過去記事の分析）

- `/api/summarize-today` → 毎朝8時

---

## ■ API Routes（役割）

| Endpoint | 内容 |
|---------|------|
| `/api/fetch-official` | 公式情報（RSS/API）取得 |
| `/api/fetch-community` | Reddit/HN/HFの反応取得 |
| `/api/fetch-twitter` | X投稿の取得 |
| `/api/fetch-arena` | Arena スコア取得 |
| `/api/analyze-trends` | トレンド分析（急上昇・感情変化・言及数推移） |
| `/api/fetch-ga-data` | Google Analyticsデータ取得 |
| `/api/fetch-search-console` | Search Consoleデータ取得 |
| `/api/analyze-blog-performance` | 過去記事のパフォーマンス分析 |
| `/api/summarize-today` | AIで統合サマリー生成 |
| `/api/push-blog-idea` | 記事候補登録 |

---

## ■ ダッシュボード機能

- 今日のまとめ

- モデル別アップデート

- Reddit/HN/Twitterの感情傾向

- トレンド可視化（急上昇キーワード、言及数推移グラフ、感情変化）

- 過去記事のパフォーマンス分析（人気記事の傾向、検索クエリ分析）

- ブログ候補の管理（採用/保留/ボツ/公開済、過去パフォーマンスに基づく推奨度）

---
