import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import { MONITORED_TWITTER_ACCOUNTS } from '@/lib/twitter-accounts';
import { scrapeMultipleProfiles } from '@/utils/twitter-scraper';

/**
 * X（Twitter）の投稿をスクレイピングで取得するAPI
 * 
 * ⚠️ 注意事項:
 * - 利用規約違反のリスクがあります
 * - 1日1回程度の低頻度アクセスのみ推奨
 * - 個人利用・非公開用途に限定
 * - 自己責任で使用してください
 * 
 * このAPIは「手動チェックの補助」として使用することを推奨します
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
    // 監視対象アカウント（最重要アカウントのみ）
    const usernames = MONITORED_TWITTER_ACCOUNTS.map(acc => acc.username);
    
    // スクレイピング実行（アカウント間に5秒待機）
    const scrapedData = await scrapeMultipleProfiles(usernames, 5000);
    
    // 各アカウントの投稿をDBに保存
    for (const [username, posts] of scrapedData.entries()) {
      const account = MONITORED_TWITTER_ACCOUNTS.find(acc => acc.username === username);
      
      for (const post of posts) {
        // エンゲージメントフィルタリング（反応率で判定）
        const totalEngagement = post.likes + post.retweets + post.replies;
        const engagementThreshold = account?.priority === 'high' ? 10 : 5;
        
        if (totalEngagement < engagementThreshold) {
          continue; // エンゲージメントが低い投稿はスキップ
        }
        
        // 重複チェック
        const { data: existing } = await supabase
          .from('raw_events')
          .select('id')
          .eq('url', post.url)
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
        const { error: rawEventError } = await supabase.from('raw_events').insert({
          id: rawEventId,
          source: 'twitter',
          source_type: 'twitter',
          title: post.text.substring(0, 200) || '',
          content: post.text || '',
          url: post.url,
          author: `@${username}`,
          published_at: post.timestamp.toISOString(),
          metadata: JSON.stringify({
            tweet_id: post.id,
            likes: post.likes,
            retweets: post.retweets,
            replies: post.replies,
            views: post.views,
            account: username,
            account_category: account?.category,
            account_priority: account?.priority,
            scraped: true, // スクレイピングで取得したことを記録
          }),
        });

        if (rawEventError) {
          results.failed++;
          continue;
        }

        // user_voices用のIDを生成
        const userVoiceId = generateId();

        const { error: userVoiceError } = await supabase.from('user_voices').insert({
          id: userVoiceId,
          source: 'twitter',
          platform: 'twitter',
          title: post.text.substring(0, 200) || '',
          content: post.text || '',
          url: post.url,
          author: `@${username}`,
          score: totalEngagement, // エンゲージメントをスコアとして使用
          raw_event_id: rawEventId,
          published_at: post.timestamp.toISOString(),
          metadata: JSON.stringify({
            tweet_id: post.id,
            likes: post.likes,
            retweets: post.retweets,
            replies: post.replies,
            views: post.views,
            account: username,
            scraped: true,
          }),
        });

        if (!userVoiceError) {
          results.success++;
        } else {
          results.failed++;
        }
      }
      
      results.total += posts.length;
    }

    // ログを記録
    await supabase.from('logs').insert({
      level: results.failed > 0 ? 'warning' : 'info',
      endpoint: '/api/fetch-twitter-scrape',
      message: `Scraped ${results.success} tweets, ${results.failed} failed`,
      metadata: JSON.stringify({
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
        note: '⚠️ Scraping may violate ToS. Use at your own risk.',
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'fetch-twitter-scrape completed',
      data: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      },
      warning: '⚠️ Scraping may violate X (Twitter) Terms of Service. Use at your own risk. Recommended: 1 time per day maximum.',
    });
  } catch (error) {
    console.error('Error in fetch-twitter-scrape:', error);

    // エラーログを記録
    await supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/fetch-twitter-scrape',
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

