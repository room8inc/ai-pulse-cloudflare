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
 * 急上昇キーワードを検出（データドリブン・動的抽出のみ）
 * 固定リストに依存せず、実際のデータから検出
 */
export function detectRisingKeywords(
  currentEvents: any[],
  previousEvents: any[],
  searchQueries?: any[], // Search Consoleの検索クエリ（オプション）
  minGrowthRate: number = 50
): Array<{ keyword: string; growthRate: number; currentCount: number }> {
  const results: Array<{
    keyword: string;
    growthRate: number;
    currentCount: number;
  }> = [];

  // 1. Search Consoleの検索クエリを優先的に使用（ユーザーが実際に検索しているキーワード）
  if (searchQueries && searchQueries.length > 0) {
    const queryCounts = new Map<string, number>();
    
    // 検索クエリを集計（クリック数が多い順）
    for (const query of searchQueries) {
      const q = (query.query || '').toLowerCase().trim();
      if (q.length > 2) {
        queryCounts.set(q, (queryCounts.get(q) || 0) + (query.clicks || 0));
      }
    }
    
    // 検索クエリからキーワードを抽出して分析
    for (const [query, clicks] of queryCounts.entries()) {
      if (clicks >= 3) { // 3回以上クリックされたクエリ
        // クエリを単語に分割
        const words = query.split(/\s+/).filter(w => w.length > 2);
        for (const word of words) {
          const currentCount = countKeywordMentions(currentEvents, word);
          const previousCount = countKeywordMentions(previousEvents, word);
          const growthRate = calculateTrend(currentCount, previousCount);
          
          if (growthRate >= minGrowthRate && currentCount > 0) {
            results.push({ 
              keyword: word.charAt(0).toUpperCase() + word.slice(1), 
              growthRate, 
              currentCount 
            });
          }
        }
      }
    }
  }

  // 2. 実際のデータから動的にキーワードを抽出（タイトル・コンテンツから）
  const dynamicKeywords = extractDynamicKeywords(currentEvents, previousEvents);
  for (const { keyword, currentCount, previousCount } of dynamicKeywords) {
    const growthRate = calculateTrend(currentCount, previousCount);
    if (growthRate >= minGrowthRate && currentCount >= 3) {
      // 既に追加済みの場合はスキップ
      if (!results.some((r) => r.keyword.toLowerCase() === keyword.toLowerCase())) {
        results.push({ keyword, growthRate, currentCount });
      }
    }
  }

  // 3. タイトルから重要な単語を抽出（名詞・固有名詞を優先）
  const titleKeywords = extractTitleKeywords(currentEvents, previousEvents);
  for (const { keyword, currentCount, previousCount } of titleKeywords) {
    const growthRate = calculateTrend(currentCount, previousCount);
    if (growthRate >= minGrowthRate && currentCount >= 5) {
      // 既に追加済みの場合はスキップ
      if (!results.some((r) => r.keyword.toLowerCase() === keyword.toLowerCase())) {
        results.push({ keyword, growthRate, currentCount });
      }
    }
  }

  // 成長率でソート（成長率が同じ場合は言及数でソート）
  return results
    .sort((a, b) => {
      if (b.growthRate !== a.growthRate) {
        return b.growthRate - a.growthRate;
      }
      return b.currentCount - a.currentCount;
    })
    .slice(0, 30); // 上位30件
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
    // 注意: 固定リストではなく、正規表現で動的に検出するため、
    // 新しいモデル名（GPT-6、Claude-5など）も自動的に検出可能
    const modelPatterns = [
      /GPT[- ]?(\d+(?:\.\d+)?(?:o|turbo|mini)?)/gi,  // GPT-4, GPT-4o, GPT-3.5, GPT-5.1, GPT-6など
      /Claude[- ]?(\d+(?:\.\d+)?(?:sonnet|opus|haiku)?)/gi,  // Claude-3, Claude-3.5, Claude-4, Claude-4.5など
      /Gemini[- ]?(Pro|Ultra|Flash|(\d+(?:\.\d+)?)?)/gi,  // Gemini Pro, Gemini Ultra, Gemini 2.0など
      /Llama[- ]?(\d+(?:\.\d+)?)/gi,  // Llama-2, Llama-3, Llama-3.1, Llama-4など
      /Mistral[- ]?(\d+(?:\.\d+)?(?:B|Large)?)/gi,  // Mistral-7B, Mistral-Largeなど
      /Grok[- ]?(\d+(?:\.\d+)?)?/gi,  // Grok, Grok-2など
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
        .filter((w: string) => w.length > 2 && !stopWords.has(w));

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

  // 古いモデルを除外する（最新モデルを優先）
  const excludeOldModels = (modelName: string): boolean => {
    const name = modelName.toLowerCase();
    
    // GPT系の処理
    if (name.includes('gpt')) {
      // GPT-5系が存在する場合は、GPT-4以下を除外（GPT-4oは最新のGPT-4系なので残す）
      const hasGpt5 = Array.from(currentModels.keys()).some(m => 
        m.toLowerCase().match(/gpt[- ]?5/)
      );
      if (hasGpt5) {
        // GPT-5系が存在する場合、GPT-4以下（GPT-4o以外）を除外
        // GPT-3.5、GPT-4、GPT-4.1などを除外（GPT-4oは残す）
        if (name.match(/gpt[- ]?(1|2|3)/) || name === 'gpt-4' || name === 'gpt-4.1') {
          return true; // 除外
        }
        // GPT-4oは最新のGPT-4系なので残す
      }
      // GPT-2以下は常に除外（古すぎる）
      if (name.match(/gpt[- ]?(1|2)$/)) {
        return true; // 除外
      }
    }
    
    // Claude系の処理
    if (name.includes('claude')) {
      // Claude-4系が存在する場合は、Claude-3以下を除外（Claude-3.5は最新の3系なので残す）
      const hasClaude4 = Array.from(currentModels.keys()).some(m => 
        m.toLowerCase().match(/claude[- ]?4/)
      );
      if (hasClaude4) {
        // Claude-4系が存在する場合、Claude-3以下（Claude-3.5以外）を除外
        if (name.match(/claude[- ]?(1|2|3)$/)) {
          return true; // 除外
        }
        // Claude-3.5は最新の3系なので残す
      }
    }
    
    return false; // 除外しない
  };

  // モデル名を追加（1回以上出現したもの、古いモデルは除外）
  for (const [modelName, currentCount] of currentModels.entries()) {
    // 古いモデルを除外
    if (excludeOldModels(modelName)) {
      continue;
    }
    
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
 * タイトルから重要なキーワードを抽出（名詞・固有名詞を優先）
 */
function extractTitleKeywords(
  currentEvents: any[],
  previousEvents: any[]
): Array<{ keyword: string; currentCount: number; previousCount: number }> {
  const extractKeywords = (events: any[]): Map<string, number> => {
    const keywordCount = new Map<string, number>();
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'how', 'what', 'when', 'where', 'why', 'who', 'which', 'new', 'latest', 'announcing',
      'introducing', 'release', 'update', 'blog', 'post', 'article',
    ]);

    for (const event of events) {
      const title = (event.title || '').toLowerCase();
      // タイトルから単語を抽出
      const words = title
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w: string) => w.length > 3 && !stopWords.has(w));

      for (const word of words) {
        // 大文字で始まる単語（固有名詞の可能性が高い）を優先
        const originalWord = (event.title || '').split(/\s+/).find((w: string) => 
          w.toLowerCase() === word && /^[A-Z]/.test(w)
        );
        
        const keyword = originalWord || (word.charAt(0).toUpperCase() + word.slice(1));
        keywordCount.set(keyword, (keywordCount.get(keyword) || 0) + 1);
      }
    }

    return keywordCount;
  };

  const currentKeywords = extractKeywords(currentEvents);
  const previousKeywords = extractKeywords(previousEvents);

  const results: Array<{ keyword: string; currentCount: number; previousCount: number }> = [];

  // 現在の期間で5回以上出現したキーワードを抽出
  for (const [keyword, currentCount] of currentKeywords.entries()) {
    if (currentCount >= 5) {
      const previousCount = previousKeywords.get(keyword) || 0;
      results.push({
        keyword,
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
