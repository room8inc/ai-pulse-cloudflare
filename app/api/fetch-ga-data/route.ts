import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

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
      supabase.from('logs').insert({
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

    // TODO: Google Analytics Data APIを使用してデータ取得
    // 1. OAuth 2.0認証
    // 2. 前日のページビューデータを取得
    // 3. blog_posts テーブルに保存または更新

    // 現時点ではプレースホルダー
    const results = {
      fetched: 0,
      updated: 0,
    };

    // ログを記録
    supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/fetch-ga-data',
      message: `Fetched GA data: ${results.fetched} posts, ${results.updated} updated`,
      metadata: JSON.stringify(results),
    });

    return NextResponse.json({
      success: true,
      message: 'fetch-ga-data completed (placeholder)',
      data: results,
      note: 'Google Analytics API実装が必要です',
    });
  } catch (error) {
    console.error('Error in fetch-ga-data:', error);

    // エラーログを記録
    supabase.from('logs').insert({
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

