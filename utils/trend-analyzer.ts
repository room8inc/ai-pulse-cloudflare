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
 * 急上昇キーワードを検出（固定リスト + 動的抽出）
 */
export function detectRisingKeywords(
  currentEvents: any[],
  previousEvents: any[],
  minGrowthRate: number = 50
): Array<{ keyword: string; growthRate: number; currentCount: number }> {
  // 主要なAI関連キーワード（固定リスト）
  // 注意: 具体的なモデル名（GPT-4、Claude-3など）は含めない
  // モデル名は進化するため、動的抽出で検出する
  const fixedKeywords = [
    // 会社名・組織名
    'OpenAI',
    'Anthropic',
    'Google',
    'DeepMind',
    'xAI',
    'Meta',
    'Microsoft',
    // 技術カテゴリ
    'LLM',
    'Agent',
    'RAG',
    'Fine-tuning',
    'Prompt Engineering',
    'Multimodal',
    'API',
  ];

  const results: Array<{
    keyword: string;
    growthRate: number;
    currentCount: number;
  }> = [];

  // 固定キーワードの分析
  for (const keyword of fixedKeywords) {
    const currentCount = countKeywordMentions(currentEvents, keyword);
    const previousCount = countKeywordMentions(previousEvents, keyword);
    const growthRate = calculateTrend(currentCount, previousCount);

    if (growthRate >= minGrowthRate && currentCount > 0) {
      results.push({ keyword, growthRate, currentCount });
    }
  }

  // 動的キーワード抽出（タイトルから頻出語を抽出）
  const dynamicKeywords = extractDynamicKeywords(currentEvents, previousEvents);
  for (const { keyword, currentCount, previousCount } of dynamicKeywords) {
    const growthRate = calculateTrend(currentCount, previousCount);
    if (growthRate >= minGrowthRate && currentCount >= 3) {
      // 既に固定リストに含まれている場合はスキップ
      if (!fixedKeywords.some((k) => k.toLowerCase() === keyword.toLowerCase())) {
        results.push({ keyword, growthRate, currentCount });
      }
    }
  }

  // 成長率でソート
  return results.sort((a, b) => b.growthRate - a.growthRate).slice(0, 20); // 上位20件
}

/**
 * タイトルから動的にキーワードを抽出
 * モデル名（GPT-X、Claude-Xなど）も自動検出
 */
