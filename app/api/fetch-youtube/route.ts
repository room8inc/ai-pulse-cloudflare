import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

export const runtime = "edge";

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// 検索キーワード（API制限を考慮し、主要なトレンドワードに絞り込み）
// ユーザー提供リストから重要度の高いものを選定
const SEARCH_QUERY = 'AI OR 人工知能 OR ChatGPT OR Gemini OR Claude OR LLM OR Stable Diffusion OR Midjourney OR Sora OR Copilot OR GPT-4o OR Anthropic OR OpenAI OR Google AI OR Microsoft AI OR NVIDIA AI OR AIツール OR AIニュース OR AIトレンド OR AI技術';

export async function GET(request: NextRequest) {
  try {
    // Cloudflare Pages環境では、envからD1データベースと環境変数を取得
    const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
    
    // 環境変数の取得（envを優先、ローカル用にprocess.envもフォールバックとして残す）
    const apiKey = env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
    
    // DBクライアントの初期化
    const supabase = createSupabaseClient(env);

    if (!apiKey) {
      console.error('YOUTUBE_API_KEY is not set');
      return NextResponse.json({
        success: false,
        message: 'YOUTUBE_API_KEY is not set. Please check your environment variables.',
      }, { status: 500 });
    }

    const results = {
      success: 0,
      failed: 0,
      total: 0,
      errors: [] as string[],
      items: [] as any[],
    };

    // 過去24時間の動画を検索
    const publishedAfter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.append('part', 'snippet');
    searchUrl.searchParams.append('q', SEARCH_QUERY);
    searchUrl.searchParams.append('key', apiKey);
    searchUrl.searchParams.append('type', 'video');
    searchUrl.searchParams.append('order', 'viewCount'); // 過去24時間で再生数が多い順
    searchUrl.searchParams.append('publishedAfter', publishedAfter);
    searchUrl.searchParams.append('maxResults', '30'); // フィルタリングで減ることを考慮して多めに取得
    searchUrl.searchParams.append('relevanceLanguage', 'ja'); // 日本語の動画を優先

    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`YouTube API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const items = data.items || [];
    results.total = items.length;

    // 除外キーワード（ブログネタとして適切でないものを除外）
    const EXCLUDE_KEYWORDS = ['切り抜き', '歌ってみた', 'ゲーム実況', '配信', '反応集', 'まとめ', 'ライブ', 'LIVE'];

    for (const item of items) {
      try {
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const description = item.snippet.description;
        const channelTitle = item.snippet.channelTitle;
        const publishedAt = item.snippet.publishedAt;
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const thumbnailUrl = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url;

        // 除外フィルタリング
        const isExcluded = EXCLUDE_KEYWORDS.some(keyword => 
          title.includes(keyword) || description.includes(keyword)
        );

        if (isExcluded) {
          console.log(`Skipped excluded video: ${title}`);
          continue;
        }

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
      message: `Fetched ${results.success} YouTube videos (Total: ${results.total}, Failed: ${results.failed})`,
      metadata: JSON.stringify(results),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('Error in fetch-youtube:', error);
    
    // DB接続エラーなどでログが書けない場合も考慮してtry-catch
    try {
      const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
      const supabase = createSupabaseClient(env);
      await supabase.from('logs').insert({
        level: 'error',
        endpoint: '/api/fetch-youtube',
        message: String(error),
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to write error log:', e);
    }

    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}
