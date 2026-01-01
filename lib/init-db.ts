import type { D1Database } from '@cloudflare/workers-types';
import { createSupabaseClient } from './db';

/**
 * Cloudflare D1データベースを初期化（スキーマを適用）
 */

/**
 * D1データベースを初期化
 * @param db D1Databaseインスタンス
 */
export async function initDatabase(db?: D1Database) {
  if (!db) {
    throw new Error('D1 database instance is required');
  }

  try {
    // D1用のマイグレーションファイルを読み込んで実行
    // 注意: Cloudflare Pages環境では、ファイルシステムに直接アクセスできないため、
    // マイグレーションは wrangler d1 migrations apply コマンドで実行する必要があります
    // この関数は、API経由でマイグレーションを実行する場合に使用します
    
    const schema = `
-- raw_events: 各クローラーの生データ
CREATE TABLE IF NOT EXISTS raw_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  source TEXT NOT NULL,
  source_type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  url TEXT,
  author TEXT,
  published_at TEXT,
  metadata TEXT,
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
  model_name TEXT NOT NULL,
  update_type TEXT NOT NULL,
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
  source TEXT NOT NULL,
  platform TEXT NOT NULL,
  title TEXT,
  content TEXT,
  url TEXT,
  author TEXT,
  sentiment TEXT,
  score INTEGER,
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
  trend_type TEXT NOT NULL,
  value REAL,
  previous_value REAL,
  growth_rate REAL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  metadata TEXT,
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
  content TEXT,
  sources TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  recommendation_score REAL,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_ideas_status ON blog_ideas(status);
CREATE INDEX IF NOT EXISTS idx_blog_ideas_priority ON blog_ideas(priority);
CREATE INDEX IF NOT EXISTS idx_blog_ideas_created_at ON blog_ideas(created_at);

-- blog_posts: 過去のブログ記事とパフォーマンス
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  page_views INTEGER DEFAULT 0,
  avg_time_on_page REAL,
  bounce_rate REAL,
  search_impressions INTEGER DEFAULT 0,
  search_clicks INTEGER DEFAULT 0,
  search_ctr REAL,
  topics TEXT,
  metadata TEXT,
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
  ctr REAL,
  avg_position REAL,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries(query);
CREATE INDEX IF NOT EXISTS idx_search_queries_date ON search_queries(date);

-- logs: バッチログ
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  level TEXT NOT NULL,
  endpoint TEXT,
  message TEXT NOT NULL,
  metadata TEXT,
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
`;

    // SQL文を分割して実行
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const results: { statement: string; success: boolean; error?: string }[] = [];

    for (const statement of statements) {
      if (statement.length === 0) continue;

      try {
        await db.exec(statement);
        results.push({ statement: statement.substring(0, 50), success: true });
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        // テーブル/インデックス/トリガーが既に存在する場合は無視
        if (
          errorMsg.includes('already exists') ||
          errorMsg.includes('duplicate') ||
          errorMsg.includes('UNIQUE constraint')
        ) {
          results.push({ statement: statement.substring(0, 50), success: true, error: 'already exists (ignored)' });
          continue;
        }
        // その他のエラーはログに記録
        results.push({ statement: statement.substring(0, 50), success: false, error: errorMsg });
        console.error('Error executing SQL:', statement.substring(0, 100));
        console.error('Error details:', errorMsg);
      }
    }

    console.log(`Database initialized: ${results.filter(r => r.success).length}/${results.length} statements executed`);
    return results;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
