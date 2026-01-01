import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

export const runtime = "edge";

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// 検索キーワード
const SEARCH_QUERY = 'AI OR 人工知能 OR ChatGPT OR Gemini OR Claude OR LLM OR 生成AI';

export async function GET(request: NextRequest) {
  // Cloudflare Pages環境では、envからD1データベースを取得
  const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
  const supabase = createSupabaseClient(env);
  
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      message: 'YOUTUBE_API_KEY is not set',
    }, { status: 500 });
  }

  const results = {
    success: 0,
    failed: 0,
    total: 0,
    errors: [] as string[],
    items: [] as any[],
  };

  try {
    // 過去24時間の動画を検索
    const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.append('part', 'snippet');
    searchUrl.searchParams.append('q', SEARCH_QUERY);
    searchUrl.searchParams.append('key', apiKey);
    searchUrl.searchParams.append('type', 'video');
    searchUrl.searchParams.append('order', 'viewCount'); // 再生回数順（期間指定と併用時は挙動に注意）
    searchUrl.searchParams.append('publishedAfter', publishedAfter);
    searchUrl.searchParams.append('maxResults', '20');
    searchUrl.searchParams.append('relevanceLanguage', 'ja'); // 日本語の動画を優先

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`YouTube API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const items = data.items || [];
    results.total = items.length;

    for (const item of items) {
      try {
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const description = item.snippet.description;
        const channelTitle = item.snippet.channelTitle;
        const publishedAt = item.snippet.publishedAt;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const thumbnailUrl = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url;

        // 除外フィルタリング（ゲーム実況や無関係な動画）
        // タイトルや説明文に特定のキーワードが含まれていないかチェックしても良い

        // 重複チェック
        const { data: existing } = await supabase
          .from('raw_events')
          .select('id')
          .eq('url', videoUrl)
          .single();

        if (existing) {
          continue;
        }

        // raw_eventsテーブルに挿入
        const { error: insertError } = await supabase.from('raw_events').insert({
          source: 'youtube',
          source_type: 'video',
          title: title,
          content: description,
          url: videoUrl,
          author: channelTitle,
          published_at: publishedAt,
          metadata: JSON.stringify({
            videoId,
            thumbnailUrl,
            channelId: item.snippet.channelId,
          }),
        });

        if (insertError) {
          console.error(`Error inserting YouTube video ${videoId}:`, insertError);
          results.failed++;
          results.errors.push(`${videoId}: ${String(insertError)}`);
        } else {
          results.success++;
          results.items.push({ title, url: videoUrl });
        }

      } catch (itemError) {
        console.error('Error processing YouTube item:', itemError);
        results.failed++;
      }
    }

    // ログ記録
    await supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/fetch-youtube',
      message: `Fetched ${results.success} YouTube videos`,
      metadata: JSON.stringify(results),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('Error in fetch-youtube:', error);
    
    await supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/fetch-youtube',
      message: String(error),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

