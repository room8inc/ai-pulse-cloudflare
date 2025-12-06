import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import { generateSummary } from '@/utils/llm-summarizer';

/**
 * 収集データをLLMで統合サマリー化するAPI
 * Cron: 毎朝8時実行
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseClient();

  try {
    // 最新のデータを取得（過去7日間、新しい順）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStart = sevenDaysAgo.toISOString();

    // 公式情報・メディア情報（過去7日間、新しい順）
    const { data: official } = supabase
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
    const { data: community } = supabase
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
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: trends } = supabase
      .from('trends')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .all();

    // LLMでサマリーを生成
    const { summary, blogIdeas } = await generateSummary({
      official: official || [],
      community: community || [],
      trends: trends || [],
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

      const { error } = supabase.from('blog_ideas').insert({
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
        }),
      });

      if (!error) {
        createdIdeas.push({ ...idea, id: ideaId });
      } else {
        console.error('Error inserting blog idea:', error);
      }
    }

    // ログを記録
    supabase.from('logs').insert({
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
    supabase.from('logs').insert({
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

