import { createSupabaseClient } from './db';
import fs from 'fs';
import path from 'path';

/**
 * データベースを初期化（スキーマを適用）
 */
export function initDatabase() {
  const db = createSupabaseClient();
  
  // SQLiteスキーマファイルを読み込んで実行
  const schemaPath = path.join(process.cwd(), 'supabase', 'migrations', '001_initial_schema_sqlite.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // SQL文を分割して実行（SQLiteは複数文を一度に実行できないため）
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (error) {
      // テーブルが既に存在するなどのエラーは無視
      if (!String(error).includes('already exists')) {
        console.error('Error executing SQL:', statement.substring(0, 50), error);
      }
    }
  }
  
  console.log('Database initialized successfully');
}

