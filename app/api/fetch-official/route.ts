import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

export const runtime = "edge";

interface Article {
  title: string;
  url: string;
  date: string;
  content: string;
  source: string;
}

// ソース定義
const SOURCES = [
  {
    id: 'openai',
    name: 'OpenAI',
    url: 'https://openai.com/news',
    type: 'html',
    // OpenAIのHTML構造に合わせた正規表現（状況により変更の可能性あり）
    regex: {
      item: /<div[^>]*class="[^"]*ui-link-group[^"]*"[^>]*>([\s\S]*?)<\/div>/g, // 記事ブロック
      title: /<h3[^>]*>([\s\S]*?)<\/h3>/,
      url: /href="([^"]*)"/,
      date: /<span[^>]*>([A-Za-z]+ \d{1,2}, \d{4})<\/span>/ // Nov 6, 2023 形式
    }
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    url: 'https://www.anthropic.com/news',
    type: 'html',
    regex: {
      item: /<a[^>]*href="\/news\/[^"]*"[^>]*class="[^"]*PostCard[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
      title: /<h3[^>]*>([\s\S]*?)<\/h3>/,
      url: /href="(\/news\/[^"]*)"/,
      date: /<div[^>]*>([A-Za-z]+ \d{1,2}, \d{4})<\/div>/
    }
  },
  {
    id: 'google_deepmind',
    name: 'Google DeepMind',
    url: 'https://deepmind.google/blog/rss.xml',
    type: 'rss'
  },
  {
    id: 'microsoft_ai',
    name: 'Microsoft AI',
    url: 'https://blogs.microsoft.com/ai/feed/',
    type: 'rss'
  },
  {
    id: 'nvidia',
    name: 'NVIDIA Blog',
    url: 'https://blogs.nvidia.com/blog/category/deep-learning/feed/',
    type: 'rss'
  }
];

// 簡易RSSパーサー（正規表現ベース）
async function fetchRss(source: any): Promise<Article[]> {
  try {
    const response = await fetch(source.url, { next: { revalidate: 3600 } });
    if (!response.ok) throw new Error(`Failed to fetch RSS: ${response.status}`);
    const xml = await response.text();
    
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1];
      const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent);
      const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);
      const dateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent);
      const descMatch = /<description>([\s\S]*?)<\/description>/.exec(itemContent);
      
      if (titleMatch && linkMatch) {
        // CDATAセクションの除去
        const clean = (str: string) => str.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        
        items.push({
          title: clean(titleMatch[1]),
          url: clean(linkMatch[1]),
          date: dateMatch ? new Date(clean(dateMatch[1])).toISOString() : new Date().toISOString(),
          content: descMatch ? clean(descMatch[1]).substring(0, 200) + '...' : '',
          source: source.name
        });
      }
    }
    return items.slice(0, 5); // 最新5件のみ
  } catch (e) {
    console.error(`Error fetching RSS for ${source.name}:`, e);
    return [];
  }
}

// 簡易HTMLスクレイパー（正規表現ベース）
async function fetchHtml(source: any): Promise<Article[]> {
  try {
    const response = await fetch(source.url, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Pulse-Bot/1.0)' },
      next: { revalidate: 3600 } 
    });
    if (!response.ok) throw new Error(`Failed to fetch HTML: ${response.status}`);
    const html = await response.text();
    
    const items = [];
    // サイトごとに異なるロジックが必要だが、ここでは簡易的に実装
    // 実際にはサイト構造が変わると壊れるため、保守が必要
    
    // 汎用的なフォールバック：titleタグとOpenGraphタグを探す
    // ※本格的なスクレイピングは難しいので、RSSがないサイトは重要度を下げてエラーでも進むようにする
    return []; 
    
  } catch (e) {
    console.error(`Error fetching HTML for ${source.name}:`, e);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
  const supabase = createSupabaseClient(env);
  
  const results = {
    success: 0,
    failed: 0,
    items: [] as Article[],
    errors: [] as string[]
  };

  try {
    const fetchPromises = SOURCES.map(async (source) => {
      try {
        let articles: Article[] = [];
        if (source.type === 'rss') {
          articles = await fetchRss(source);
        } else {
          // HTMLスクレイピングは不安定なため、今回はスキップ（実装準備のみ）
          // articles = await fetchHtml(source);
          console.log(`Skipping HTML source: ${source.name}`);
        }

        if (articles.length > 0) {
          results.items.push(...articles);
          
          // DB保存
          for (const article of articles) {
            // 重複チェック
            const { data: existing } = await supabase
              .from('raw_events')
              .select('id')
              .eq('url', article.url)
              .single();

            if (existing) continue;

            const { error } = await supabase.from('raw_events').insert({
              source: 'official_blog',
              source_type: 'blog',
              title: article.title,
              content: article.content,
              url: article.url,
              author: article.source,
              published_at: article.date,
              metadata: JSON.stringify({ source_id: source.id })
            });
            
            if (!error) results.success++;
          }
        }
      } catch (e) {
        console.error(`Error processing ${source.name}:`, e);
        results.failed++;
        results.errors.push(`${source.name}: ${String(e)}`);
      }
    });

    await Promise.all(fetchPromises);

    // ログ保存
    await supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/fetch-official',
      message: `Fetched ${results.success} official articles`,
      metadata: JSON.stringify({ success: results.success, failed: results.failed }),
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, data: results });

  } catch (error) {
    console.error('Fatal error in fetch-official:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
