import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/init-db';
import { createSupabaseClient } from '@/lib/db';

/**
 * データベースを初期化するAPI
 * 初回セットアップ時やスキーマ変更時に実行
 * 
 * 注意: Cloudflare Pages環境では、通常は wrangler d1 migrations apply を使用します
 * このAPIは、API経由でマイグレーションを実行する場合に使用します
 */
export async function GET(request: NextRequest) {
  try {
    // Cloudflare Pages環境では、envからD1データベースを取得
    // @cloudflare/next-on-pagesを使用している場合、request.envから取得可能
    const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
    
    if (!env?.DB) {
      return NextResponse.json(
        {
          success: false,
          error: 'D1 database binding not found. Please use wrangler d1 migrations apply instead.',
          note: 'Cloudflare Pages環境では、通常は wrangler d1 migrations apply コマンドでマイグレーションを実行します。',
        },
        { status: 400 }
      );
    }

    // データベースを初期化
    await initDatabase(env.DB);

    // 初期化確認のため、テーブル一覧を取得
    const db = createSupabaseClient(env);
    const tables = [
      'raw_events',
      'model_updates',
      'user_voices',
      'trends',
      'blog_ideas',
      'blog_posts',
      'search_queries',
      'logs',
    ];

    const tableStatus: { [key: string]: boolean } = {};
    for (const table of tables) {
      try {
        const { data } = await db.from(table).select('id').all();
        tableStatus[table] = true;
      } catch (error) {
        tableStatus[table] = false;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      tables: tableStatus,
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

