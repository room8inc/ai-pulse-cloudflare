/**
 * コミュニティソースの設定
 */
export interface CommunitySource {
  name: string;
  type: 'reddit' | 'hackernews' | 'huggingface' | 'github';
  url: string;
  subreddit?: string; // Reddit用
  repo?: string; // GitHub用
  keywords?: string[]; // 検索キーワード
}

export const COMMUNITY_SOURCES: CommunitySource[] = [
  // Reddit
  {
    name: 'Reddit - MachineLearning',
    type: 'reddit',
    url: 'https://www.reddit.com/r/MachineLearning/hot.json',
    subreddit: 'MachineLearning',
  },
  {
    name: 'Reddit - LocalLLaMA',
    type: 'reddit',
    url: 'https://www.reddit.com/r/LocalLLaMA/hot.json',
    subreddit: 'LocalLLaMA',
  },
  {
    name: 'Reddit - OpenAI',
    type: 'reddit',
    url: 'https://www.reddit.com/r/OpenAI/hot.json',
    subreddit: 'OpenAI',
  },
  {
    name: 'Reddit - singularity',
    type: 'reddit',
    url: 'https://www.reddit.com/r/singularity/hot.json',
    subreddit: 'singularity',
  },
  // HackerNews
  {
    name: 'HackerNews - AI/ML',
    type: 'hackernews',
    url: 'https://hn.algolia.com/api/v1/search',
    keywords: ['AI', 'machine learning', 'LLM', 'GPT', 'Claude', 'Anthropic', 'OpenAI'],
  },
  // HuggingFace (Discussions)
  {
    name: 'HuggingFace Discussions',
    type: 'huggingface',
    url: 'https://huggingface.co/api/discussions',
  },
];

