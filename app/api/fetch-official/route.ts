import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { OFFICIAL_RSS_FEEDS } from '@/lib/rss-feeds';
import { fetchRSSFeed } from '@/utils/rss-parser';

/**
 * 公式ニュース（RSS/API）を取得するAPI
 * Cron: 毎時実行
 * 
 * 対象:
 * - OpenAI Blog
 * - Anthropic Blog
 * - Google DeepMind
 * - xAI
 * - Microsoft AI Blog
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
    // 各RSSフィードを取得
    for (const feed of OFFICIAL_RSS_FEEDS) {
      try {
        const items = await fetchRSSFeed(feed.url);
        results.total += items.length;

        // 各アイテムをraw_eventsテーブルに保存
        for (const item of items) {
          // 重複チェック（URLが既に存在するか）
          if (item.link) {
            const { data: existing } = await supabase
              .from('raw_events')
              .select('id')
              .eq('url', item.link)
              .eq('source', feed.source)
              .single();

            if (existing) {
              // 既に存在する場合はスキップ
              continue;
            }
          }

          // published_atをパース
          let publishedAt: Date | null = null;
          if (item.pubDate) {
            publishedAt = new Date(item.pubDate);
            // 無効な日付の場合はnull
            if (isNaN(publishedAt.getTime())) {
              publishedAt = null;
            }
          }

          // raw_eventsテーブルに挿入
          const { error: insertError } = await supabase
            .from('raw_events')
            .insert({
              source: feed.source,
              source_type: 'official',
              title: item.title,
              content: item.content || item.contentSnippet || '',
              url: item.link || null,
              author: item.author || null,
              published_at: publishedAt?.toISOString() || null,
              metadata: {
                categories: item.categories || [],
                feed_name: feed.name,
              },
            });

          if (insertError) {
            console.error(`Error inserting item from ${feed.name}:`, insertError);
            results.failed++;
            results.errors.push(`${feed.name}: ${insertError.message}`);
          } else {
            results.success++;
          }
        }
      } catch (error) {
        console.error(`Error fetching ${feed.name}:`, error);
        results.failed++;
        results.errors.push(
          `${feed.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // ログを記録
    await supabase.from('logs').insert({
      level: results.failed > 0 ? 'warning' : 'info',
      endpoint: '/api/fetch-official',
      message: `Fetched ${results.success} items, ${results.failed} failed`,
      metadata: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'fetch-official completed',
      data: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      },
    });
  } catch (error) {
    console.error('Error in fetch-official:', error);

    // エラーログを記録
    await supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/fetch-official',
      message: error instanceof Error ? error.message : 'Unknown error',
      metadata: { error: String(error) },
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

