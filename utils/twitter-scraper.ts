/**
 * X（Twitter）スクレイピングユーティリティ
 * 
 * ⚠️ 注意: 利用規約違反のリスクがあります
 * - 1日1回程度の低頻度アクセスのみ
 * - 個人利用・非公開用途に限定
 * - 自己責任で使用してください
 * 
 * このツールは「手動チェックの補助」として使用することを推奨します
 */

import * as cheerio from 'cheerio';

export interface TwitterPost {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  likes: number;
  retweets: number;
  replies: number;
  views?: number;
  url: string;
}

/**
 * X（Twitter）の公開プロフィールページから投稿を取得
 * 注意: ログイン不要の公開情報のみを取得
 */
export async function scrapeTwitterProfile(
  username: string
): Promise<TwitterPost[]> {
  try {
    // 公開プロフィールページにアクセス
    const url = `https://x.com/${username}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(30000), // 30秒タイムアウト
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const posts: TwitterPost[] = [];

    // XのHTML構造から投稿を抽出
    // 注意: XのHTML構造は頻繁に変更されるため、このコードは動作しない可能性があります
    $('article[data-testid="tweet"]').each((_, element) => {
      try {
        const $tweet = $(element);
        
        // 投稿IDを取得
        const tweetLink = $tweet.find('a[href*="/status/"]').attr('href');
        const tweetId = tweetLink?.match(/\/status\/(\d+)/)?.[1] || '';
        
        // 投稿テキストを取得
        const text = $tweet.find('[data-testid="tweetText"]').text().trim();
        
        // エンゲージメント数を取得
        const likesText = $tweet.find('[data-testid="like"]').text().trim();
        const retweetsText = $tweet.find('[data-testid="retweet"]').text().trim();
        const repliesText = $tweet.find('[data-testid="reply"]').text().trim();
        
        // 数値を抽出（"1.2K" → 1200 など）
        const likes = parseEngagementCount(likesText);
        const retweets = parseEngagementCount(retweetsText);
        const replies = parseEngagementCount(repliesText);
        
        if (tweetId && text) {
          posts.push({
            id: tweetId,
            text,
            author: username,
            timestamp: new Date(), // XのHTMLから正確な時刻を取得するのは困難
            likes,
            retweets,
            replies,
            url: `https://x.com/${username}/status/${tweetId}`,
          });
        }
      } catch (error) {
        console.error('Error parsing tweet:', error);
      }
    });

    return posts;
  } catch (error) {
    console.error(`Error scraping @${username}:`, error);
    throw error;
  }
}

/**
 * エンゲージメント数の文字列を数値に変換
 * "1.2K" → 1200, "5M" → 5000000 など
 */
function parseEngagementCount(text: string): number {
  if (!text) return 0;
  
  const cleaned = text.replace(/,/g, '').trim();
  const match = cleaned.match(/^([\d.]+)([KMB]?)$/i);
  
  if (!match) return 0;
  
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  
  switch (unit) {
    case 'K':
      return Math.floor(num * 1000);
    case 'M':
      return Math.floor(num * 1000000);
    case 'B':
      return Math.floor(num * 1000000000);
    default:
      return Math.floor(num);
  }
}

/**
 * 複数のアカウントから投稿を取得（低頻度アクセス）
 * 1日1回程度の使用を想定
 */
export async function scrapeMultipleProfiles(
  usernames: string[],
  delayMs: number = 5000 // アカウント間に5秒待機
): Promise<Map<string, TwitterPost[]>> {
  const results = new Map<string, TwitterPost[]>();
  
  for (let i = 0; i < usernames.length; i++) {
    const username = usernames[i];
    
    try {
      const posts = await scrapeTwitterProfile(username);
      results.set(username, posts);
      
      // 最後のアカウント以外は待機
      if (i < usernames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to scrape @${username}:`, error);
      results.set(username, []);
    }
  }
  
  return results;
}

