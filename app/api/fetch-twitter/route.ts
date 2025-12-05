import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

/**
 * Twitter/X投稿を取得するAPI
 * 
 * 注: Twitter API v2を使用（Bearer Token必要）
 * 検索クエリ: AI関連のハッシュタグやキーワード
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
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
      return NextResponse.json({
        success: false,
        error: 'TWITTER_BEARER_TOKEN is not set',
        message: 'Twitter API認証情報が設定されていません',
      });
    }

    // AI関連の検索クエリ
    const queries = [
      '#GPT4 OR #Claude OR #Anthropic OR #OpenAI',
      '#LLM OR #MachineLearning OR #AI',
      'GPT-4 OR Claude 3 OR OpenAI',
    ];

    for (const query of queries) {
      try {
        // Twitter API v2で検索
        const response = await fetch(
          `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10&tweet.fields=created_at,author_id,public_metrics`,
          {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (!response.ok) {
          throw new Error(`Twitter API Error: ${response.status}`);
        }

        const data = await response.json();
        const tweets = data.data || [];

        results.total += tweets.length;

        for (const tweet of tweets) {
          // 重複チェック
          const tweetUrl = `https://twitter.com/i/web/status/${tweet.id}`;
          const { data: existing } = supabase
            .from('raw_events')
            .select('id')
            .eq('url', tweetUrl)
            .eq('source', 'twitter')
            .single();

          if (existing) {
            continue;
          }

          // raw_eventsとuser_voicesに保存
          const { error: rawEventError } = supabase.from('raw_events').insert({
            source: 'twitter',
            source_type: 'twitter',
            title: tweet.text?.substring(0, 200) || '',
            content: tweet.text || '',
            url: tweetUrl,
            author: `user_${tweet.author_id}`,
            published_at: new Date(tweet.created_at).toISOString(),
            metadata: JSON.stringify({
              tweet_id: tweet.id,
              metrics: tweet.public_metrics,
            }),
          });

          if (rawEventError) {
            results.failed++;
            continue;
          }

          const { error: userVoiceError } = supabase.from('user_voices').insert({
            source: 'twitter',
            platform: 'twitter',
            title: tweet.text?.substring(0, 200) || '',
            content: tweet.text || '',
            url: tweetUrl,
            author: `user_${tweet.author_id}`,
            score: tweet.public_metrics?.like_count || 0,
            published_at: new Date(tweet.created_at).toISOString(),
            metadata: JSON.stringify({
              tweet_id: tweet.id,
              retweet_count: tweet.public_metrics?.retweet_count || 0,
            }),
          });

          if (!userVoiceError) {
            results.success++;
          }
        }
      } catch (error) {
        console.error(`Error fetching Twitter query "${query}":`, error);
        results.failed++;
        results.errors.push(
          `Query "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // ログを記録
    supabase.from('logs').insert({
      level: results.failed > 0 ? 'warning' : 'info',
      endpoint: '/api/fetch-twitter',
      message: `Fetched ${results.success} tweets, ${results.failed} failed`,
      metadata: JSON.stringify({
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'fetch-twitter completed',
      data: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      },
    });
  } catch (error) {
    console.error('Error in fetch-twitter:', error);

    // エラーログを記録
    supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/fetch-twitter',
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
