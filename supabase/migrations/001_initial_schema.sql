-- AI Pulse Database Schema
-- 初期スキーマ定義

-- raw_events: 各クローラーの生データ
CREATE TABLE IF NOT EXISTS raw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(100) NOT NULL, -- 'openai', 'anthropic', 'reddit', 'twitter', etc.
  source_type VARCHAR(50) NOT NULL, -- 'official', 'community', 'twitter', 'arena'
  title TEXT,
  content TEXT,
  url TEXT,
  author VARCHAR(255),
  published_at TIMESTAMPTZ,
  metadata JSONB, -- ソース固有の追加データ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_events_source ON raw_events(source);
CREATE INDEX idx_raw_events_source_type ON raw_events(source_type);
CREATE INDEX idx_raw_events_published_at ON raw_events(published_at);
CREATE INDEX idx_raw_events_created_at ON raw_events(created_at);

-- model_updates: モデルごとのアップデート整理
CREATE TABLE IF NOT EXISTS model_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL, -- 'gpt-4', 'claude-3', etc.
  update_type VARCHAR(50) NOT NULL, -- 'release', 'update', 'pricing', 'feature'
  title TEXT NOT NULL,
  description TEXT,
  version VARCHAR(50),
  raw_event_id UUID REFERENCES raw_events(id),
  url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_model_updates_model_name ON model_updates(model_name);
CREATE INDEX idx_model_updates_update_type ON model_updates(update_type);
CREATE INDEX idx_model_updates_published_at ON model_updates(published_at);

-- user_voices: Reddit/X/HN の口コミ要約
CREATE TABLE IF NOT EXISTS user_voices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL, -- 'reddit', 'twitter', 'hackernews'
  platform VARCHAR(50) NOT NULL, -- サブレディット名、ハッシュタグなど
  title TEXT,
  content TEXT,
  url TEXT,
  author VARCHAR(255),
  sentiment VARCHAR(20), -- 'positive', 'negative', 'neutral'
  score INTEGER, -- スコア、いいね数など
  raw_event_id UUID REFERENCES raw_events(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_voices_source ON user_voices(source);
CREATE INDEX idx_user_voices_sentiment ON user_voices(sentiment);
CREATE INDEX idx_user_voices_published_at ON user_voices(published_at);

-- trends: トレンド分析結果
CREATE TABLE IF NOT EXISTS trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(255) NOT NULL,
  trend_type VARCHAR(50) NOT NULL, -- 'keyword', 'sentiment', 'mention_count', 'arena_score'
  value NUMERIC,
  previous_value NUMERIC,
  growth_rate NUMERIC, -- 増加率（%）
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB, -- 追加の分析データ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trends_keyword ON trends(keyword);
CREATE INDEX idx_trends_trend_type ON trends(trend_type);
CREATE INDEX idx_trends_period_start ON trends(period_start);

-- blog_ideas: 記事候補一覧
CREATE TABLE IF NOT EXISTS blog_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT, -- LLMで生成された詳細な内容
  sources JSONB, -- 参照元のraw_eventsやmodel_updatesのID配列
  priority VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'published'
  recommendation_score NUMERIC, -- 過去パフォーマンスに基づく推奨度（0-100）
  metadata JSONB, -- 追加データ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_ideas_status ON blog_ideas(status);
CREATE INDEX idx_blog_ideas_priority ON blog_ideas(priority);
CREATE INDEX idx_blog_ideas_created_at ON blog_ideas(created_at);

-- blog_posts: 過去のブログ記事とパフォーマンス（Google Analytics連携）
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  -- Google Analytics データ
  page_views INTEGER DEFAULT 0,
  avg_time_on_page NUMERIC, -- 秒
  bounce_rate NUMERIC, -- 0-1
  -- 検索パフォーマンス
  search_impressions INTEGER DEFAULT 0,
  search_clicks INTEGER DEFAULT 0,
  search_ctr NUMERIC, -- 0-1
  -- 分析データ
  topics JSONB, -- トピック、キーワードなど
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);
CREATE INDEX idx_blog_posts_page_views ON blog_posts(page_views);

-- search_queries: Search Consoleの検索クエリ
CREATE TABLE IF NOT EXISTS search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC, -- 0-1
  avg_position NUMERIC,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_queries_query ON search_queries(query);
CREATE INDEX idx_search_queries_date ON search_queries(date);

-- logs: バッチログ
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error'
  endpoint VARCHAR(255),
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_endpoint ON logs(endpoint);
CREATE INDEX idx_logs_created_at ON logs(created_at);

-- updated_at を自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at トリガーを各テーブルに追加
CREATE TRIGGER update_raw_events_updated_at BEFORE UPDATE ON raw_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_updates_updated_at BEFORE UPDATE ON model_updates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_voices_updated_at BEFORE UPDATE ON user_voices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_ideas_updated_at BEFORE UPDATE ON blog_ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

