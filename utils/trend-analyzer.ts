/**
 * トレンド分析ユーティリティ
 */

export interface TrendResult {
  keyword: string;
  trendType: 'keyword' | 'sentiment' | 'mention_count' | 'arena_score';
  value: number;
  previousValue: number;
  growthRate: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * 過去N日間のデータと比較してトレンドを算出
 */
export function calculateTrend(
  currentCount: number,
  previousCount: number
): number {
  if (previousCount === 0) {
    return currentCount > 0 ? 100 : 0; // 新規出現
  }
  return ((currentCount - previousCount) / previousCount) * 100;
}

/**
 * キーワードの言及数をカウント
 */
export function countKeywordMentions(
  events: any[],
  keyword: string
): number {
  const keywordLower = keyword.toLowerCase();
  return events.filter((event) => {
    const title = (event.title || '').toLowerCase();
    const content = (event.content || '').toLowerCase();
    return title.includes(keywordLower) || content.includes(keywordLower);
  }).length;
}

/**
 * 急上昇キーワードを検出
 */
export function detectRisingKeywords(
  currentEvents: any[],
  previousEvents: any[],
  minGrowthRate: number = 50
): Array<{ keyword: string; growthRate: number; currentCount: number }> {
  // 主要なAI関連キーワード
  const keywords = [
    'GPT-4',
    'Claude',
    'Anthropic',
    'OpenAI',
    'LLM',
    'Gemini',
    'xAI',
    'Mistral',
    'Llama',
  ];

  const results: Array<{
    keyword: string;
    growthRate: number;
    currentCount: number;
  }> = [];

  for (const keyword of keywords) {
    const currentCount = countKeywordMentions(currentEvents, keyword);
    const previousCount = countKeywordMentions(previousEvents, keyword);
    const growthRate = calculateTrend(currentCount, previousCount);

    if (growthRate >= minGrowthRate && currentCount > 0) {
      results.push({ keyword, growthRate, currentCount });
    }
  }

  // 成長率でソート
  return results.sort((a, b) => b.growthRate - a.growthRate);
}

