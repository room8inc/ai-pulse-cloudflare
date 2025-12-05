/**
 * コミュニティソースからデータを取得するユーティリティ
 */

export interface CommunityItem {
  title: string;
  content?: string;
  url: string;
  author: string;
  score: number;
  publishedAt: Date;
  source: string;
  platform: string;
}

/**
 * Redditからデータを取得
 */
export async function fetchReddit(subreddit: string, url: string): Promise<CommunityItem[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AI-Pulse/1.0 (by /u/ai-pulse)',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Reddit API Error: ${response.status}`);
    }

    const data = await response.json();
    const posts = data.data?.children || [];

    return posts
      .map((post: any) => {
        const postData = post.data;
        return {
          title: postData.title || '',
          content: postData.selftext || '',
          url: `https://www.reddit.com${postData.permalink}`,
          author: postData.author || 'unknown',
          score: postData.score || 0,
          publishedAt: new Date(postData.created_utc * 1000),
          source: 'reddit',
          platform: subreddit,
        };
      })
      .filter((item: CommunityItem) => item.title.length > 0);
  } catch (error) {
    console.error(`Error fetching Reddit ${subreddit}:`, error);
    throw error;
  }
}

/**
 * HackerNewsからデータを取得
 */
export async function fetchHackerNews(keywords: string[]): Promise<CommunityItem[]> {
  try {
    const items: CommunityItem[] = [];

    // 各キーワードで検索
    for (const keyword of keywords) {
      const response = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&numericFilters=created_at_i>${Math.floor(Date.now() / 1000) - 86400}`,
        {
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        continue; // エラー時はスキップ
      }

      const data = await response.json();
      const hits = data.hits || [];

      for (const hit of hits) {
        items.push({
          title: hit.title || hit.story_title || '',
          content: hit.comment_text || '',
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          author: hit.author || 'unknown',
          score: hit.points || 0,
          publishedAt: new Date(hit.created_at_i * 1000),
          source: 'hackernews',
          platform: 'hackernews',
        });
      }
    }

    // 重複を除去（URLベース）
    const uniqueItems = items.filter(
      (item, index, self) => index === self.findIndex((t) => t.url === item.url)
    );

    return uniqueItems;
  } catch (error) {
    console.error('Error fetching HackerNews:', error);
    throw error;
  }
}

/**
 * HuggingFace Discussionsからデータを取得
 */
export async function fetchHuggingFace(): Promise<CommunityItem[]> {
  try {
    // HuggingFace Discussions APIは限定的なので、主要なモデルのページをスクレイピング
    // 簡易実装: 主要モデルのDiscussionsページを取得
    const models = ['openai/gpt-4', 'meta-llama/Llama-2-7b-hf', 'mistralai/Mistral-7B-v0.1'];
    const items: CommunityItem[] = [];

    for (const model of models) {
      try {
        const response = await fetch(
          `https://huggingface.co/api/models/${model}/discussions`,
          {
            signal: AbortSignal.timeout(10000),
          }
        );

        if (!response.ok) {
          continue;
        }

        const discussions = await response.json();

        if (Array.isArray(discussions)) {
          for (const discussion of discussions.slice(0, 10)) {
            items.push({
              title: discussion.title || '',
              content: discussion.content || '',
              url: `https://huggingface.co/${model}/discussions/${discussion.id}`,
              author: discussion.author || 'unknown',
              score: discussion.numReplies || 0,
              publishedAt: new Date(discussion.createdAt || Date.now()),
              source: 'huggingface',
              platform: model,
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching HuggingFace ${model}:`, error);
        // エラー時はスキップして続行
      }
    }

    return items;
  } catch (error) {
    console.error('Error fetching HuggingFace:', error);
    throw error;
  }
}

/**
 * GitHub Issuesからデータを取得（主要なAIリポジトリ）
 */
export async function fetchGitHubIssues(repo: string): Promise<CommunityItem[]> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues?state=open&sort=updated&per_page=20`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Pulse/1.0',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API Error: ${response.status}`);
    }

    const issues = await response.json();

    return issues
      .filter((issue: any) => !issue.pull_request) // PRは除外
      .map((issue: any) => ({
        title: issue.title || '',
        content: issue.body || '',
        url: issue.html_url || '',
        author: issue.user?.login || 'unknown',
        score: issue.comments || 0,
        publishedAt: new Date(issue.created_at),
        source: 'github',
        platform: repo,
      }));
  } catch (error) {
    console.error(`Error fetching GitHub Issues ${repo}:`, error);
    throw error;
  }
}

