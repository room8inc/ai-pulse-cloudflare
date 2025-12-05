import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

/**
 * ダッシュボード用の統計データを取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    const db = createSupabaseClient();

    // 今日のデータ数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.toISOString();

    const { data: todayEvents } = db
      .from('raw_events')
      .select('id')
      .gte('created_at', todayStart)
      .all();

    // 最新の公式アップデート（過去7日間）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentOfficial } = db
      .from('raw_events')
      .select('*')
      .eq('source_type', 'official')
      .gte('published_at', sevenDaysAgo.toISOString())
      .all();

    // 最新のコミュニティの声（過去7日間）
    const { data: recentVoices } = db
      .from('user_voices')
      .select('*')
      .gte('published_at', sevenDaysAgo.toISOString())
      .all();

    // ブログ候補の数
    const { data: blogIdeas } = db
      .from('blog_ideas')
      .select('*')
      .all();

    const pendingIdeas = blogIdeas?.filter((idea: any) => idea.status === 'pending') || [];
    const approvedIdeas = blogIdeas?.filter((idea: any) => idea.status === 'approved') || [];

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

