import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import {
  detectRisingKeywords,
  calculateTrend,
  analyzeSentimentTrend,
  detectMultiSourceMentions,
} from '@/utils/trend-analyzer';
import { analyzeTrendsWithAI } from '@/utils/trend-ai-analyzer';

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
    const { data: currentEvents } = await supabase
      .from('raw_events')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .all();

    // その前の7日間のデータ（比較用）
    const { data: previousEvents } = await supabase
      .from('raw_events')
      .select('*')
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())
      .all();

    // 過去7日間のコミュニティの声
    const { data: currentVoices } = await supabase
      .from('user_voices')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .all();

    // その前の7日間のコミュニティの声（比較用）
    const { data: previousVoices } = await supabase
      .from('user_voices')
      .select('*')
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())
      .all();

    // Search Consoleの検索クエリを取得（ユーザーが実際に検索しているキーワード）
    const { data: searchQueries } = await supabase
      .from('search_queries')
      .select('*')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .all();

    const trends: any[] = [];

    // 急上昇キーワードの検出（Search Consoleの検索クエリも考慮）
    const risingKeywords = detectRisingKeywords(
      currentEvents || [],
      previousEvents || [],
      searchQueries || [] // Search Consoleの検索クエリを渡す
    );

    for (const { keyword, growthRate, currentCount } of risingKeywords) {
      const previousCount = (previousEvents || []).filter((e: any) => {
        const title = (e.title || '').toLowerCase();
        const content = (e.content || '').toLowerCase();
        return title.includes(keyword.toLowerCase()) || content.includes(keyword.toLowerCase());
      }).length;

      // IDを生成
      const generateId = () => {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toLowerCase();
      };

      // trendsテーブルに保存
      const { error } = await supabase.from('trends').insert({
        id: generateId(),
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
      const generateId = () => {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toLowerCase();
      };

      await supabase.from('trends').insert({
        id: generateId(),
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

    // 感情の変化トレンドを分析
    const sentimentTrend = analyzeSentimentTrend(
      currentVoices || [],
      previousVoices || []
    );

    if (sentimentTrend) {
      const generateId = () => {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toLowerCase();
      };

      await supabase.from('trends').insert({
        id: generateId(),
        keyword: `sentiment_${sentimentTrend.sentiment}`,
        trend_type: 'sentiment',
        value: sentimentTrend.currentCount,
        previous_value: sentimentTrend.previousCount,
        growth_rate: sentimentTrend.growthRate,
        period_start: sevenDaysAgo.toISOString(),
        period_end: now.toISOString(),
        metadata: JSON.stringify({
          detected_at: now.toISOString(),
          sentiment: sentimentTrend.sentiment,
        }),
      });

      trends.push({
        keyword: `sentiment_${sentimentTrend.sentiment}`,
        trendType: 'sentiment',
        growthRate: sentimentTrend.growthRate,
        currentCount: sentimentTrend.currentCount,
        previousCount: sentimentTrend.previousCount,
      });
    }

    // 複数ソースでの同時言及を検出
    const multiSourceKeywords: string[] = [];
    for (const { keyword } of risingKeywords.slice(0, 10)) {
      const multiSource = detectMultiSourceMentions(
        currentEvents || [],
        keyword,
        2
      );
      if (multiSource) {
        multiSourceKeywords.push(keyword);
        trends.push({
          keyword,
          trendType: 'keyword',
          growthRate: risingKeywords.find((k) => k.keyword === keyword)?.growthRate || 0,
          currentCount: multiSource.count,
          previousCount: 0,
          multiSource: true,
          sources: multiSource.sources,
        });
      }
    }

    // AIによるトレンド分析を実行
    let aiAnalysis = null;
    try {
      // 過去記事のパフォーマンスデータを取得
      const { data: blogPosts } = await supabase
        .from('blog_posts')
        .select('*')
        .all();

      // 人気記事を取得
      const popularPosts = (blogPosts || [])
        .filter((p: any) => p.page_views > 100)
        .sort((a: any, b: any) => (b.page_views || 0) - (a.page_views || 0))
        .slice(0, 10);

      // AI分析を実行
      aiAnalysis = await analyzeTrendsWithAI({
        trends: trends,
        searchQueries: searchQueries || [],
        popularPosts: popularPosts || [],
        blogPosts: blogPosts || [],
        currentEvents: currentEvents || [],
      });

      // AI分析結果をtrendsテーブルに保存
      const generateId = () => {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toLowerCase();
      };

      // 推奨キーワードを保存
      for (const keyword of aiAnalysis.recommended_keywords) {
        await supabase.from('trends').insert({
          id: generateId(),
          keyword: keyword.keyword,
          trend_type: 'ai_recommended_keyword',
          value: keyword.opportunity_score,
          previous_value: 0,
          growth_rate: 0,
          period_start: sevenDaysAgo.toISOString(),
          period_end: now.toISOString(),
          metadata: JSON.stringify({
            detected_at: now.toISOString(),
            reason: keyword.reason,
            opportunity_score: keyword.opportunity_score,
            competition_level: keyword.competition_level,
            suggested_article_type: keyword.suggested_article_type,
            analysis_type: 'ai_recommendation',
          }),
        });
      }

      // 記事戦略を保存
      await supabase.from('trends').insert({
        id: generateId(),
        keyword: 'ai_strategy_recommendations',
        trend_type: 'ai_strategy',
        value: 0,
        previous_value: 0,
        growth_rate: 0,
        period_start: sevenDaysAgo.toISOString(),
        period_end: now.toISOString(),
        metadata: JSON.stringify({
          detected_at: now.toISOString(),
          strategy_recommendations: aiAnalysis.strategy_recommendations,
          market_gaps: aiAnalysis.market_gaps,
          analysis_type: 'ai_strategy',
        }),
      });
    } catch (error) {
      console.error('Error in AI trend analysis:', error);
      // AI分析が失敗しても、基本的なトレンド分析は続行
    }

    // ログを記録
    await supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/analyze-trends',
      message: `Analyzed trends: ${trends.length} rising keywords detected${aiAnalysis ? ', AI analysis completed' : ''}`,
      metadata: JSON.stringify({
        trendsCount: trends.length,
        mentionGrowthRate,
        aiAnalysisCompleted: !!aiAnalysis,
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
        aiAnalysis: aiAnalysis || null,
      },
    });
  } catch (error) {
    console.error('Error in analyze-trends:', error);

    // エラーログを記録
    await supabase.from('logs').insert({
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

