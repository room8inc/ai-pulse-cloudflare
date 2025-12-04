/**
 * 公式ニュースのRSSフィード設定
 */
export interface RSSFeed {
  name: string;
  url: string;
  source: string;
}

export const OFFICIAL_RSS_FEEDS: RSSFeed[] = [
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog/rss.xml',
    source: 'openai',
  },
  {
    name: 'Anthropic Blog',
    url: 'https://www.anthropic.com/news/rss',
    source: 'anthropic',
  },
  {
    name: 'Google DeepMind',
    url: 'https://deepmind.google/discover/blog/rss.xml',
    source: 'google-deepmind',
  },
  {
    name: 'xAI',
    url: 'https://x.ai/blog/rss.xml',
    source: 'xai',
  },
  {
    name: 'Microsoft AI Blog',
    url: 'https://blogs.microsoft.com/ai/feed/',
    source: 'microsoft-ai',
  },
];

