/**
 * Google Analytics Data APIを使用してデータを取得するユーティリティ
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';

export interface GAPostData {
  url: string;
  title: string;
  pageViews: number;
  avgTimeOnPage: number;
  bounceRate: number;
  publishedAt: string;
}

/**
 * Google Analyticsからブログ記事のパフォーマンスデータを取得
 */
export async function fetchGAPostData(
  propertyId: string,
  credentials: string,
  startDate: string,
  endDate: string
): Promise<GAPostData[]> {
  try {
    // 認証情報をパース（JSON文字列またはファイルパス）
    let auth;
    try {
      auth = JSON.parse(credentials);
    } catch {
      // JSON文字列でない場合はファイルパスとして扱う
      const fs = await import('fs');
      const path = await import('path');
      const credPath = path.resolve(process.cwd(), credentials);
      auth = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
    }

    // Analytics Data APIクライアントを作成
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: auth,
    });

    // ページビューデータを取得
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
      limit: 1000,
    });

    const posts: GAPostData[] = [];

    if (response.rows) {
      for (const row of response.rows) {
        const pagePath = row.dimensionValues?.[0]?.value || '';
        const pageTitle = row.dimensionValues?.[1]?.value || '';
        const pageViews = parseInt(row.metricValues?.[0]?.value || '0', 10);
        const avgTimeOnPage = parseFloat(row.metricValues?.[1]?.value || '0');
        const bounceRate = parseFloat(row.metricValues?.[2]?.value || '0');

        // ブログ記事のURLのみを対象（必要に応じてフィルタリング）
        if (pagePath && pageViews > 0) {
          posts.push({
            url: pagePath.startsWith('http') ? pagePath : `https://your-blog-domain.com${pagePath}`,
            title: pageTitle,
            pageViews,
            avgTimeOnPage,
            bounceRate,
            publishedAt: endDate, // 実際の公開日は別途取得が必要
          });
        }
      }
    }

    return posts;
  } catch (error) {
    console.error('Error fetching GA data:', error);
    throw error;
  }
}

