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
 */
export async function generateSummary(input: SummaryInput): Promise<{
  summary: string;
  blogIdeas: BlogIdea[];
}> {
  // 環境変数が設定されている場合は実際のLLM APIを呼び出す
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  // 優先順位: OpenAI > Anthropic > Gemini > テンプレート
  if (openaiKey) {
    return await generateWithOpenAI(input);
  } else if (anthropicKey) {
    return await generateWithAnthropic(input);
  } else if (geminiKey) {
    return await generateWithGemini(input);
  } else {
    // 環境変数が設定されていない場合はテンプレートベース
    return generateTemplateSummary(input);
  }
}

/**
 * OpenAI APIを使用してサマリーを生成
 */
async function generateWithOpenAI(input: SummaryInput): Promise<{
  summary: string;
  blogIdeas: BlogIdea[];
}> {
  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // 公式情報を要約
  const officialText = input.official
    .slice(0, 10)
    .map((item: any) => `- ${item.title}: ${item.content?.substring(0, 200)}`)
    .join('\n');

  // コミュニティの声を要約
  const communityText = input.community
    .slice(0, 10)
    .map((item: any) => `- ${item.title}: ${item.content?.substring(0, 200)}`)
    .join('\n');

  // トレンド情報
  const trendsText = input.trends
    .slice(0, 5)
    .map((t: any) => `- ${t.keyword}: ${t.growthRate?.toFixed(1) || 0}% 増加`)
    .join('\n');

  const prompt = `以下のAI関連の最新情報を分析して、ブログ記事のネタを生成してください。

## 公式情報
${officialText || 'なし'}

## コミュニティの声
${communityText || 'なし'}

## トレンド
${trendsText || 'なし'}

以下の形式でJSONを返してください：
{
  "summary": "今日のサマリー（200文字程度）",
  "blogIdeas": [
    {
      "title": "記事タイトル",
      "summary": "記事の要約（100文字程度）",
      "content": "記事の詳細内容（500文字程度）",
      "sources": ["source_id1", "source_id2"],
      "priority": "high" | "medium" | "low"
    }
  ]
}

## 重要な方針

**ユーザーにとって役立つ実践的な情報を優先してください。**

### 優先度の基準（実践的な情報を重視）

**high（高優先度）:**
- 実践的なガイド（使い方、選び方、比較、ベストプラクティス）
- ユーザーが実際に使える情報（設定方法、活用事例、トラブルシューティング）
- モデル比較や性能評価（どれを選ぶべきか）
- 具体的な活用方法やTips

**medium（中優先度）:**
- 新機能の紹介（実践的な使い方を含む場合）
- 技術的な解説（実装方法を含む場合）
- トレンド分析（実践的な示唆を含む場合）

**low（低優先度）:**
- 単なるニュースや発表（実践的な情報がない）
- 地域限定の情報（例：オーストラリア向けの紹介のみ）
- 企業の買収や提携などのビジネスニュース（実践的な情報がない）
- 一般的な情報（ユーザーが既に知っている可能性が高い）

### 記事タイトルの例（実践的な情報を重視）

良い例：
- "GPT-5.1とClaude-4.5の比較：どちらを選ぶべきか"
- "Claude-4.5の実践的な使い方：プロンプト最適化のコツ"
- "AIモデル選び方ガイド：用途別おすすめモデル"
- "RAG実装のベストプラクティス：よくある失敗と対策"

避けるべき例：
- "OpenAIがオーストラリアに進出"（単なるニュース）
- "AnthropicがNeptuneを買収"（ビジネスニュース）
- "新モデルがリリースされました"（実践的な情報がない）

ブログ候補は3-5個程度生成してください。実践的な情報を含む記事を優先してください。`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // コスト効率を考慮
      messages: [
        {
          role: 'system',
          content: `あなたはAI技術のブログ記事を書く専門家です。最新情報を分析して、読者にとって価値のある実践的な記事ネタを生成してください。

重要な方針：
- SEO目的だけでなく、ユーザーにとって役立つ情報を提供する
- 実践的な情報（選び方、使い方、比較、ベストプラクティス）を優先する
- 単なるニュースや発表は優先度を低くする
- ユーザーが実際に使える情報を重視する

記事タイトルには「使い方」「選び方」「比較」「ベストプラクティス」「実践的なガイド」などのキーワードを含めることを推奨します。`,
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

    const result = JSON.parse(content);
    return {
      summary: result.summary || 'サマリーを生成できませんでした',
      blogIdeas: result.blogIdeas || [],
    };
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    // エラー時はテンプレートベースにフォールバック
    return generateTemplateSummary(input);
  }
}

/**
 * Anthropic APIを使用してサマリーを生成
 */
async function generateWithAnthropic(input: SummaryInput): Promise<{
  summary: string;
  blogIdeas: BlogIdea[];
}> {
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const officialText = input.official
    .slice(0, 10)
    .map((item: any) => `- ${item.title}: ${item.content?.substring(0, 200)}`)
    .join('\n');

  const communityText = input.community
    .slice(0, 10)
    .map((item: any) => `- ${item.title}: ${item.content?.substring(0, 200)}`)
    .join('\n');

  const trendsText = input.trends
    .slice(0, 5)
    .map((t: any) => `- ${t.keyword}: ${t.growthRate?.toFixed(1) || 0}% 増加`)
    .join('\n');

  const prompt = `以下のAI関連の最新情報を分析して、ブログ記事のネタを生成してください。

## 公式情報
${officialText || 'なし'}

## コミュニティの声
${communityText || 'なし'}

## トレンド
${trendsText || 'なし'}

以下の形式でJSONを返してください：
{
  "summary": "今日のサマリー（200文字程度）",
  "blogIdeas": [
    {
      "title": "記事タイトル",
      "summary": "記事の要約（100文字程度）",
      "content": "記事の詳細内容（500文字程度）",
      "sources": ["source_id1", "source_id2"],
      "priority": "high" | "medium" | "low"
    }
  ]
}

## 重要な方針

**ユーザーにとって役立つ実践的な情報を優先してください。**

### 優先度の基準（実践的な情報を重視）

**high（高優先度）:**
- 実践的なガイド（使い方、選び方、比較、ベストプラクティス）
- ユーザーが実際に使える情報（設定方法、活用事例、トラブルシューティング）
- モデル比較や性能評価（どれを選ぶべきか）
- 具体的な活用方法やTips

**medium（中優先度）:**
- 新機能の紹介（実践的な使い方を含む場合）
- 技術的な解説（実装方法を含む場合）
- トレンド分析（実践的な示唆を含む場合）

**low（低優先度）:**
- 単なるニュースや発表（実践的な情報がない）
- 地域限定の情報（例：オーストラリア向けの紹介のみ）
- 企業の買収や提携などのビジネスニュース（実践的な情報がない）
- 一般的な情報（ユーザーが既に知っている可能性が高い）

### 記事タイトルの例（実践的な情報を重視）

良い例：
- "GPT-5.1とClaude-4.5の比較：どちらを選ぶべきか"
- "Claude-4.5の実践的な使い方：プロンプト最適化のコツ"
- "AIモデル選び方ガイド：用途別おすすめモデル"
- "RAG実装のベストプラクティス：よくある失敗と対策"

避けるべき例：
- "OpenAIがオーストラリアに進出"（単なるニュース）
- "AnthropicがNeptuneを買収"（ビジネスニュース）
- "新モデルがリリースされました"（実践的な情報がない）

ブログ候補は3-5個程度生成してください。実践的な情報を含む記事を優先してください。`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
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

    const text = content.text;
    // JSON部分を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      summary: result.summary || 'サマリーを生成できませんでした',
      blogIdeas: result.blogIdeas || [],
    };
  } catch (error) {
    console.error('Error calling Anthropic API:', error);
    return generateTemplateSummary(input);
  }
}

