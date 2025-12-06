import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

/**
 * ブログ候補一覧を取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    const db = createSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    let query = db.from('blog_ideas').select('*');

    if (status !== 'all') {
      // statusでフィルタリング（将来的に実装）
      // 現時点では全件取得
    }

    const { data: ideas } = query.all();

    // 各ブログ候補の元ネタ（URL）を取得
    const ideasWithSources = (ideas || []).map((idea: any) => {
      let sourceUrls: Array<{ title: string; url: string; source: string }> = [];
      
      try {
        const sourceIds = idea.sources ? JSON.parse(idea.sources) : [];
        
        // raw_eventsからURLを取得
        for (const sourceId of sourceIds) {
          // sourceIdがURLの場合は、URLで検索
          let rawEvent = null;
          if (sourceId.startsWith('http')) {
            const { data: events } = db
              .from('raw_events')
              .select('title, url, source')
              .eq('url', sourceId)
              .all();
            rawEvent = events && events.length > 0 ? events[0] : null;
          } else {
            // IDの場合は通常通り検索
            const result = db
              .from('raw_events')
              .select('title, url, source')
              .eq('id', sourceId)
              .single();
            rawEvent = result.data;
          }
          
          if (rawEvent && rawEvent.url) {
            sourceUrls.push({
              title: rawEvent.title || '元ネタ',
              url: rawEvent.url,
              source: rawEvent.source || 'unknown',
            });
            continue; // 見つかったら次へ
          }
          
          // user_voicesからも取得（raw_eventsにない場合）
          let userVoice = null;
          if (sourceId.startsWith('http')) {
            const { data: voices } = db
              .from('user_voices')
              .select('title, url, source')
              .eq('url', sourceId)
              .all();
            userVoice = voices && voices.length > 0 ? voices[0] : null;
          } else {
            const result = db
              .from('user_voices')
              .select('title, url, source')
              .eq('id', sourceId)
              .single();
            userVoice = result.data;
          }
          
          if (userVoice && userVoice.url) {
            sourceUrls.push({
              title: userVoice.title || '元ネタ',
              url: userVoice.url,
              source: userVoice.source || 'unknown',
            });
          }
        }
      } catch (error) {
        console.error('Error parsing sources:', error);
      }
      
      // metadataからSEO情報を取得
      let recommendedKeywords: string[] = [];
      let seoRecommendations = '';
      
      try {
        if (idea.metadata) {
          const metadata = JSON.parse(idea.metadata);
          recommendedKeywords = metadata.recommended_keywords || [];
          seoRecommendations = metadata.seo_recommendations || '';
        }
      } catch (error) {
        console.error('Error parsing metadata:', error);
      }
      
      return {
        ...idea,
        sourceUrls, // 元ネタのURLリストを追加
        recommended_keywords: recommendedKeywords,
        seo_recommendations: seoRecommendations,
      };
    });

    // 優先度と推奨度でソート
    const sortedIdeas = ideasWithSources.sort((a: any, b: any) => {
      // 優先度: high > medium > low
      const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // 推奨度でソート
      const scoreA = a.recommendation_score || 0;
      const scoreB = b.recommendation_score || 0;
      return scoreB - scoreA;
    });

    return NextResponse.json({
      success: true,
      data: sortedIdeas,
    });
  } catch (error) {
    console.error('Error in dashboard/blog-ideas:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * ブログ候補のステータスを更新するAPI
 */
export async function PATCH(request: NextRequest) {
  try {
    const db = createSupabaseClient();
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'id and status are required' },
        { status: 400 }
      );
    }

    const { error } = db.from('blog_ideas').update({ status }).eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Blog idea status updated',
    });
  } catch (error) {
    console.error('Error updating blog idea:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

