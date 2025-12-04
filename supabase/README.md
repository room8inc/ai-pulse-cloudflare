# Supabase データベーススキーマ

## テーブル構成

### raw_events
各クローラーが取得した生のデータを保存するテーブル。

**カラム:**
- `id`: UUID（主キー）
- `source`: データソース（'openai', 'anthropic', 'reddit', 'twitter' など）
- `source_type`: ソースタイプ（'official', 'community', 'twitter', 'arena'）
- `title`: タイトル
- `content`: コンテンツ
- `url`: 元のURL
- `author`: 著者
- `published_at`: 公開日時
- `metadata`: 追加データ（JSONB）
- `created_at`, `updated_at`: 作成・更新日時

### model_updates
モデルごとのアップデートを整理したテーブル。

**カラム:**
- `id`: UUID（主キー）
- `model_name`: モデル名（'gpt-4', 'claude-3' など）
- `update_type`: アップデートタイプ（'release', 'update', 'pricing', 'feature'）
- `title`: タイトル
- `description`: 説明
- `version`: バージョン
- `raw_event_id`: raw_eventsへの参照
- `url`: URL
- `published_at`: 公開日時

### user_voices
Reddit/X/HN の口コミを要約したテーブル。

**カラム:**
- `id`: UUID（主キー）
- `source`: ソース（'reddit', 'twitter', 'hackernews'）
- `platform`: プラットフォーム（サブレディット名、ハッシュタグなど）
- `title`: タイトル
- `content`: コンテンツ
- `url`: URL
- `author`: 著者
- `sentiment`: 感情（'positive', 'negative', 'neutral'）
- `score`: スコア、いいね数など
- `raw_event_id`: raw_eventsへの参照
- `published_at`: 公開日時

### trends
トレンド分析結果を保存するテーブル。

**カラム:**
- `id`: UUID（主キー）
- `keyword`: キーワード
- `trend_type`: トレンドタイプ（'keyword', 'sentiment', 'mention_count', 'arena_score'）
- `value`: 現在の値
- `previous_value`: 前の値
- `growth_rate`: 増加率（%）
- `period_start`, `period_end`: 分析期間
- `metadata`: 追加データ（JSONB）

### blog_ideas
記事ネタ候補を管理するテーブル。

**カラム:**
- `id`: UUID（主キー）
- `title`: タイトル
- `summary`: サマリー
- `content`: LLMで生成された詳細な内容
- `sources`: 参照元のID配列（JSONB）
- `priority`: 優先度（'high', 'medium', 'low'）
- `status`: ステータス（'pending', 'approved', 'rejected', 'published'）
- `recommendation_score`: 過去パフォーマンスに基づく推奨度（0-100）
- `metadata`: 追加データ（JSONB）

### blog_posts
過去のブログ記事とパフォーマンスを保存するテーブル（Google Analytics連携）。

**カラム:**
- `id`: UUID（主キー）
- `title`: タイトル
- `url`: URL
- `published_at`: 公開日時
- `page_views`: ページビュー数
- `avg_time_on_page`: 平均滞在時間（秒）
- `bounce_rate`: 直帰率（0-1）
- `search_impressions`: 検索インプレッション数
- `search_clicks`: 検索クリック数
- `search_ctr`: 検索CTR（0-1）
- `topics`: トピック、キーワード（JSONB）

### search_queries
Search Consoleの検索クエリを保存するテーブル。

**カラム:**
- `id`: UUID（主キー）
- `query`: 検索クエリ
- `impressions`: インプレッション数
- `clicks`: クリック数
- `ctr`: CTR（0-1）
- `avg_position`: 平均検索順位
- `date`: 日付

### logs
バッチログを記録するテーブル。

**カラム:**
- `id`: UUID（主キー）
- `level`: ログレベル（'info', 'warning', 'error'）
- `endpoint`: エンドポイント名
- `message`: メッセージ
- `metadata`: 追加データ（JSONB）
- `created_at`: 作成日時

## マイグレーションの実行

SupabaseダッシュボードのSQL Editorで `001_initial_schema.sql` を実行してください。

または、Supabase CLIを使用する場合：

```bash
supabase db push
```

