-- AI Pulse Database Schema (SQLite版)
-- 初期スキーマ定義

-- raw_events: 各クローラーの生データ
CREATE TABLE IF NOT EXISTS raw_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  source TEXT NOT NULL, -- 'openai', 'anthropic', 'reddit', 'twitter', etc.
  source_type TEXT NOT NULL, -- 'official', 'community', 'twitter', 'arena'
  title TEXT,
  content TEXT,
  url TEXT,
  author TEXT,
  published_at TEXT, -- ISO8601形式の文字列
  metadata TEXT, -- JSON文字列
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_raw_events_source ON raw_events(source);
CREATE INDEX IF NOT EXISTS idx_raw_events_source_type ON raw_events(source_type);
CREATE INDEX IF NOT EXISTS idx_raw_events_published_at ON raw_events(published_at);
CREATE INDEX IF NOT EXISTS idx_raw_events_created_at ON raw_events(created_at);

-- model_updates: モデルごとのアップデート整理
CREATE TABLE IF NOT EXISTS model_updates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  model_name TEXT NOT NULL, -- 'gpt-4', 'claude-3', etc.
  update_type TEXT NOT NULL, -- 'release', 'update', 'pricing', 'feature'
  title TEXT NOT NULL,
  description TEXT,
  version TEXT,
  raw_event_id TEXT,
  url TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (raw_event_id) REFERENCES raw_events(id)
);

CREATE INDEX IF NOT EXISTS idx_model_updates_model_name ON model_updates(model_name);
CREATE INDEX IF NOT EXISTS idx_model_updates_update_type ON model_updates(update_type);
CREATE INDEX IF NOT EXISTS idx_model_updates_published_at ON model_updates(published_at);

-- user_voices: Reddit/X/HN の口コミ要約
CREATE TABLE IF NOT EXISTS user_voices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  source TEXT NOT NULL, -- 'reddit', 'twitter', 'hackernews'
  platform TEXT NOT NULL, -- サブレディット名、ハッシュタグなど
  title TEXT,
  content TEXT,
  url TEXT,
  author TEXT,
  sentiment TEXT, -- 'positive', 'negative', 'neutral'
  score INTEGER, -- スコア、いいね数など
  raw_event_id TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (raw_event_id) REFERENCES raw_events(id)
);

CREATE INDEX IF NOT EXISTS idx_user_voices_source ON user_voices(source);
CREATE INDEX IF NOT EXISTS idx_user_voices_sentiment ON user_voices(sentiment);
CREATE INDEX IF NOT EXISTS idx_user_voices_published_at ON user_voices(published_at);

-- trends: トレンド分析結果
CREATE TABLE IF NOT EXISTS trends (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  keyword TEXT NOT NULL,
  trend_type TEXT NOT NULL, -- 'keyword', 'sentiment', 'mention_count', 'arena_score'
  value REAL,
  previous_value REAL,
  growth_rate REAL, -- 増加率（%）
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  metadata TEXT, -- JSON文字列
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trends_keyword ON trends(keyword);
CREATE INDEX IF NOT EXISTS idx_trends_trend_type ON trends(trend_type);
CREATE INDEX IF NOT EXISTS idx_trends_period_start ON trends(period_start);

-- blog_ideas: 記事候補一覧
CREATE TABLE IF NOT EXISTS blog_ideas (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT, -- LLMで生成された詳細な内容
  sources TEXT, -- JSON文字列（参照元のID配列）
  priority TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'published'
  recommendation_score REAL, -- 過去パフォーマンスに基づく推奨度（0-100）
  metadata TEXT, -- JSON文字列
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_ideas_status ON blog_ideas(status);
CREATE INDEX IF NOT EXISTS idx_blog_ideas_priority ON blog_ideas(priority);
CREATE INDEX IF NOT EXISTS idx_blog_ideas_created_at ON blog_ideas(created_at);

-- blog_posts: 過去のブログ記事とパフォーマンス（Google Analytics連携）
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  -- Google Analytics データ
  page_views INTEGER DEFAULT 0,
  avg_time_on_page REAL, -- 秒
  bounce_rate REAL, -- 0-1
  -- 検索パフォーマンス
  search_impressions INTEGER DEFAULT 0,
  search_clicks INTEGER DEFAULT 0,
  search_ctr REAL, -- 0-1
  -- 分析データ
  topics TEXT, -- JSON文字列
  metadata TEXT, -- JSON文字列
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_page_views ON blog_posts(page_views);

-- search_queries: Search Consoleの検索クエリ
CREATE TABLE IF NOT EXISTS search_queries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  query TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr REAL, -- 0-1
  avg_position REAL,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries(query);
CREATE INDEX IF NOT EXISTS idx_search_queries_date ON search_queries(date);

-- logs: バッチログ
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  level TEXT NOT NULL, -- 'info', 'warning', 'error'
  endpoint TEXT,
  message TEXT NOT NULL,
  metadata TEXT, -- JSON文字列
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_endpoint ON logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);

-- updated_at を自動更新するトリガー
CREATE TRIGGER IF NOT EXISTS update_raw_events_updated_at 
  AFTER UPDATE ON raw_events
  BEGIN
    UPDATE raw_events SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_model_updates_updated_at 
  AFTER UPDATE ON model_updates
  BEGIN
    UPDATE model_updates SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_user_voices_updated_at 
  AFTER UPDATE ON user_voices
  BEGIN
    UPDATE user_voices SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_blog_ideas_updated_at 
  AFTER UPDATE ON blog_ideas
  BEGIN
    UPDATE blog_ideas SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_blog_posts_updated_at 
  AFTER UPDATE ON blog_posts
  BEGIN
    UPDATE blog_posts SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

