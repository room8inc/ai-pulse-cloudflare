import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import { fetchSearchConsoleData } from '@/utils/google-search-console';

/**
 * Google Search Consoleから検索クエリデータを取得するAPI
 * Cron: 毎日1回（前日のデータ取得）
 * 
 * 取得データ:
 * - 検索クエリ（どのキーワードで検索されているか）
 * - クリック率（CTR）
 * - インプレッション数
 * - 検索順位
 * - クリック数
 * 
 * 注: Google Search Console APIの認証とデータ取得は要実装
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseClient();

  try {
    const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL;
    const credentials = process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS;

    if (!siteUrl || !credentials) {
      // 認証情報が未設定の場合は、フォールバック動作として空の結果を返す
      supabase.from('logs').insert({
        level: 'warning',
        endpoint: '/api/fetch-search-console',
        message: 'Search Console credentials not configured. Search Console data fetching skipped.',
        metadata: JSON.stringify({
          note: 'Search Console認証情報を設定すると、検索クエリデータを取得できます',
        }),
      });

      return NextResponse.json({
        success: true,
        message: 'fetch-search-console skipped (no authentication)',
        data: {
          fetched: 0,
          saved: 0,
        },
        note: 'Search Console認証情報が設定されていません。設定方法については後述の指示を参照してください。',
      });
    }

    // 前日の日付を計算
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startDate = yesterday.toISOString().split('T')[0];
    const endDate = startDate;

    // Google Search Consoleからデータを取得
    const queries = await fetchSearchConsoleData(siteUrl, credentials, startDate, endDate);

    let fetched = 0;
    let saved = 0;

    // search_queriesテーブルに保存
    for (const query of queries) {
      // IDを生成
      const generateId = () => {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toLowerCase();
      };

      // 重複チェック（同じクエリと日付の組み合わせ）
      const { data: existing } = supabase
        .from('search_queries')
        .select('id')
        .eq('query', query.query)
        .eq('date', query.date)
        .single();

      if (existing) {
        // 既存の場合は更新
        const { error } = supabase
          .from('search_queries')
          .update({
            impressions: query.impressions,
            clicks: query.clicks,
            ctr: query.ctr,
            avg_position: query.avgPosition,
          })
          .eq('id', existing.id);

        if (!error) {
          saved++;
        }
      } else {
        // 新規の場合は挿入
        const { error } = supabase.from('search_queries').insert({
          id: generateId(),
          query: query.query,
          impressions: query.impressions,
          clicks: query.clicks,
          ctr: query.ctr,
          avg_position: query.avgPosition,
          date: query.date,
        });

        if (!error) {
          fetched++;
          saved++;
        }
      }
    }

    const results = {
      fetched,
      saved,
    };

    // ログを記録
    supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/fetch-search-console',
      message: `Fetched Search Console data: ${results.fetched} queries, ${results.saved} saved`,
      metadata: JSON.stringify(results),
    });

    return NextResponse.json({
      success: true,
      message: 'fetch-search-console completed',
      data: results,
    });
  } catch (error) {
    console.error('Error in fetch-search-console:', error);

    // エラーログを記録
    supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/fetch-search-console',
      message: error instanceof Error ? error.message : 'Unknown error',
      metadata: JSON.stringify({ error: String(error) }),
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

