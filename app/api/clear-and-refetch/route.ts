export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

/**
 * 古いデータをクリアして再取得するAPI
 * 
 * 処理内容:
 * 1. 古いデータをクリア（raw_events, model_updates, user_voices, trends, blog_ideas）
 * 2. 各APIを順番に実行して最新データを取得
 */
export async function POST(request: NextRequest) {
  const supabase = createSupabaseClient();

  try {
    const { clearAll = false } = await request.json().catch(() => ({}));

    // クリアするテーブル
    const tablesToClear = [
      'raw_events',
      'model_updates',
      'user_voices',
      'trends',
      'blog_ideas',
    ];

    // すべてのデータをクリアする場合（blog_postsとsearch_queriesも含む）
    if (clearAll) {
      tablesToClear.push('blog_posts', 'search_queries');
    }

    // データをクリア
    const clearedTables: string[] = [];
    for (const table of tablesToClear) {
      try {
        const { error } = await supabase.from(table).delete().neq('id', ''); // すべてのデータを削除
        if (error) {
          console.error(`Error clearing ${table}:`, error);
        } else {
          clearedTables.push(table);
        }
      } catch (error: any) {
        console.error(`Error clearing ${table}:`, error);
      }
    }

    // ログに記録
    await supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/clear-and-refetch',
      message: `Cleared tables: ${clearedTables.join(', ')}`,
      metadata: JSON.stringify({ clearAll, clearedTables }),
    });

    // 各APIを順番に実行して最新データを取得
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const apis = [
      '/api/fetch-official',
      '/api/fetch-community',
      '/api/fetch-arena',
      '/api/fetch-twitter',
      '/api/analyze-trends',
    ];

    const results: any[] = [];

    for (const api of apis) {
      try {
        const response = await fetch(`${baseUrl}${api}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        results.push({
          api,
          success: data.success || response.ok,
          message: data.message || 'OK',
        });
      } catch (error: any) {
        results.push({
          api,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data cleared and refetched',
      cleared: clearedTables,
      refetchResults: results,
    });
  } catch (error: any) {
    console.error('Error in clear-and-refetch:', error);
    
    // ログに記録
    await supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/clear-and-refetch',
      message: error.message,
      metadata: JSON.stringify({ error: error.toString() }),
    });

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * データをクリアするだけ（再取得しない）
 */
export async function DELETE(request: NextRequest) {
  const supabase = createSupabaseClient();

  try {
    const { clearAll = false } = await request.json().catch(() => ({}));

    // クリアするテーブル
    const tablesToClear = [
      'raw_events',
      'model_updates',
      'user_voices',
      'trends',
      'blog_ideas',
    ];

    // すべてのデータをクリアする場合
    if (clearAll) {
      tablesToClear.push('blog_posts', 'search_queries');
    }

    // データをクリア
    const clearedTables: string[] = [];
    for (const table of tablesToClear) {
      try {
        const { error } = await supabase.from(table).delete().neq('id', ''); // すべてのデータを削除
        if (error) {
          console.error(`Error clearing ${table}:`, error);
        } else {
          clearedTables.push(table);
        }
      } catch (error: any) {
        console.error(`Error clearing ${table}:`, error);
      }
    }

    // ログに記録
    await supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/clear-and-refetch',
      message: `Cleared tables: ${clearedTables.join(', ')}`,
      metadata: JSON.stringify({ clearAll, method: 'DELETE', clearedTables }),
    });

    return NextResponse.json({
      success: true,
      message: 'Data cleared',
      cleared: clearedTables,
    });
  } catch (error: any) {
    console.error('Error clearing data:', error);
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

