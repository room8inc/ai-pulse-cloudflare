import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/init-db';
import { createSupabaseClient } from '@/lib/db';

/**
 * データベースを初期化するAPI
 * 初回セットアップ時やスキーマ変更時に実行
 */
export async function GET(request: NextRequest) {
  try {
    initDatabase();

    // 初期化確認のため、テーブル一覧を取得
    const db = createSupabaseClient();
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
        const { data } = db.from(table).select('id').all();
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

