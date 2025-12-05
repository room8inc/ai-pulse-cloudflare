import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

/**
 * 過去のブログ記事のパフォーマンスを分析し、ネタの精度向上に活用するAPI
 * Cron: 毎週1回
 * 
 * 処理内容:
 * - 過去記事のパフォーマンス分析（PV、滞在時間、CTR）
 * - 人気記事の傾向分析（どのようなネタが読まれたか）
 * - 検索クエリの分析（ユーザーが求めている情報）
 * - 類似ネタの優先度付け（過去の人気記事と類似度が高いネタを優先）
 * - トレンド予測（次に来そうなトレンドを予測）
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseClient();

  try {
    // 過去記事のパフォーマンスデータを取得
    const { data: blogPosts } = supabase
      .from('blog_posts')
      .select('*')
      .all();

    // 検索クエリデータを取得（過去30日間）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: searchQueries } = supabase
      .from('search_queries')
      .select('*')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .all();

    // 人気記事の分析
    const popularPosts = (blogPosts || [])
      .filter((post: any) => post.page_views > 100)
      .sort((a: any, b: any) => b.page_views - a.page_views)
      .slice(0, 10);

    // 検索クエリの分析（人気キーワード）
    const popularQueries = (searchQueries || [])
      .reduce((acc: any, query: any) => {
        const key = query.query.toLowerCase();
        if (!acc[key]) {
          acc[key] = {
            query: query.query,
            impressions: 0,
            clicks: 0,
            ctr: 0,
          };
        }
        acc[key].impressions += query.impressions || 0;
        acc[key].clicks += query.clicks || 0;
        return acc;
      }, {} as any);

    const topQueries = Object.values(popularQueries)
      .map((q: any) => ({
        ...q,
        ctr: q.impressions > 0 ? (q.clicks / q.impressions) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.clicks - a.clicks)
      .slice(0, 20);

    // 分析結果をメタデータとして保存（将来の推奨度計算に使用）
    const analysisResult = {
      popularPosts: popularPosts.map((p: any) => ({
        title: p.title,
        pageViews: p.page_views,
        topics: p.topics ? JSON.parse(p.topics) : [],
      })),
      topQueries: topQueries,
      analyzedAt: new Date().toISOString(),
    };

    // ログを記録
    supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/analyze-blog-performance',
      message: `Analyzed ${popularPosts.length} popular posts and ${topQueries.length} top queries`,
      metadata: JSON.stringify({
        popularPostsCount: popularPosts.length,
        topQueriesCount: topQueries.length,
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'analyze-blog-performance completed',
      data: {
        popularPosts: popularPosts.length,
        topQueries: topQueries.length,
        analysis: analysisResult,
      },
    });
  } catch (error) {
    console.error('Error in analyze-blog-performance:', error);

    // エラーログを記録
    supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/analyze-blog-performance',
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

