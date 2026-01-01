import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import { fetchGAPostData } from '@/utils/google-analytics';

/**
 * Google Analyticsから過去のブログ記事のパフォーマンスデータを取得するAPI
 * Cron: 毎日1回（前日のデータ取得）
 * 
 * 取得データ:
 * - ページビュー（PV）
 * - 滞在時間
 * - 直帰率
 * - 参照元（どのキーワードから来たか）
 * - 人気記事の傾向
 * 
 * 注: Google Analytics APIの認証とデータ取得は要実装
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseClient();

  try {
    const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
    const credentials = process.env.GOOGLE_ANALYTICS_CREDENTIALS;

    if (!propertyId || !credentials) {
      // 認証情報が未設定の場合は、フォールバック動作として空の結果を返す
      await supabase.from('logs').insert({
        level: 'warning',
        endpoint: '/api/fetch-ga-data',
        message: 'Google Analytics credentials not configured. GA data fetching skipped.',
        metadata: JSON.stringify({
          note: 'Google Analytics認証情報を設定すると、過去記事のパフォーマンスデータを取得できます',
        }),
      });

      return NextResponse.json({
        success: true,
        message: 'fetch-ga-data skipped (no authentication)',
        data: {
          fetched: 0,
          updated: 0,
        },
        note: 'Google Analytics認証情報が設定されていません。設定方法については後述の指示を参照してください。',
      });
    }

    // 前日の日付を計算
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const startDate = yesterday.toISOString().split('T')[0];
    const endDate = startDate;

    // Google Analyticsからデータを取得
    const posts = await fetchGAPostData(propertyId, credentials, startDate, endDate);

    let fetched = 0;
    let updated = 0;

    // blog_postsテーブルに保存または更新
    for (const post of posts) {
      // IDを生成
      const generateId = () => {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toLowerCase();
      };

      // 既存の記事を検索（URLで）
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id')
        .eq('url', post.url)
        .single();

      if (existing) {
        // 既存の場合は更新
        const { error } = supabase
          .from('blog_posts')
          .update({
            page_views: post.pageViews,
            avg_time_on_page: post.avgTimeOnPage,
            bounce_rate: post.bounceRate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (!error) {
          updated++;
        }
      } else {
        // 新規の場合は挿入
        const { error } = await supabase.from('blog_posts').insert({
          id: generateId(),
          title: post.title,
          url: post.url,
          published_at: post.publishedAt,
          page_views: post.pageViews,
          avg_time_on_page: post.avgTimeOnPage,
          bounce_rate: post.bounceRate,
        });

        if (!error) {
          fetched++;
        }
      }
    }

    const results = {
      fetched,
      updated,
    };

    // ログを記録
    await supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/fetch-ga-data',
      message: `Fetched GA data: ${results.fetched} posts, ${results.updated} updated`,
      metadata: JSON.stringify(results),
    });

    return NextResponse.json({
      success: true,
      message: 'fetch-ga-data completed',
      data: results,
    });
  } catch (error) {
    console.error('Error in fetch-ga-data:', error);

    // エラーログを記録
    await supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/fetch-ga-data',
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