/**
 * Gemini APIを使用してサマリーを生成
 */
async function generateWithGemini(input: SummaryInput): Promise<{
  summary: string;
  blogIdeas: BlogIdea[];
}> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const officialText = input.official
    .slice(0, 10)
    .map((item: any) => `- ${item.title}: ${item.content?.substring(0, 200)}`)
    .join('\n');

  const communityText = input.community
    .slice(0, 10)
    .map((item: any) => `- ${item.title}: ${item.content?.substring(0, 200)}`)
    .join('\n');

  const trendsText = input.trends
    .slice(0, 5)
    .map((t: any) => `- ${t.keyword}: ${t.growthRate?.toFixed(1) || 0}% 増加`)
    .join('\n');

  const prompt = `以下のAI関連の最新情報を分析して、ブログ記事のネタを生成してください。

## 公式情報
${officialText || 'なし'}

## コミュニティの声
${communityText || 'なし'}

## トレンド
${trendsText || 'なし'}

以下の形式でJSONを返してください：
{
  "summary": "今日のサマリー（200文字程度）",
  "blogIdeas": [
    {
      "title": "記事タイトル",
      "summary": "記事の要約（100文字程度）",
      "content": "記事の詳細内容（500文字程度）",
      "sources": ["source_id1", "source_id2"],
      "priority": "high" | "medium" | "low"
    }
  ]
}

## 重要な方針

**ユーザーにとって役立つ実践的な情報を優先してください。**

### 優先度の基準（実践的な情報を重視）

**high（高優先度）:**
- 実践的なガイド（使い方、選び方、比較、ベストプラクティス）
- ユーザーが実際に使える情報（設定方法、活用事例、トラブルシューティング）
- モデル比較や性能評価（どれを選ぶべきか）
- 具体的な活用方法やTips

**medium（中優先度）:**
- 新機能の紹介（実践的な使い方を含む場合）
- 技術的な解説（実装方法を含む場合）
- トレンド分析（実践的な示唆を含む場合）

**low（低優先度）:**
- 単なるニュースや発表（実践的な情報がない）
- 地域限定の情報（例：オーストラリア向けの紹介のみ）
- 企業の買収や提携などのビジネスニュース（実践的な情報がない）
- 一般的な情報（ユーザーが既に知っている可能性が高い）

### 記事タイトルの例（実践的な情報を重視）

良い例：
- "GPT-5.1とClaude-4.5の比較：どちらを選ぶべきか"
- "Claude-4.5の実践的な使い方：プロンプト最適化のコツ"
- "AIモデル選び方ガイド：用途別おすすめモデル"
- "RAG実装のベストプラクティス：よくある失敗と対策"

避けるべき例：
- "OpenAIがオーストラリアに進出"（単なるニュース）
- "AnthropicがNeptuneを買収"（ビジネスニュース）
- "新モデルがリリースされました"（実践的な情報がない）

ブログ候補は3-5個程度生成してください。実践的な情報を含む記事を優先してください。`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSON部分を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: parsed.summary || 'サマリーを生成できませんでした',
      blogIdeas: parsed.blogIdeas || [],
    };
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return generateTemplateSummary(input);
  }
}

