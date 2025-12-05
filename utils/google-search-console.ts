/**
 * Google Search Console APIを使用してデータを取得するユーティリティ
 */

import { google } from 'googleapis';

export interface SearchQueryData {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgPosition: number;
  date: string;
}

/**
 * Google Search Consoleから検索クエリデータを取得
 */
export async function fetchSearchConsoleData(
  siteUrl: string,
  credentials: string,
  startDate: string,
  endDate: string
): Promise<SearchQueryData[]> {
  try {
    // 認証情報をパース
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

    // OAuth 2.0クライアントを作成
    const authClient = new google.auth.GoogleAuth({
      credentials: auth,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const searchConsole = google.searchconsole({
      version: 'v1',
      auth: authClient,
    });

    // 検索クエリデータを取得
    const response = await searchConsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'date'],
        rowLimit: 1000,
      },
    });

    const queries: SearchQueryData[] = [];

    if (response.data.rows) {
      for (const row of response.data.rows) {
        const query = row.keys?.[0] || '';
        const date = row.keys?.[1] || startDate;
        const impressions = row.impressions || 0;
        const clicks = row.clicks || 0;
        const ctr = row.ctr || 0;
        const avgPosition = row.position || 0;

        if (query) {
          queries.push({
            query,
            impressions,
            clicks,
            ctr,
            avgPosition,
            date,
          });
        }
      }
    }

    return queries;
  } catch (error) {
    console.error('Error fetching Search Console data:', error);
    throw error;
  }
}

