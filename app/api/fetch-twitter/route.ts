import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import { MONITORED_TWITTER_ACCOUNTS, getUserIds } from '@/lib/twitter-accounts';

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
      // 認証情報が未設定の場合は、フォールバック動作として空の結果を返す
      // ログに警告を記録
      supabase.from('logs').insert({
        level: 'warning',
        endpoint: '/api/fetch-twitter',
        message: 'TWITTER_BEARER_TOKEN is not set. Twitter data fetching skipped.',
        metadata: JSON.stringify({
          note: 'Twitter API認証情報を設定すると、Twitter/X投稿を取得できます',
        }),
      });

      return NextResponse.json({
        success: true,
        message: 'fetch-twitter skipped (no authentication)',
        data: {
          total: 0,
          success: 0,
          failed: 0,
          errors: [],
        },
        note: 'Twitter API認証情報が設定されていません。設定方法については後述の指示を参照してください。',
      });
    }

    // 監視対象アカウントのユーザーIDを取得（バッチで取得）
    const usernames = MONITORED_TWITTER_ACCOUNTS.map(acc => acc.username);
    const userIdMap = await getUserIds(usernames, bearerToken);

    // 各アカウントの投稿を取得（優先度順、レート制限を考慮）
    const accountsByPriority = MONITORED_TWITTER_ACCOUNTS.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    // レート制限を考慮して、リクエスト間に待機時間を設ける
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < accountsByPriority.length; i++) {
      const account = accountsByPriority[i];
      const userId = userIdMap.get(account.username.toLowerCase());
      if (!userId) {
        console.warn(`User ID not found for @${account.username}`);
        continue;
      }

      // レート制限を考慮（リクエスト間に1秒待機）
      if (i > 0) {
        await delay(1000);
      }

      try {
        // 特定ユーザーの投稿を取得（最新10件）
        const response = await fetch(
          `https://api.twitter.com/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,author_id,public_metrics,text&exclude=retweets,replies`,
          {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // レート制限エラー（429）の場合はスキップして続行
          if (response.status === 429) {
            console.warn(`Rate limit reached for @${account.username}, skipping...`);
            results.errors.push(`@${account.username}: Rate limit exceeded`);
            continue;
          }
          
          throw new Error(`Twitter API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const tweets = data.data || [];

        results.total += tweets.length;
        
        // アカウント情報を追加
        const accountInfo = account;

        for (const tweet of tweets) {
          // 品質フィルタリング（エンゲージメントで判定）
          const metrics = tweet.public_metrics || {};
          const likeCount = metrics.like_count || 0;
          const retweetCount = metrics.retweet_count || 0;
          const replyCount = metrics.reply_count || 0;
          
          // エンゲージメントの閾値（アカウントの優先度に応じて調整）
          const engagementThreshold = accountInfo.priority === 'high' ? 10 : 5;
          const totalEngagement = likeCount + retweetCount + replyCount;
          
          // エンゲージメントが低すぎる投稿を除外
          if (totalEngagement < engagementThreshold) {
            continue;
          }
          
          // スパムキーワードをチェック
          const text = (tweet.text || '').toLowerCase();
          const spamKeywords = [
            'click here', 'free money', 'make money', 'earn $', 'get rich',
            'follow me', 'dm me', 'link in bio', 'check out my', 'promo code',
            'giveaway', 'win free', 'limited time', 'act now', 'don\'t miss',
          ];
          if (spamKeywords.some(keyword => text.includes(keyword))) {
            continue; // スパムキーワードを含む投稿はスキップ
          }
          
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

          // IDを生成
          const generateId = () => {
            const randomBytes = new Uint8Array(16);
            crypto.getRandomValues(randomBytes);
            return Array.from(randomBytes)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('')
              .toLowerCase();
          };

          const rawEventId = generateId();

          // raw_eventsとuser_voicesに保存
          const { error: rawEventError } = supabase.from('raw_events').insert({
            id: rawEventId,
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
              account: accountInfo.username,
              account_category: accountInfo.category,
              account_priority: accountInfo.priority,
            }),
          });

          if (rawEventError) {
            results.failed++;
            continue;
          }

          // user_voices用のIDを生成
          const userVoiceId = generateId();

          const { error: userVoiceError } = supabase.from('user_voices').insert({
            id: userVoiceId,
            source: 'twitter',
            platform: 'twitter',
            title: tweet.text?.substring(0, 200) || '',
            content: tweet.text || '',
            url: tweetUrl,
            author: `user_${tweet.author_id}`,
            score: tweet.public_metrics?.like_count || 0,
            raw_event_id: rawEventId,
            published_at: new Date(tweet.created_at).toISOString(),
            metadata: JSON.stringify({
              tweet_id: tweet.id,
              retweet_count: tweet.public_metrics?.retweet_count || 0,
              account: accountInfo.username,
              account_category: accountInfo.category,
              account_priority: accountInfo.priority,
            }),
          });

          if (!userVoiceError) {
            results.success++;
          }
        }
      } catch (error) {
        console.error(`Error fetching tweets from @${account.username}:`, error);
        results.failed++;
        results.errors.push(
          `@${account.username}: ${error instanceof Error ? error.message : 'Unknown error'}`
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
