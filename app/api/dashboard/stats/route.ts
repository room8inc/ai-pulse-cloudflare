export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

/**
 * ダッシュボード用の統計データを取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    // Cloudflare Pages環境では、envからD1データベースを取得
    const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
    const db = createSupabaseClient(env);

    // 今日のデータ数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    const { data: todayEvents } = await db
      .from('raw_events')
      .select('id')
      .gte('created_at', todayStart)
      .all();

    // 最新の公式アップデート・メディア情報（過去7日間、created_atでソート）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentOfficial } = await db
      .from('raw_events')
      .select('*')
      .in('source_type', ['official', 'media'])
      .gte('created_at', sevenDaysAgo.toISOString())
      .all();

    // 最新のコミュニティの声（過去7日間、created_atでソート）
    const { data: recentVoices } = await db
      .from('user_voices')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .all();
    
    // created_atでソート（新しい順）
    if (recentOfficial) {
      recentOfficial.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.published_at || 0).getTime();
        const dateB = new Date(b.created_at || b.published_at || 0).getTime();
        return dateB - dateA;
      });
    }
    
    if (recentVoices) {
      recentVoices.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.published_at || 0).getTime();
        const dateB = new Date(b.created_at || b.published_at || 0).getTime();
        return dateB - dateA;
      });
    }

    // ブログ候補の数
    const { data: blogIdeas } = await db
      .from('blog_ideas')
      .select('*')
      .all();

    const pendingIdeas = blogIdeas?.filter((idea: any) => idea.status === 'pending') || [];
    const approvedIdeas = blogIdeas?.filter((idea: any) => idea.status === 'approved') || [];

    // 最新のトレンド（過去7日間、成長率が高い順）
    const { data: recentTrends } = await db
      .from('trends')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .all();

    const topTrends = (recentTrends || [])
      .filter((t: any) => t.trend_type === 'keyword' && t.growth_rate > 50)
      .sort((a: any, b: any) => (b.growth_rate || 0) - (a.growth_rate || 0))
      .slice(0, 5);

    // AI分析結果（これから狙うべきキーワード）
    const aiRecommendedKeywords = (recentTrends || [])
      .filter((t: any) => t.trend_type === 'ai_recommended_keyword')
      .sort((a: any, b: any) => {
        try {
          const metadataA = JSON.parse(a.metadata || '{}');
          const metadataB = JSON.parse(b.metadata || '{}');
          return (metadataB.opportunity_score || 0) - (metadataA.opportunity_score || 0);
        } catch {
          return 0;
        }
      })
      .slice(0, 10);

    // AI分析結果（記事戦略）
    const aiStrategy = (recentTrends || [])
      .filter((t: any) => t.trend_type === 'ai_strategy')
      .sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 1)[0];

    // 過去記事のパフォーマンス（人気記事トップ5）
    const { data: popularPosts } = await db
      .from('blog_posts')
      .select('*')
      .all();

    const topPosts = (popularPosts || [])
      .filter((p: any) => p.page_views > 0)
      .sort((a: any, b: any) => (b.page_views || 0) - (a.page_views || 0))
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        todayEvents: todayEvents?.length || 0,
        recentOfficial: recentOfficial?.slice(0, 10) || [],
        recentVoices: recentVoices?.slice(0, 10) || [],
        blogIdeas: {
          total: blogIdeas?.length || 0,
          pending: pendingIdeas.length,
          approved: approvedIdeas.length,
        },
        topTrends: topTrends,
        topPosts: topPosts,
        aiRecommendedKeywords: aiRecommendedKeywords,
        aiStrategy: aiStrategy,
      },
    });
  } catch (error) {
    console.error('Error in dashboard/stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

