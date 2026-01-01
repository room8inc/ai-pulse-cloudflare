/**
 * AIによるトレンド分析ユーティリティ
 * これから狙うべきキーワードや記事戦略を提案
 */

export interface TrendAnalysisInput {
  trends: any[]; // 急上昇キーワード
  searchQueries: any[]; // Search Consoleの検索クエリ
  popularPosts: any[]; // 過去の人気記事
  blogPosts: any[]; // 過去のブログ記事
  currentEvents: any[]; // 現在のイベント
}

export interface TrendAnalysisResult {
  recommended_keywords: Array<{
    keyword: string;
    reason: string;
    opportunity_score: number; // 0-100
    competition_level: 'low' | 'medium' | 'high';
    suggested_article_type: string; // 例: "how-to", "comparison", "guide"
  }>;
  strategy_recommendations: string; // 記事戦略の提案
  market_gaps: Array<{
    keyword: string;
    gap_description: string;
    potential_impact: 'low' | 'medium' | 'high';
  }>;
}

/**
 * OpenAI APIを使用してトレンド分析を実行
 */
export async function analyzeTrendsWithOpenAI(
  input: TrendAnalysisInput
): Promise<TrendAnalysisResult> {
  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // データを整理
  const trendsText = input.trends
    .slice(0, 20)
    .map((t: any) => `- ${t.keyword}: 成長率 ${t.growth_rate?.toFixed(1)}%, 現在の言及数 ${t.value || 0}`)
    .join('\n');

  const searchQueriesText = input.searchQueries
    .slice(0, 30)
    .map((q: any) => `- ${q.query}: クリック数 ${q.clicks || 0}, CTR ${q.ctr || 0}%, インプレッション ${q.impressions || 0}`)
    .join('\n');

  const popularPostsText = input.popularPosts
    .slice(0, 10)
    .map((p: any) => `- ${p.title}: PV ${p.page_views || 0}, 滞在時間 ${p.avg_time_on_page || 0}秒`)
    .join('\n');

  const currentEventsText = input.currentEvents
    .slice(0, 20)
    .map((e: any) => `- ${e.title} (${e.source_type})`)
    .join('\n');

  const prompt = `あなたはSEOとコンテンツマーケティングの専門家です。以下のデータを分析して、これから狙うべきキーワードと記事戦略を提案してください。

## 急上昇トレンド
${trendsText}

## 実際に検索されているキーワード（Search Console）
${searchQueriesText}

## 過去の人気記事
${popularPostsText}

## 現在の最新情報
${currentEventsText}

## 分析タスク

1. **これから狙うべきキーワード**を5-10個提案してください。以下の観点で評価：
   - 検索需要がある（Search Consoleでクリック数が多い、または急上昇している）
   - 競合が少ない、または競合記事が弱い
   - 過去の人気記事と関連性がある（類似のトピックが読まれている）
   - 最新情報と関連している（現在のトレンドと合致）

2. **記事戦略**を提案してください：
   - どのようなタイプの記事が効果的か（how-to、比較、ガイドなど）
   - 記事の構成や長さの推奨
   - ターゲット読者層

3. **市場のギャップ**を特定してください：
   - 検索されているが、良い記事が少ないキーワード
   - 急上昇しているが、まだ記事が少ないトピック

以下のJSON形式で回答してください：

\`\`\`json
{
  "recommended_keywords": [
    {
      "keyword": "キーワード",
      "reason": "なぜこのキーワードを狙うべきか（具体的な理由）",
      "opportunity_score": 85,
      "competition_level": "medium",
      "suggested_article_type": "how-to"
    }
  ],
  "strategy_recommendations": "記事戦略の提案（300-400文字）",
  "market_gaps": [
    {
      "keyword": "キーワード",
      "gap_description": "ギャップの説明",
      "potential_impact": "high"
    }
  ]
}
\`\`\`

重要：
- 具体的な数字やデータに基づいて提案してください
- 推測ではなく、提供されたデータから判断してください
- 実践的で実行可能な提案をしてください
- 日本語で回答してください`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはSEOとコンテンツマーケティングの専門家です。データに基づいて実践的な提案を行います。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content) as TrendAnalysisResult;
    return result;
  } catch (error) {
    console.error('Error in analyzeTrendsWithOpenAI:', error);
    throw error;
  }
}

