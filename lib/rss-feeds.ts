/**
 * RSSフィード設定
 * 公式発表とメディアソースを含む
 */
export interface RSSFeed {
  name: string;
  url: string;
  source: string;
  type: 'official' | 'media'; // 公式発表 or メディア
  priority: 'high' | 'medium' | 'low'; // 優先度
}

/**
 * 公式発表のRSSフィード
 * 重要: アップデート情報とガイドのみを優先
 */
export const OFFICIAL_RSS_FEEDS: RSSFeed[] = [
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog/rss.xml',
    source: 'openai',
    type: 'official',
    priority: 'high',
  },
  {
    name: 'Anthropic Blog',
    url: 'https://www.anthropic.com/news/rss',
    source: 'anthropic',
    type: 'official',
    priority: 'high',
  },
  {
    name: 'Google DeepMind',
    url: 'https://deepmind.google/discover/blog/rss.xml',
    source: 'google-deepmind',
    type: 'official',
    priority: 'high',
  },
  {
    name: 'xAI',
    url: 'https://x.ai/blog/rss.xml',
    source: 'xai',
    type: 'official',
    priority: 'high',
  },
  {
    name: 'Microsoft AI Blog',
    url: 'https://blogs.microsoft.com/ai/feed/',
    source: 'microsoft-ai',
    type: 'official',
    priority: 'high',
  },
];

/**
 * メディアソースのRSSフィード
 * 実践的な情報を提供するメディアを優先
 */
export const MEDIA_RSS_FEEDS: RSSFeed[] = [
  {
    name: 'ITmedia NEWS',
    url: 'https://rss.itmedia.co.jp/rss/2.0/ait.xml', // AI/IT関連
    source: 'itmedia',
    type: 'media',
    priority: 'high',
  },
  {
    name: 'ITmedia Enterprise',
    url: 'https://rss.itmedia.co.jp/rss/2.0/enterprise.xml',
    source: 'itmedia-enterprise',
    type: 'media',
    priority: 'medium',
  },
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    source: 'techcrunch',
    type: 'media',
    priority: 'high',
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    source: 'theverge',
    type: 'media',
    priority: 'medium',
  },
];

/**
 * すべてのRSSフィード（公式 + メディア）
 */
export const ALL_RSS_FEEDS: RSSFeed[] = [
  ...OFFICIAL_RSS_FEEDS,
  ...MEDIA_RSS_FEEDS,
];

