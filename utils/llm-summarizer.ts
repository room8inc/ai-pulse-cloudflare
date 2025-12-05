/**
 * LLMを使用したサマリー生成ユーティリティ
 */

export interface SummaryInput {
  official: any[];
  community: any[];
  trends: any[];
}

export interface BlogIdea {
  title: string;
  summary: string;
  content: string;
  sources: string[];
  priority: 'high' | 'medium' | 'low';
}

/**
 * LLMで統合サマリーを生成
 * 注: 実際のLLM API呼び出しは後で実装（現時点ではテンプレートベース）
 */
export async function generateSummary(input: SummaryInput): Promise<{
  summary: string;
  blogIdeas: BlogIdea[];
}> {
  // TODO: 実際のLLM API（OpenAI/Anthropic/Gemini）を呼び出す
  // 現時点では、テンプレートベースのサマリーを生成

  const officialCount = input.official.length;
  const communityCount = input.community.length;
  const trendsCount = input.trends.length;

  const summary = `
## 今日のサマリー

### 公式情報
- ${officialCount}件の公式アップデートを取得

### コミュニティの声
- ${communityCount}件のコミュニティ投稿を取得

### トレンド
- ${trendsCount}件の急上昇キーワードを検出

### 注目すべきトピック
${input.trends
  .slice(0, 5)
  .map((t: any) => `- ${t.keyword}: ${t.growthRate.toFixed(1)}% 増加`)
  .join('\n')}
`;

  // ブログ候補を生成（簡易版）
  const blogIdeas: BlogIdea[] = [];

  // 公式情報からブログ候補を生成
  for (const item of input.official.slice(0, 3)) {
    blogIdeas.push({
      title: item.title || '公式アップデート',
      summary: `公式情報: ${item.source}`,
      content: item.content || item.title || '',
      sources: [item.id],
      priority: 'high' as const,
    });
  }

  // 急上昇トレンドからブログ候補を生成
  for (const trend of input.trends.slice(0, 2)) {
    blogIdeas.push({
      title: `${trend.keyword}の急上昇トレンド`,
      summary: `成長率: ${trend.growthRate.toFixed(1)}%`,
      content: `${trend.keyword}に関する言及が急増しています。`,
      sources: [],
      priority: trend.growthRate > 100 ? ('high' as const) : ('medium' as const),
    });
  }

  return { summary, blogIdeas };
}

