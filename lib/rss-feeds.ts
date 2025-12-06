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
 * 注意: 公式ブログは日々更新されるわけではない（時々重要なアップデート情報のみ）
 * 優先度を下げ、アップデート情報とガイドのみを取得
 */
export const OFFICIAL_RSS_FEEDS: RSSFeed[] = [
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog/rss.xml',
    source: 'openai',
    type: 'official',
    priority: 'medium', // 公式ブログは補完的に
  },
  {
    name: 'Anthropic Blog',
    url: 'https://www.anthropic.com/news/rss',
    source: 'anthropic',
    type: 'official',
    priority: 'medium',
  },
  {
    name: 'Google DeepMind',
    url: 'https://deepmind.google/discover/blog/rss.xml',
    source: 'google-deepmind',
    type: 'official',
    priority: 'medium',
  },
  {
    name: 'xAI',
    url: 'https://x.ai/blog/rss.xml',
    source: 'xai',
    type: 'official',
    priority: 'medium',
  },
  {
    name: 'Microsoft AI Blog',
    url: 'https://blogs.microsoft.com/ai/feed/',
    source: 'microsoft-ai',
    type: 'official',
    priority: 'medium',
  },
];

/**
 * メディアソースのRSSフィード
 * 日々更新されるIT系メディアを優先（実践的な情報を提供）
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
    priority: 'high',
  },
  {
    name: '@IT',
    url: 'https://atmarkit.itmedia.co.jp/rss/ait.xml', // ITエキスパート向け
    source: 'at-it',
    type: 'media',
    priority: 'high',
  },
  {
    name: 'CodeZine',
    url: 'https://codezine.jp/rss/new/20/index.xml', // エンジニア向け技術情報
    source: 'codezine',
    type: 'media',
    priority: 'high',
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
 * すべてのRSSフィード
 * メディアソースを優先的に処理（日々更新されるため）
 * 公式ブログは補完的に（時々重要なアップデート情報のみ）
 */
export const ALL_RSS_FEEDS: RSSFeed[] = [
  // メディアソースを先に（優先的に処理）
  ...MEDIA_RSS_FEEDS,
  // 公式ブログは後（補完的に）
  ...OFFICIAL_RSS_FEEDS,
];

