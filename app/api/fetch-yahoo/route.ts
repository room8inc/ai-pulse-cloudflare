import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import * as cheerio from 'cheerio';

export const runtime = "edge";

const YAHOO_REALTIME_URL = 'https://search.yahoo.co.jp/realtime';

export async function GET(request: NextRequest) {
  // Cloudflare Pages環境では、envからD1データベースを取得
  const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
  const supabase = createSupabaseClient(env);

  const results = {
    success: 0,
    failed: 0,
    total: 0,
    errors: [] as string[],
    items: [] as any[],
  };

  try {
    const response = await fetch(YAHOO_REALTIME_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Realtime Search Error: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // ランキング要素のセレクタ（変更される可能性があるため注意）
    // 通常は .Ranking_ranking__... のようなクラス名だが、汎用的に探す
    // 注: Yahooのクラス名はハッシュ化されていることが多い
    
    // 簡易的な抽出ロジック（ランキングリストを探す）
    const items: any[] = [];
    
    // [data-testid="ranking-item"] などを探す、あるいは ol li を探す
    $('li').each((i, el) => {
      // 順位、キーワード、URLを取得
      // 構造解析が必要（デバッグしながら調整が必要な部分）
      // ここでは仮の実装として、テキストコンテンツからキーワードらしきものを抽出
      
      const text = $(el).text();
      const link = $(el).find('a').attr('href');
      
      if (link && link.includes('search.yahoo.co.jp/realtime/search')) {
        // キーワード抽出（リンクのパラメータなどから）
        try {
          const urlObj = new URL(link.startsWith('http') ? link : `https://search.yahoo.co.jp${link}`);
          const p = urlObj.searchParams.get('p');
          
          if (p) {
            items.push({
              rank: i + 1, // 正確な順位ではないかもしれない
              keyword: p,
              url: urlObj.toString(),
              fullText: text,
            });
          }
        } catch (e) {
          // URLパースエラーは無視
        }
      }
    });

    // 重複除外と上位20件に絞る
    const uniqueItems = Array.from(new Map(items.map(item => [item.keyword, item])).values()).slice(0, 20);
    results.total = uniqueItems.length;

    for (const item of uniqueItems) {
      // AI関連キーワードによるフィルタリング（オプション）
      // トレンド分析のため、あえてフィルタリングせずに全て保存し、後でAI分析にかけるのもあり
      // ここでは全て保存する

      // 重複チェック（同じキーワードのトレンド入りは1日1回にするなど）
      // ここではURL（検索結果ページ）をキーにする
      const { data: existing } = await supabase
        .from('raw_events')
        .select('id')
        .eq('url', item.url)
        // 過去24時間以内に同じURLが登録されていたらスキップ
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .single();

      if (existing) {
        continue;
      }

      const { error: insertError } = await supabase.from('raw_events').insert({
        source: 'yahoo_realtime',
        source_type: 'trend',
        title: `Trend: ${item.keyword}`,
        content: item.fullText || item.keyword,
        url: item.url,
        author: 'Yahoo! Realtime Search',
        published_at: new Date().toISOString(),
        metadata: JSON.stringify({
          rank: item.rank,
          keyword: item.keyword,
        }),
      });

      if (insertError) {
        console.error(`Error inserting Yahoo trend ${item.keyword}:`, insertError);
        results.failed++;
        results.errors.push(`${item.keyword}: ${String(insertError)}`);
      } else {
        results.success++;
        results.items.push(item);
      }
    }

    // ログ記録
    await supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/fetch-yahoo',
      message: `Fetched ${results.success} Yahoo trends`,
      metadata: JSON.stringify(results),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error) {
    console.error('Error in fetch-yahoo:', error);
    
    await supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/fetch-yahoo',
      message: String(error),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

