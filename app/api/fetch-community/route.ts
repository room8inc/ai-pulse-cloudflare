import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import { COMMUNITY_SOURCES } from '@/lib/community-sources';
import {
  fetchReddit,
  fetchHackerNews,
  fetchHuggingFace,
  fetchGitHubIssues,
} from '@/utils/community-fetcher';

/**
 * Reddit/HN/HuggingFaceなどのコミュニティ反応を取得するAPI
 * Cron: 3時間ごと実行
 * 
 * 対象:
 * - Reddit (MachineLearning, LocalLLaMA, OpenAI, singularity)
 * - HackerNews (AI/ML関連)
 * - HuggingFace Discussions
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseClient();
  const results = {
    success: 0,
    failed: 0,
    total: 0,
    errors: [] as string[],
  };

  try {
    // 各コミュニティソースからデータを取得
    for (const source of COMMUNITY_SOURCES) {
      try {
        let items: any[] = [];

        switch (source.type) {
          case 'reddit':
            if (source.subreddit) {
              items = await fetchReddit(source.subreddit, source.url);
            }
            break;
          case 'hackernews':
            if (source.keywords) {
              items = await fetchHackerNews(source.keywords);
            }
            break;
          case 'huggingface':
            items = await fetchHuggingFace();
            break;
          case 'github':
            if (source.repo) {
              items = await fetchGitHubIssues(source.repo);
            }
            break;
        }

        results.total += items.length;

        // 各アイテムをraw_eventsとuser_voicesテーブルに保存
        for (const item of items) {
          // 品質フィルタリング：スコアが低すぎる投稿を除外
          if (item.score !== undefined && item.score < 5) {
            continue; // スコアが5未満の投稿はスキップ（低品質・スパムの可能性）
          }
          
          // タイトルが短すぎる、または空の場合はスキップ
          if (!item.title || item.title.length < 10) {
            continue;
          }
          
          // 重複チェック（URLが既に存在するか）
          const { data: existing } = await supabase
            .from('raw_events')
            .select('id')
            .eq('url', item.url)
            .eq('source', item.source)
            .single();

          if (existing) {
            // 既に存在する場合はスキップ
            continue;
          }

          // IDを事前に生成（SQLiteのデフォルト値と同じ形式）
          const generateId = () => {
            const randomBytes = new Uint8Array(16);
            crypto.getRandomValues(randomBytes);
            return Array.from(randomBytes)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('')
              .toLowerCase();
          };

          const rawEventId = generateId();

          // raw_eventsテーブルに挿入
          const { error: rawEventError } = await supabase.from('raw_events').insert({
            id: rawEventId,
            source: item.source,
            source_type: 'community',
            title: item.title,
            content: item.content || '',
            url: item.url,
            author: item.author || null,
            published_at: item.publishedAt.toISOString(),
            metadata: JSON.stringify({
              platform: item.platform,
              score: item.score,
            }),
          });

          if (rawEventError) {
            console.error(`Error inserting raw_event from ${source.name}:`, rawEventError);
            results.failed++;
            continue;
          }

          // user_voicesテーブルにも挿入（要約用）
          const { error: userVoiceError } = await supabase.from('user_voices').insert({
            source: item.source,
            platform: item.platform,
            title: item.title,
            content: item.content || '',
            url: item.url,
            author: item.author || null,
            score: item.score,
            raw_event_id: rawEventId,
            published_at: item.publishedAt.toISOString(),
            metadata: JSON.stringify({
              source_name: source.name,
            }),
          });

          if (userVoiceError) {
            console.error(`Error inserting user_voice from ${source.name}:`, userVoiceError);
            // raw_eventsは成功しているので、エラーは記録するだけ
          } else {
            results.success++;
          }
        }
      } catch (error) {
        console.error(`Error fetching ${source.name}:`, error);
        results.failed++;
        results.errors.push(
          `${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // ログを記録
    await supabase.from('logs').insert({
      level: results.failed > 0 ? 'warning' : 'info',
      endpoint: '/api/fetch-community',
      message: `Fetched ${results.success} items, ${results.failed} failed`,
      metadata: JSON.stringify({
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'fetch-community completed',
      data: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      },
    });
  } catch (error) {
    console.error('Error in fetch-community:', error);

    // エラーログを記録
    await supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/fetch-community',
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