/**
 * Anthropic APIを使用してトレンド分析を実行
 */
export async function analyzeTrendsWithAnthropic(
  input: TrendAnalysisInput
): Promise<TrendAnalysisResult> {
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // データを整理（OpenAIと同じ形式）
  const trendsText = input.trends
    .slice(0, 20)
    .map((t: any) => `- ${t.keyword}: 成長率 ${t.growth_rate?.toFixed(1)}%, 現在の言及数 ${t.value || 0}`)
    .join('\n');

  const searchQueriesText = input.searchQueries
    .slice(0, 30)
    .map((q: any) => `- ${q.query}: クリック数 ${q.clicks || 0}, CTR ${q.ctr || 0}%, インプレッション ${q.impressions || 0}`)
    .join('\n');

  const popularPostsText = input.popularPosts
    .slice(0, 10)
    .map((p: any) => `- ${p.title}: PV ${p.page_views || 0}, 滞在時間 ${p.avg_time_on_page || 0}秒`)
    .join('\n');

  const currentEventsText = input.currentEvents
    .slice(0, 20)
    .map((e: any) => `- ${e.title} (${e.source_type})`)
    .join('\n');

  const prompt = `あなたはSEOとコンテンツマーケティングの専門家です。以下のデータを分析して、これから狙うべきキーワードと記事戦略を提案してください。

## 急上昇トレンド
${trendsText}

## 実際に検索されているキーワード（Search Console）
${searchQueriesText}

## 過去の人気記事
${popularPostsText}

## 現在の最新情報
${currentEventsText}

## 分析タスク

1. **これから狙うべきキーワード**を5-10個提案してください。以下の観点で評価：
   - 検索需要がある（Search Consoleでクリック数が多い、または急上昇している）
   - 競合が少ない、または競合記事が弱い
   - 過去の人気記事と関連性がある（類似のトピックが読まれている）
   - 最新情報と関連している（現在のトレンドと合致）

2. **記事戦略**を提案してください：
   - どのようなタイプの記事が効果的か（how-to、比較、ガイドなど）
   - 記事の構成や長さの推奨
   - ターゲット読者層

3. **市場のギャップ**を特定してください：
   - 検索されているが、良い記事が少ないキーワード
   - 急上昇しているが、まだ記事が少ないトピック

以下のJSON形式で回答してください：

{
  "recommended_keywords": [
    {
      "keyword": "キーワード",
      "reason": "なぜこのキーワードを狙うべきか（具体的な理由）",
      "opportunity_score": 85,
      "competition_level": "medium",
      "suggested_article_type": "how-to"
    }
  ],
  "strategy_recommendations": "記事戦略の提案（300-400文字）",
  "market_gaps": [
    {
      "keyword": "キーワード",
      "gap_description": "ギャップの説明",
      "potential_impact": "high"
    }
  ]
}

重要：
- 具体的な数字やデータに基づいて提案してください
- 推測ではなく、提供されたデータから判断してください
- 実践的で実行可能な提案をしてください
- 日本語で回答してください`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    // JSONを抽出（```json で囲まれている可能性がある）
    let jsonText = content.text;
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const result = JSON.parse(jsonText) as TrendAnalysisResult;
    return result;
  } catch (error) {
    console.error('Error in analyzeTrendsWithAnthropic:', error);
    throw error;
  }
}

/**
 * Gemini APIを使用してトレンド分析を実行
 * 文章生成・処理系は Gemini 2.5 Flash (無料枠想定) を使用
 */
