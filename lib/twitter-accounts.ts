/**
 * 監視するTwitter/Xアカウントのリスト
 * これらのアカウントの投稿を取得し、エンゲージメント（反応率）で優先度を判定
 */

export interface TwitterAccount {
  username: string;
  name: string;
  category: 'official' | 'developer' | 'news' | 'influencer' | 'community';
  priority: 'high' | 'medium' | 'low';
}

export const MONITORED_TWITTER_ACCOUNTS: TwitterAccount[] = [
  // 公式アカウント（高優先度）
  {
    username: 'OpenAI',
    name: 'OpenAI',
    category: 'official',
    priority: 'high',
  },
  {
    username: 'OpenAIDevs',
    name: 'OpenAI Developers',
    category: 'developer',
    priority: 'high',
  },
  {
    username: 'OpenAINewsroom',
    name: 'OpenAI Newsroom',
    category: 'news',
    priority: 'high',
  },
  {
    username: 'anthropicai',
    name: 'Anthropic',
    category: 'official',
    priority: 'high',
  },
  {
    username: 'claudeai',
    name: 'Claude AI',
    category: 'official',
    priority: 'high',
  },
  {
    username: 'GeminiApp',
    name: 'Google Gemini',
    category: 'official',
    priority: 'high',
  },
  {
    username: 'GoogleWorkspace',
    name: 'Google Workspace',
    category: 'official',
    priority: 'medium',
  },
  {
    username: 'grok',
    name: 'Grok',
    category: 'official',
    priority: 'high',
  },
  
  // ニュース・メディア（中優先度）
  {
    username: 'itmedia_news',
    name: 'ITmedia NEWS',
    category: 'news',
    priority: 'medium',
  },
  
  // インフルエンサー・コミュニティ（中優先度）
  {
    username: 'sama',
    name: 'Sam Altman',
    category: 'influencer',
    priority: 'high',
  },
  {
    username: 'elonmusk',
    name: 'Elon Musk',
    category: 'influencer',
    priority: 'medium',
  },
  {
    username: 'kosuke_agos',
    name: '小助川 剛',
    category: 'influencer',
    priority: 'medium',
  },
  {
    username: 'SuguruKun_ai',
    name: 'SuguruKun AI',
    category: 'influencer',
    priority: 'medium',
  },
  {
    username: 'The_AGI_WAY',
    name: 'The AGI Way',
    category: 'community',
    priority: 'medium',
  },
  {
    username: 'GithubProjects',
    name: 'GitHub Projects',
    category: 'community',
    priority: 'low',
  },
];

/**
 * アカウントのユーザーIDを取得（Twitter API v2を使用）
 * 注意: ユーザー名からユーザーIDを取得するには、別途API呼び出しが必要
 */
export async function getUserIds(
  usernames: string[],
  bearerToken: string
): Promise<Map<string, string>> {
  const userIdMap = new Map<string, string>();
  
  try {
    // ユーザー名をカンマ区切りで結合
    const usernamesParam = usernames.join(',');
    const response = await fetch(
      `https://api.twitter.com/2/users/by?usernames=${usernamesParam}`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`Twitter API Error: ${response.status}`);
    }

    const data = await response.json();
    const users = data.data || [];

    for (const user of users) {
      userIdMap.set(user.username.toLowerCase(), user.id);
    }
  } catch (error) {
    console.error('Error fetching user IDs:', error);
  }

  return userIdMap;
}

