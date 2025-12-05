import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import {
  detectRisingKeywords,
  calculateTrend,
} from '@/utils/trend-analyzer';

/**
 * トレンド分析を行うAPI
 * Cron: 6時間ごと実行
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseClient();

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 過去7日間のデータ
    const { data: currentEvents } = supabase
      .from('raw_events')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .all();

    // その前の7日間のデータ（比較用）
    const { data: previousEvents } = supabase
      .from('raw_events')
      .select('*')
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())
      .all();

    const trends: any[] = [];

    // 急上昇キーワードの検出
    const risingKeywords = detectRisingKeywords(
      currentEvents || [],
      previousEvents || []
    );

    for (const { keyword, growthRate, currentCount } of risingKeywords) {
      const previousCount = (previousEvents || []).filter((e: any) => {
        const title = (e.title || '').toLowerCase();
        const content = (e.content || '').toLowerCase();
        return title.includes(keyword.toLowerCase()) || content.includes(keyword.toLowerCase());
      }).length;

      // trendsテーブルに保存
      const { error } = supabase.from('trends').insert({
        keyword,
        trend_type: 'keyword',
        value: currentCount,
        previous_value: previousCount,
        growth_rate: growthRate,
        period_start: sevenDaysAgo.toISOString(),
        period_end: now.toISOString(),
        metadata: JSON.stringify({
          detected_at: now.toISOString(),
        }),
      });

      if (!error) {
        trends.push({
          keyword,
          trendType: 'keyword',
          growthRate,
          currentCount,
          previousCount,
        });
      }
    }

    // 言及数の推移
    const currentMentionCount = (currentEvents || []).length;
    const previousMentionCount = (previousEvents || []).length;
    const mentionGrowthRate = calculateTrend(currentMentionCount, previousMentionCount);

    if (Math.abs(mentionGrowthRate) > 10) {
      // 10%以上の変化がある場合のみ記録
      supabase.from('trends').insert({
        keyword: 'total_mentions',
        trend_type: 'mention_count',
        value: currentMentionCount,
        previous_value: previousMentionCount,
        growth_rate: mentionGrowthRate,
        period_start: sevenDaysAgo.toISOString(),
        period_end: now.toISOString(),
        metadata: JSON.stringify({
          detected_at: now.toISOString(),
        }),
      });
    }

    // ログを記録
    supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/analyze-trends',
      message: `Analyzed trends: ${trends.length} rising keywords detected`,
      metadata: JSON.stringify({
        trendsCount: trends.length,
        mentionGrowthRate,
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'analyze-trends completed',
      data: {
        trends,
        mentionGrowthRate,
        currentMentionCount,
        previousMentionCount,
      },
    });
  } catch (error) {
    console.error('Error in analyze-trends:', error);

    // エラーログを記録
    supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/analyze-trends',
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