/**
 * テンプレートベースのサマリー生成（フォールバック）
 */
function generateTemplateSummary(input: SummaryInput): {
  summary: string;
  blogIdeas: BlogIdea[];
} {
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
  .map((t: any) => `- ${t.keyword}: ${t.growthRate?.toFixed(1) || 0}% 増加`)
  .join('\n')}
`;

  // ブログ候補を生成（簡易版）
  const blogIdeas: BlogIdea[] = [];

  // 公式情報からブログ候補を生成（実践的な情報を優先）
  for (const item of input.official.slice(0, 3)) {
    const title = item.title || '公式アップデート';
    const content = item.content || item.title || '';
    
    // 実践的な情報を含むかどうかを判定
    const isPractical = 
      title.includes('使い方') || title.includes('選び方') || title.includes('比較') ||
      title.includes('ガイド') || title.includes('ベストプラクティス') ||
      content.includes('使い方') || content.includes('選び方') || content.includes('比較') ||
      content.includes('ガイド') || content.includes('ベストプラクティス');
    
    // 単なるニュースかどうかを判定
    const isNewsOnly = 
      title.includes('進出') || title.includes('買収') || title.includes('提携') ||
      title.includes('リリース') || title.includes('発表');
    
    // 優先度を決定
    let priority: 'high' | 'medium' | 'low' = 'medium';
    if (isPractical) {
      priority = 'high';
    } else if (isNewsOnly) {
      priority = 'low';
    }
    
    blogIdeas.push({
      title,
      summary: `公式情報: ${item.source}`,
      content,
      sources: [item.id],
      priority,
    });
  }

  // 急上昇トレンドからブログ候補を生成
  for (const trend of input.trends.slice(0, 2)) {
    blogIdeas.push({
      title: `${trend.keyword}の急上昇トレンド`,
      summary: `成長率: ${trend.growthRate?.toFixed(1) || 0}%`,
      content: `${trend.keyword}に関する言及が急増しています。`,
      sources: [],
      priority: (trend.growthRate || 0) > 100 ? ('high' as const) : ('medium' as const),
    });
  }

  return { summary, blogIdeas };
}
