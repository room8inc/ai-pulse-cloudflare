/**
 * Cloudflare D1データベースクライアント
 * Supabase互換APIを提供
 */

import type { D1Database } from '@cloudflare/workers-types';

// Cloudflare Workers/Pages環境でのD1バインディング型定義
interface Env {
  DB: D1Database;
}

// グローバルなEnv型（Cloudflare Pages環境）
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB?: D1Database;
    }
  }
}

/**
 * D1データベースクライアント
 * Supabase互換のAPIを提供
 */
class DBClient {
  private db: D1Database;

  constructor(db?: D1Database) {
    // Cloudflare Pages環境では、request.envから取得
    // ローカル開発時は引数から取得
    if (typeof db !== 'undefined') {
      this.db = db;
    } else if (typeof process !== 'undefined' && process.env?.DB) {
      this.db = process.env.DB as any;
    } else {
      throw new Error('D1 database binding not found. Make sure DB is configured in wrangler.toml');
    }
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
          single: async () => {
            if (conditions.length > 0) {
              query += ' WHERE ' + conditions.join(' AND ');
            }
            query += ' LIMIT 1';
            try {
              const result = await this.db.prepare(query).bind(...values).first();
              return { data: result || null, error: null };
            } catch (error) {
              return { data: null, error };
            }
          },
          all: async () => {
            if (conditions.length > 0) {
              query += ' WHERE ' + conditions.join(' AND ');
            }
            try {
              const results = await this.db.prepare(query).bind(...values).all();
              return { data: results.results || [], error: null };
            } catch (error) {
              return { data: null, error };
            }
          },
        };

        return queryBuilder;
      },
      insert: async (data: any) => {
        try {
          const columns = Object.keys(data).join(', ');
          const placeholders = Object.keys(data).map(() => '?').join(', ');
          const values = Object.values(data);
          const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
          const result = await this.db.prepare(query).bind(...values).run();
          return { data: { id: result.meta.last_row_id?.toString() }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      update: (data: any) => ({
        eq: async (column: string, value: any) => {
          try {
            const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
            const values = [...Object.values(data), value];
            const query = `UPDATE ${table} SET ${setClause} WHERE ${column} = ?`;
            await this.db.prepare(query).bind(...values).run();
            return { data: null, error: null };
          } catch (error) {
            return { data: null, error };
          }
        },
      }),
      delete: () => ({
        eq: async (column: string, value: any) => {
          try {
            const query = `DELETE FROM ${table} WHERE ${column} = ?`;
            await this.db.prepare(query).bind(value).run();
            return { error: null };
          } catch (error) {
            return { error };
          }
        },
        neq: async (column: string, value: any) => {
          try {
            // neq('id', '') で全削除を実現
            if (column === 'id' && value === '') {
              const query = `DELETE FROM ${table}`;
              await this.db.prepare(query).run();
            } else {
              const query = `DELETE FROM ${table} WHERE ${column} != ?`;
              await this.db.prepare(query).bind(value).run();
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
  async exec(sql: string) {
    await this.db.exec(sql);
  }

  /**
   * データベース接続を閉じる（D1では不要だが互換性のため）
   */
  close() {
    // D1は接続管理が不要
  }
}

// シングルトンインスタンス（Cloudflare Pages環境用）
let dbInstance: DBClient | null = null;

/**
 * データベースクライアントを取得
 * Cloudflare Pages環境では、request.envから取得
 * 
 * @param env Cloudflare Pages環境のenvオブジェクト（オプション）
 * @returns DBClientインスタンス
 */
export function createSupabaseClient(env?: { DB?: D1Database } | any) {
  // Cloudflare Pages環境: envから取得
  if (env?.DB) {
    return new DBClient(env.DB);
  }
  
  // @cloudflare/next-on-pagesを使用している場合、request.envから取得
  // ただし、Next.js App Routerでは標準的な方法がないため、
  // グローバル変数やprocess.envから取得を試みる
  if (typeof globalThis !== 'undefined' && (globalThis as any).__CF_PAGES_ENV__?.DB) {
    return new DBClient((globalThis as any).__CF_PAGES_ENV__.DB);
  }
  
  // ローカル開発環境: process.envから取得を試みる
  // または、wrangler pages devで実行している場合
  if (typeof process !== 'undefined' && process.env?.DB) {
    return new DBClient(process.env.DB as any);
  }
  
  // シングルトンインスタンス（フォールバック）
  if (!dbInstance) {
    // 警告を出して、envが設定されていないことを通知
    console.warn(
      'D1 database binding not found. Make sure DB is configured in wrangler.toml and passed to createSupabaseClient().'
    );
    // 開発環境では、エラーを投げずに続行（後でエラーが発生する）
    throw new Error('D1 database binding not found. Please configure DB in wrangler.toml');
  }
  return dbInstance;
}