function extractDynamicKeywords(
  currentEvents: any[],
  previousEvents: any[]
): Array<{ keyword: string; currentCount: number; previousCount: number }> {
  // モデル名パターンを検出（GPT-4、Claude-3.5、Gemini Proなど）
  const extractModelNames = (events: any[]): Map<string, number> => {
    const modelCount = new Map<string, number>();
    
    // モデル名のパターン（正規表現）
    const modelPatterns = [
      /GPT[- ]?(\d+(?:\.\d+)?(?:o|turbo|mini)?)/gi,  // GPT-4, GPT-4o, GPT-3.5, GPT-5.1
      /Claude[- ]?(\d+(?:\.\d+)?(?:sonnet|opus|haiku)?)/gi,  // Claude-3, Claude-3.5, Claude-3.5-sonnet
      /Gemini[- ]?(Pro|Ultra|Flash|(\d+(?:\.\d+)?)?)/gi,  // Gemini Pro, Gemini Ultra, Gemini 2.0
      /Llama[- ]?(\d+(?:\.\d+)?)/gi,  // Llama-2, Llama-3, Llama-3.1
      /Mistral[- ]?(\d+(?:\.\d+)?(?:B|Large)?)/gi,  // Mistral-7B, Mistral-Large
      /Grok[- ]?(\d+(?:\.\d+)?)?/gi,  // Grok, Grok-2
    ];

    for (const event of events) {
      const text = ((event.title || '') + ' ' + (event.content || '')).toLowerCase();
      
      for (const pattern of modelPatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match[0]) {
            const modelName = match[0].trim();
            // 正規化（GPT-4o → GPT-4o、gpt-4 → GPT-4）
            const normalized = modelName
              .split(/[- ]/)
              .map((part, i) => {
                if (i === 0) {
                  // 最初の部分は大文字に
                  return part.charAt(0).toUpperCase() + part.slice(1);
                }
                return part;
              })
              .join('-');
            
            modelCount.set(normalized, (modelCount.get(normalized) || 0) + 1);
          }
        }
      }
    }

    return modelCount;
  };

  // タイトルから単語を抽出（2-3語のフレーズ）
  const extractPhrases = (events: any[]): Map<string, number> => {
    const phraseCount = new Map<string, number>();
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'this',
      'that',
      'these',
      'those',
    ]);

    for (const event of events) {
      const title = (event.title || '').toLowerCase();
      const words = title
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));

      // 2語のフレーズを抽出
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`;
        phraseCount.set(phrase, (phraseCount.get(phrase) || 0) + 1);
      }
    }

    return phraseCount;
  };

  // モデル名を抽出
  const currentModels = extractModelNames(currentEvents);
  const previousModels = extractModelNames(previousEvents);

  const currentPhrases = extractPhrases(currentEvents);
  const previousPhrases = extractPhrases(previousEvents);

  const results: Array<{ keyword: string; currentCount: number; previousCount: number }> = [];

  // モデル名を追加（1回以上出現したもの）
  for (const [modelName, currentCount] of currentModels.entries()) {
    const previousCount = previousModels.get(modelName) || 0;
    results.push({
      keyword: modelName,
      currentCount,
      previousCount,
    });
  }

  // 現在の期間で3回以上出現したフレーズを抽出
  for (const [phrase, currentCount] of currentPhrases.entries()) {
    if (currentCount >= 3) {
      const previousCount = previousPhrases.get(phrase) || 0;
      results.push({
        keyword: phrase
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        currentCount,
        previousCount,
      });
    }
  }

  return results;
}

/**
 * 感情の変化を分析
 */
export function analyzeSentimentTrend(
  currentVoices: any[],
  previousVoices: any[]
): { sentiment: string; growthRate: number; currentCount: number; previousCount: number } | null {
  // 簡易的な感情分析（キーワードベース）
  const positiveKeywords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'awesome', 'fantastic'];
  const negativeKeywords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'disappointing', 'poor', 'fail'];

  const countSentiment = (voices: any[], keywords: string[]): number => {
    return voices.filter((voice) => {
      const text = ((voice.title || '') + ' ' + (voice.content || '')).toLowerCase();
      return keywords.some((kw) => text.includes(kw));
    }).length;
  };

  const currentPositive = countSentiment(currentVoices, positiveKeywords);
  const currentNegative = countSentiment(currentVoices, negativeKeywords);
  const previousPositive = countSentiment(previousVoices, positiveKeywords);
  const previousNegative = countSentiment(previousVoices, negativeKeywords);

  // ポジティブ感情の変化率
  const positiveGrowthRate = calculateTrend(currentPositive, previousPositive);
  // ネガティブ感情の変化率
  const negativeGrowthRate = calculateTrend(currentNegative, previousNegative);

  // より大きな変化がある方を返す
  if (Math.abs(positiveGrowthRate) > Math.abs(negativeGrowthRate) && Math.abs(positiveGrowthRate) > 20) {
    return {
      sentiment: 'positive',
      growthRate: positiveGrowthRate,
      currentCount: currentPositive,
      previousCount: previousPositive,
    };
  } else if (Math.abs(negativeGrowthRate) > 20) {
    return {
      sentiment: 'negative',
      growthRate: negativeGrowthRate,
      currentCount: currentNegative,
      previousCount: previousNegative,
    };
  }

  return null;
}

/**
 * 複数ソースでの同時言及を検出
 */
export function detectMultiSourceMentions(
  events: any[],
  keyword: string,
  minSources: number = 2
): { keyword: string; sources: string[]; count: number } | null {
  const sources = new Set<string>();
  let count = 0;

  for (const event of events) {
    const title = (event.title || '').toLowerCase();
    const content = (event.content || '').toLowerCase();
    const keywordLower = keyword.toLowerCase();

    if (title.includes(keywordLower) || content.includes(keywordLower)) {
      sources.add(event.source);
      count++;
    }
  }

  if (sources.size >= minSources && count >= 3) {
    return {
      keyword,
      sources: Array.from(sources),
      count,
    };
  }

  return null;
}
