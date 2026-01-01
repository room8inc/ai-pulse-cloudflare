export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import { generateSummary } from '@/utils/llm-summarizer';

/**
 * 収集データをLLMで統合サマリー化するAPI
 * Cron: 毎朝8時実行
 */
export async function GET(request: NextRequest) {
  const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
  const supabase = createSupabaseClient(env);

  try {
    // 最新のデータを取得（過去7日間、新しい順）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStart = sevenDaysAgo.toISOString();

    // 公式情報・メディア情報（過去7日間、新しい順）
    const { data: official } = await supabase
      .from('raw_events')
      .select('*')
      .in('source_type', ['official', 'media'])
      .gte('created_at', sevenDaysAgoStart)
      .all();
    
    // created_atでソート（新しい順）
    if (official) {
      official.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
    }

    // コミュニティの声（過去7日間、新しい順）
    const { data: community } = await supabase
      .from('user_voices')
      .select('*')
      .gte('created_at', sevenDaysAgoStart)
      .all();
    
    // created_atでソート（新しい順）
    if (community) {
      community.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });
    }

    // 最新のトレンド（過去7日間）
    const { data: trends } = await supabase
      .from('trends')
      .select('*')
      .gte('created_at', sevenDaysAgoStart)
      .all();

    // Search Consoleの検索クエリ（過去30日間、人気順）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: searchQueries } = await supabase
      .from('search_queries')
      .select('*')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .all();
    
    // 検索クエリを集計（クリック数が多い順）
    const queryMap = new Map<string, { query: string; clicks: number; impressions: number; ctr: number }>();
    (searchQueries || []).forEach((q: any) => {
      const key = q.query.toLowerCase();
      if (!queryMap.has(key)) {
        queryMap.set(key, { query: q.query, clicks: 0, impressions: 0, ctr: 0 });
      }
      const existing = queryMap.get(key)!;
      existing.clicks += q.clicks || 0;
      existing.impressions += q.impressions || 0;
    });
    const topQueries = Array.from(queryMap.values())
      .map(q => ({ ...q, ctr: q.impressions > 0 ? (q.clicks / q.impressions) * 100 : 0 }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 20);

    // 人気記事（過去のパフォーマンス）
    const { data: popularPosts } = await supabase
      .from('blog_posts')
      .select('*')
      .all();
    
    const topPosts = (popularPosts || [])
      .filter((p: any) => p.page_views > 100)
      .sort((a: any, b: any) => (b.page_views || 0) - (a.page_views || 0))
      .slice(0, 10);

    // AI分析結果を取得（これから狙うべきキーワード、記事戦略、市場のギャップ）
    const { data: aiRecommendedKeywords } = await supabase
      .from('trends')
      .select('*')
      .eq('trend_type', 'ai_recommended_keyword')
      .gte('created_at', sevenDaysAgoStart)
      .all();

    const { data: aiStrategy } = await supabase
      .from('trends')
      .select('*')
      .eq('trend_type', 'ai_strategy')
      .gte('created_at', sevenDaysAgoStart)
      .all();

    // AI分析結果を整理
    const aiAnalysis = {
      recommendedKeywords: (aiRecommendedKeywords || [])
        .map((k: any) => {
          try {
            const metadata = JSON.parse(k.metadata || '{}');
            return {
              keyword: k.keyword,
              reason: metadata.reason || '',
              opportunity_score: metadata.opportunity_score || 0,
              competition_level: metadata.competition_level || 'medium',
              suggested_article_type: metadata.suggested_article_type || '',
            };
          } catch {
            return null;
          }
        })
        .filter((k: any) => k !== null)
        .sort((a: any, b: any) => (b.opportunity_score || 0) - (a.opportunity_score || 0))
        .slice(0, 10),
      strategy: (aiStrategy || [])
        .map((s: any) => {
          try {
            const metadata = JSON.parse(s.metadata || '{}');
            return {
              strategy_recommendations: metadata.strategy_recommendations || '',
              market_gaps: metadata.market_gaps || [],
            };
          } catch {
            return null;
          }
        })
        .filter((s: any) => s !== null)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        })[0] || null,
    };

    // LLMでサマリーを生成
    const { summary, blogIdeas } = await generateSummary({
      official: official || [],
      community: community || [],
      trends: trends || [],
      searchQueries: topQueries,
      popularPosts: topPosts,
      aiAnalysis: {
        ...aiAnalysis,
        recommendedKeywords: (aiAnalysis.recommendedKeywords || [])
          .filter((k: any) => k !== null && typeof k === 'object')
          .map((k: any) => ({
            keyword: String(k.keyword || ''),
            reason: String(k.reason || ''),
            opportunity_score: Number(k.opportunity_score || 0),
            competition_level: String(k.competition_level || 'medium'),
            suggested_article_type: String(k.suggested_article_type || 'guide')
          })),
      },
    });

    // ブログ候補をDBに登録
    const createdIdeas: any[] = [];
    for (const idea of blogIdeas) {
      // IDを生成
      const generateId = () => {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toLowerCase();
      };

      const ideaId = generateId();

      const { error } = await supabase.from('blog_ideas').insert({
        id: ideaId,
        title: idea.title,
        summary: idea.summary,
        content: idea.content,
        sources: JSON.stringify(idea.sources),
        priority: idea.priority,
        status: 'pending',
        metadata: JSON.stringify({
          generated_at: new Date().toISOString(),
          generated_by: 'summarize-today',
          recommended_keywords: idea.recommended_keywords || [],
          seo_recommendations: idea.seo_recommendations || '',
        }),
      });

      if (!error) {
        createdIdeas.push({ ...idea, id: ideaId });
      } else {
        console.error('Error inserting blog idea:', error);
      }
    }

    // ログを記録
    await supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/summarize-today',
      message: `Generated ${createdIdeas.length} blog ideas`,
      metadata: JSON.stringify({
        officialCount: official?.length || 0,
        communityCount: community?.length || 0,
        trendsCount: trends?.length || 0,
        blogIdeasCount: createdIdeas.length,
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'summarize-today completed',
      data: {
        summary,
        blogIdeas: createdIdeas,
        stats: {
          official: official?.length || 0,
          community: community?.length || 0,
          trends: trends?.length || 0,
        },
      },
    });
  } catch (error) {
    console.error('Error in summarize-today:', error);

    // エラーログを記録
    await supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/summarize-today',
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