export async function analyzeTrendsWithGemini(
  input: TrendAnalysisInput
): Promise<TrendAnalysisResult> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  
  // 無料枠用のAPIキーを優先して使用
  const apiKey = process.env.GEMINI_API_KEY_FREE || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_FREE or GEMINI_API_KEY is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // 文章生成・処理系: Gemini 2.5 Flash を使用
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    } as any,
  });

  // データを整理
  const trendsText = input.trends
    .slice(0, 20)
    .map((t: any) => `- ${t.keyword}: 成長率 ${t.growth_rate?.toFixed(1)}%, 現在の言及数 ${t.value || 0}`)
    .join('\n');

  const searchQueriesText = input.searchQueries
    .slice(0, 30)
    .map((q: any) => `- ${q.query}: クリック数 ${q.clicks || 0}, CTR ${q.ctr || 0}%, インプレッション ${q.impressions || 0}`)
    .join('\n');

  const popularPostsText = input.popularPosts
    .slice(0, 10)
    .map((p: any) => `- ${p.title}: PV ${p.page_views || 0}, 滞在時間 ${p.avg_time_on_page || 0}秒`)
    .join('\n');

  const currentEventsText = input.currentEvents
    .slice(0, 20)
    .map((e: any) => `- ${e.title} (${e.source_type})`)
    .join('\n');

  const prompt = `あなたはSEOとコンテンツマーケティングの専門家です。以下のデータを分析して、これから狙うべきキーワードと記事戦略を提案してください。

## 急上昇トレンド
${trendsText}

## 実際に検索されているキーワード（Search Console）
${searchQueriesText}

## 過去の人気記事
${popularPostsText}

## 現在の最新情報
${currentEventsText}

## 分析タスク

1. **これから狙うべきキーワード**を5-10個提案してください。以下の観点で評価：
   - 検索需要がある（Search Consoleでクリック数が多い、または急上昇している）
   - 競合が少ない、または競合記事が弱い
   - 過去の人気記事と関連性がある（類似のトピックが読まれている）
   - 最新情報と関連している（現在のトレンドと合致）

2. **記事戦略**を提案してください：
   - どのようなタイプの記事が効果的か（how-to、比較、ガイドなど）
   - 記事の構成や長さの推奨
   - ターゲット読者層

3. **市場のギャップ**を特定してください：
   - 検索されているが、良い記事が少ないキーワード
   - 急上昇しているが、まだ記事が少ないトピック

以下のJSON形式で回答してください：

{
  "recommended_keywords": [
    {
      "keyword": "キーワード",
      "reason": "なぜこのキーワードを狙うべきか（具体的な理由）",
      "opportunity_score": 85,
      "competition_level": "medium",
      "suggested_article_type": "how-to"
    }
  ],
  "strategy_recommendations": "記事戦略の提案（300-400文字）",
  "market_gaps": [
    {
      "keyword": "キーワード",
      "gap_description": "ギャップの説明",
      "potential_impact": "high"
    }
  ]
}

重要：
- 具体的な数字やデータに基づいて提案してください
- 推測ではなく、提供されたデータから判断してください
- 実践的で実行可能な提案をしてください
- 日本語で回答してください`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // JSONを抽出（```json で囲まれている可能性がある）
    let jsonText = text;
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const analysisResult = JSON.parse(jsonText) as TrendAnalysisResult;
    return analysisResult;
  } catch (error) {
    console.error('Error in analyzeTrendsWithGemini:', error);
    throw error;
  }
}

/**
 * 利用可能なLLMでトレンド分析を実行
 */
export async function analyzeTrendsWithAI(
  input: TrendAnalysisInput
): Promise<TrendAnalysisResult> {
  // 優先順位: Gemini (処理系は2.5系推奨) > OpenAI > Anthropic
  if (process.env.GEMINI_API_KEY_FREE || process.env.GEMINI_API_KEY) {
    try {
      return await analyzeTrendsWithGemini(input);
    } catch (error) {
      console.error('Gemini analysis failed, trying OpenAI:', error);
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      return await analyzeTrendsWithOpenAI(input);
    } catch (error) {
      console.error('OpenAI analysis failed, trying Anthropic:', error);
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await analyzeTrendsWithAnthropic(input);
    } catch (error) {
      console.error('Anthropic analysis failed:', error);
    }
  }

  // フォールバック: 空の結果を返す
  return {
    recommended_keywords: [],
    strategy_recommendations: 'AI分析を実行するには、GEMINI_API_KEY、OPENAI_API_KEY、またはANTHROPIC_API_KEYのいずれかを設定してください。',
    market_gaps: [],
  };
}

