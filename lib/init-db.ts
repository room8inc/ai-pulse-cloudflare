import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * データベースを初期化（スキーマを適用）
 */
export function initDatabase() {
  // データベースファイルのパス
  const dbPath = path.join(process.cwd(), 'data', 'ai-pulse.db');
  
  // データベース接続
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  try {
    // SQLiteスキーマファイルを読み込んで実行
    const schemaPath = path.join(process.cwd(), 'supabase', 'migrations', '001_initial_schema_sqlite.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // SQL文を分割（TRIGGER文を考慮）
    const statements: string[] = [];
    let currentStatement = '';
    let inTrigger = false;
    
    const lines = schema.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // コメント行をスキップ
      if (line.startsWith('--') || line.length === 0) {
        continue;
      }
      
      // 行内コメントを削除
      line = line.replace(/--.*$/, '').trim();
      if (line.length === 0) continue;
      
      currentStatement += line + ' ';
      
      // CREATE TRIGGER文の開始を検出
      if (line.toUpperCase().startsWith('CREATE TRIGGER')) {
        inTrigger = true;
      }
      
      // TRIGGER内のENDを検出
      if (inTrigger && line.toUpperCase().includes('END')) {
        // 次の行が空またはコメントの場合、TRIGGER終了
        const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
        if (nextLine.length === 0 || nextLine.startsWith('--')) {
          inTrigger = false;
          statements.push(currentStatement.trim());
          currentStatement = '';
          continue;
        }
      }
      
      // セミコロンで文が終了（TRIGGER内でない場合）
      if (line.endsWith(';') && !inTrigger) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // 残りの文を追加
    if (currentStatement.trim().length > 0) {
      statements.push(currentStatement.trim());
    }
    
    // 各SQL文を実行
    const results: { statement: string; success: boolean; error?: string }[] = [];
    
    for (const statement of statements) {
      if (statement.length === 0) continue;
      
      try {
        db.exec(statement);
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
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    db.close();
  }
}
