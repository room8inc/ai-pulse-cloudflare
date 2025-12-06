import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * SQLiteデータベースクライアント
 * Supabaseの代わりに使用（個人利用・無料）
 */
class DBClient {
  private db: Database.Database;

  constructor() {
    // データベースファイルのパス
    const dbPath = path.join(process.cwd(), 'data', 'ai-pulse.db');
    
    // dataディレクトリが存在しない場合は作成
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // データベース接続
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // パフォーマンス向上
  }

  /**
   * テーブルからデータを取得
   */
  from(table: string) {
    return {
      select: (columns: string = '*') => {
        let query = `SELECT ${columns} FROM ${table}`;
        const conditions: string[] = [];
        const values: any[] = [];

        const queryBuilder = {
          eq: (column: string, value: any) => {
            conditions.push(`${column} = ?`);
            values.push(value);
            return queryBuilder;
          },
          in: (column: string, valueList: any[]) => {
            if (valueList.length === 0) {
              conditions.push('1 = 0'); // 空のリストの場合は常にfalse
              return queryBuilder;
            }
            const placeholders = valueList.map(() => '?').join(', ');
            conditions.push(`${column} IN (${placeholders})`);
            values.push(...valueList);
            return queryBuilder;
          },
          gte: (column: string, value: any) => {
            conditions.push(`${column} >= ?`);
            values.push(value);
            return queryBuilder;
          },
          lt: (column: string, value: any) => {
            conditions.push(`${column} < ?`);
            values.push(value);
            return queryBuilder;
          },
          single: () => {
            if (conditions.length > 0) {
              query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ' LIMIT 1';
            const result = this.db.prepare(query).get(...values);
            return { data: result || null, error: null };
          },
          all: () => {
            if (conditions.length > 0) {
              query += ' WHERE ' + conditions.join(' AND ');
            }
            const results = this.db.prepare(query).all(...values);
            return { data: results, error: null };
          },
        };

        return queryBuilder;
      },
      insert: (data: any) => {
        try {
          const columns = Object.keys(data).join(', ');
          const placeholders = Object.keys(data).map(() => '?').join(', ');
          const values = Object.values(data);
          const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
          const result = this.db.prepare(query).run(...values);
          return { data: { id: result.lastInsertRowid }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      update: (data: any) => ({
        eq: (column: string, value: any) => {
          try {
            const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(data), value];
            const query = `UPDATE ${table} SET ${setClause} WHERE ${column} = ?`;
            this.db.prepare(query).run(...values);
            return { data: null, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
      }),
      delete: () => ({
        eq: (column: string, value: any) => {
          try {
            const query = `DELETE FROM ${table} WHERE ${column} = ?`;
            this.db.prepare(query).run(value);
            return { error: null };
          } catch (error) {
            return { error };
          }
        },
        neq: (column: string, value: any) => {
          try {
            // neq('id', '') で全削除を実現
            if (column === 'id' && value === '') {
              const query = `DELETE FROM ${table}`;
              this.db.prepare(query).run();
            } else {
              const query = `DELETE FROM ${table} WHERE ${column} != ?`;
              this.db.prepare(query).run(value);
            }
            return { error: null };
          } catch (error) {
            return { error };
          }
        },
      }),
    };
  }

  /**
   * 生のSQLクエリを実行
   */
  exec(sql: string) {
    this.db.exec(sql);
  }

  /**
   * データベース接続を閉じる
   */
  close() {
    this.db.close();
  }
}

// シングルトンインスタンス
let dbInstance: DBClient | null = null;

/**
 * データベースクライアントを取得
 * Supabaseの createSupabaseClient() の代わりに使用
 */
export function createSupabaseClient() {
  if (!dbInstance) {
    dbInstance = new DBClient();
    // 初回接続時にスキーマを確認（テーブルが存在しない場合は警告）
    try {
      dbInstance.from('raw_events').select('id').all();
    } catch (error) {
      console.warn(
        'Database tables may not be initialized. Please run /api/init-db first.'
      );
    }
  }
  return dbInstance;
}
