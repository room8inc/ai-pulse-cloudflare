import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import { ALL_RSS_FEEDS } from '@/lib/rss-feeds';
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
    // 最新7日間のみ取得（古い情報を除外）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    // 各RSSフィードを取得（公式 + メディア）
    for (const feed of ALL_RSS_FEEDS) {
      try {
        const items = await fetchRSSFeed(feed.url);
        results.total += items.length;

        // 各アイテムをraw_eventsテーブルに保存
        for (const item of items) {
          // 重複チェック（URLが既に存在するか）
          if (item.link) {
            const { data: existing } = supabase
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
          
          // 最新7日間の情報のみ取得（古い情報を除外）
          if (publishedAt && publishedAt < sevenDaysAgo) {
            continue; // 7日より古い情報はスキップ
          }
          
          // 日付がない場合は、現在時刻から7日以内と仮定（RSSフィードの最新情報として扱う）
          if (!publishedAt) {
            publishedAt = new Date(); // 日付がない場合は現在時刻を使用
          }

          // 重要度フィルタリング
          const title = (item.title || '').toLowerCase();
          const content = ((item.content || item.contentSnippet || '') + ' ' + title).toLowerCase();
          
          // 公式発表の場合: アップデート情報とガイドのみを優先
          if (feed.type === 'official') {
            const isUpdate = 
              title.includes('update') || title.includes('release') || title.includes('アップデート') ||
              title.includes('new') || title.includes('announcing') || title.includes('introducing') ||
              title.includes('version') || title.includes('v') && /\d/.test(title);
            
            const isGuide = 
              title.includes('guide') || title.includes('how to') || title.includes('使い方') ||
              title.includes('tutorial') || title.includes('チュートリアル') || title.includes('ガイド') ||
              title.includes('best practices') || title.includes('ベストプラクティス');
            
            // アップデート情報でもガイドでもない場合は優先度を下げる
            if (!isUpdate && !isGuide) {
              // ビジネスニュースや一般的な発表は除外
              const isBusinessNews = 
                title.includes('partnership') || title.includes('collaboration') || title.includes('提携') ||
                title.includes('協業') || title.includes('acquisition') || title.includes('買収') ||
                title.includes('investment') || title.includes('投資') || title.includes('funding');
              
              if (isBusinessNews) {
                continue; // ビジネスニュースは除外
              }
            }
          }
          
          // メディアの場合: 実践的な情報を優先
          if (feed.type === 'media') {
            const isPractical = 
              title.includes('使い方') || title.includes('コツ') || title.includes('使える') ||
              title.includes('使いこなす') || title.includes('実践') || title.includes('プロ') ||
              title.includes('how to') || title.includes('guide') || title.includes('tips') ||
              title.includes('performance') || title.includes('性能') || title.includes('比較') ||
              title.includes('evaluation') || title.includes('評価') || title.includes('レビュー');
            
            // ビジネスニュースを除外
            const isBusinessNews = 
              title.includes('協業') || title.includes('提携') || title.includes('partnership') ||
              title.includes('collaboration') || title.includes('買収') || title.includes('acquisition') ||
              title.includes('投資') || title.includes('investment') || title.includes('funding');
            
            // 実践的な情報でない、またはビジネスニュースの場合は除外
            if (!isPractical || isBusinessNews) {
              continue;
            }
          }

          // raw_eventsテーブルに挿入
          const { error: insertError } = supabase
            .from('raw_events')
            .insert({
              source: feed.source,
              source_type: feed.type === 'official' ? 'official' : 'media',
              title: item.title,
              content: item.content || item.contentSnippet || '',
              url: item.link || null,
              author: item.author || null,
              published_at: publishedAt?.toISOString() || null,
              metadata: JSON.stringify({
                categories: item.categories || [],
                feed_name: feed.name,
                feed_type: feed.type,
                feed_priority: feed.priority,
              }),
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
    supabase.from('logs').insert({
      level: results.failed > 0 ? 'warning' : 'info',
      endpoint: '/api/fetch-official',
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
    supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/fetch-official',
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

