import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000, // 10秒タイムアウト
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; AI-Pulse/1.0)',
  },
});

export interface ParsedRSSItem {
  title: string;
  content?: string;
  contentSnippet?: string;
  link?: string;
  pubDate?: string;
  author?: string;
  categories?: string[];
}

/**
 * RSSフィードを取得してパースする
 */
export async function fetchRSSFeed(url: string): Promise<ParsedRSSItem[]> {
  try {
    const feed = await parser.parseURL(url);
    
    if (!feed.items || feed.items.length === 0) {
      return [];
    }

    return feed.items.map((item) => ({
      title: item.title || '',
      content: item.content,
      contentSnippet: item.contentSnippet,
      link: item.link,
      pubDate: item.pubDate,
      author: item.creator || item.author,
      categories: item.categories,
    }));
  } catch (error) {
    console.error(`Error fetching RSS feed ${url}:`, error);
    throw error;
  }
}

