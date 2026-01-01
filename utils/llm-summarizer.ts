/**
 * LLMを使用したサマリー生成ユーティリティ
 */

export interface SummaryInput {
  official: any[];
  community: any[];
  trends: any[];
  searchQueries?: any[]; // Search Consoleの検索クエリ
  popularPosts?: any[]; // 人気記事のデータ
  aiAnalysis?: { // AI分析結果
    recommendedKeywords: Array<{
      keyword: string;
      reason: string;
      opportunity_score: number;
      competition_level: string;
      suggested_article_type: string;
    }>;
    strategy: {
      strategy_recommendations: string;
      market_gaps: Array<{
        keyword: string;
        gap_description: string;
        potential_impact: string;
      }>;
    } | null;
  };
}

export interface BlogIdea {
  title: string;
  summary: string;
  content: string;
  sources: string[];
  priority: 'high' | 'medium' | 'low';
  recommended_keywords?: string[]; // 推奨キーワード
  seo_recommendations?: string; // SEO推奨事項
}

/**
 * プロンプトを生成する共通関数
 */
function generatePrompt(input: SummaryInput): string {
  // 公式情報を要約（より詳細な情報を含める、IDも含める）
  const officialText = input.official
    .slice(0, 15)
    .map((item: any) => {
      const content = item.content?.substring(0, 500) || item.title || '';
      const url = item.url || '';
      const id = item.id || '';
      return `- 【ID: ${id}】${item.title}\n  URL: ${url}\n  内容: ${content}`;
    })
    .join('\n\n');

  // コミュニティの声を要約（より詳細な情報を含める、IDも含める）
  const communityText = input.community
    .slice(0, 15)
    .map((item: any) => {
      const content = item.content?.substring(0, 500) || item.title || '';
      const url = item.url || '';
      const sentiment = item.sentiment || '';
      const id = item.id || '';
      return `- 【ID: ${id}】${item.title}\n  URL: ${url}\n  感情: ${sentiment}\n  内容: ${content}`;
    })
    .join('\n\n');

  // トレンド情報
  const trendsText = input.trends
    .slice(0, 5)
    .map((t: any) => `- ${t.keyword}: ${t.growthRate?.toFixed(1) || 0}% 増加`)
    .join('\n');

  // Search Consoleの検索クエリ（人気キーワード）
  const searchQueriesText = input.searchQueries
    ?.slice(0, 10)
    .map((q: any) => `- "${q.query}": クリック数 ${q.clicks || 0}, インプレッション ${q.impressions || 0}, CTR ${q.ctr?.toFixed(2) || 0}%`)
    .join('\n') || 'なし';

  // 人気記事の傾向
  const popularPostsText = input.popularPosts
    ?.slice(0, 5)
    .map((p: any) => `- "${p.title}": PV ${p.page_views || 0}, 滞在時間 ${Math.round(p.avg_time_on_page || 0)}秒`)
    .join('\n') || 'なし';

  // AI分析結果（これから狙うべきキーワード、記事戦略、市場のギャップ）
  const aiAnalysisText = input.aiAnalysis ? `
## AI分析結果（これから狙うべきキーワード）
${input.aiAnalysis.recommendedKeywords
  .map((k: any) => `- 【${k.keyword}】機会スコア: ${k.opportunity_score}, 競合: ${k.competition_level}, 推奨記事タイプ: ${k.suggested_article_type}\n  理由: ${k.reason}`)
  .join('\n\n')}

## AI分析結果（記事戦略）
${input.aiAnalysis.strategy?.strategy_recommendations || 'なし'}

## AI分析結果（市場のギャップ）
${input.aiAnalysis.strategy?.market_gaps
  .map((g: any) => `- 【${g.keyword}】影響度: ${g.potential_impact}\n  説明: ${g.gap_description}`)
  .join('\n\n') || 'なし'}
` : '';

  return `以下のAI関連の最新情報を分析して、ブログ記事のネタを生成してください。

## 重要: ターゲット読者とブランディング

**ターゲット読者:**
- 個人事業主
- 地元の起業家
- 中小企業の経営者
- 技術的には詳しくないが、AIを事業に活用したい人

**Room8について:**
- 春日井のコワーキングスペース
- AIコンサルティングサービスを提供
- AIを組み込んだアプリ開発を手がけている
- 地域の事業主がAIを活用して事業成長を実現することを支援

**記事の方向性:**
- 技術的すぎず、実践的で事業に役立つ情報を優先
- 「どう使うか」「どう選ぶか」「どう活用するか」を具体的に
- Room8のAIコンサルやアプリ開発の実績を自然に組み込む（押し付けがましくない）
- 地域の事業主が「これなら自分でも使えそう」と思える内容

## 公式情報
${officialText || 'なし'}

## コミュニティの声
${communityText || 'なし'}

## トレンド
${trendsText || 'なし'}

## 検索クエリ（Search Console - ユーザーが検索しているキーワード）
${searchQueriesText}

## 人気記事（過去のパフォーマンス）
${popularPostsText}
${aiAnalysisText}

以下の形式でJSONを返してください：
{
  "summary": "今日のサマリー（200文字程度）",
  "blogIdeas": [
    {
      "title": "記事タイトル（具体的で実践的、個人事業主向け）",
      "summary": "記事作成アドバイス（300-400文字）：元ネタの情報を基に、どんなブログを書くと良いか具体的にアドバイス。記事の構成、見出し案、含めるべき内容、読者に伝えるべきポイントなどを具体的に記載",
      "content": "記事の詳細内容（800-1000文字、実際に記事に使える具体的な情報）",
      "sources": ["source_id1", "source_id2"], // 元ネタのIDを配列で指定（上記の【ID: xxx】のIDを使用）
      "priority": "high" | "medium" | "low",
      "recommended_keywords": ["キーワード1", "キーワード2", "キーワード3"],
      "seo_recommendations": "SEO推奨事項（300-400文字）：AnalyticsとSearch Consoleのデータを基に、狙うべきキーワード、記事の方針、構成の推奨、見出しに含めるべきキーワード、記事の長さ、過去の人気記事の傾向を踏まえた具体的な推奨事項"
    }
  ]
}

## 重要な方針

**個人事業主・地元起業家にとって役立つ実践的な情報を優先してください。記事タイトルとサマリーは抽象的ではなく、具体的な内容を含めてください。**

### タイトルとサマリーの要件

**タイトル:**
- 抽象的ではなく、具体的な機能や方法を明示する
- 個人事業主・起業家が「これなら使えそう」と思える内容
- 「実践的な使い方」ではなく「○○機能で△△を実現する方法」のように具体的に
- 例: "個人事業主向けAIツール比較：ChatGPT vs Claude、月額コストと使いやすさで選ぶ"

**summary（記事作成アドバイス、300-400文字）:**
- これは「要約」ではなく「記事作成のアドバイス」です
- 元ネタの情報を基に、どんなブログを書くと良いか具体的にアドバイスしてください
- 記事の構成案、見出し案、含めるべき内容、読者に伝えるべきポイントを具体的に記載
- 元ネタの情報から具体的な内容を抽出し、それをどう記事に展開すべきかアドバイス
- 個人事業主・起業家が「実際に使える」と思える内容にする

**content（800-1000文字）:**
- 実際に記事に使える具体的な情報を含める
- 手順、使用例、比較、トラブルシューティングなど
- 読者が実際に試せる内容にする
- 技術的すぎず、個人事業主でも理解できるレベルで

### 優先度の基準（個人事業主・地元起業家向けの実践的な情報を重視）

**high（高優先度）:**
- 個人事業主・起業家が実際に使える実践的なガイド（使い方、選び方、比較、ベストプラクティス）
- 事業に役立つ具体的な活用事例（コスト削減、業務効率化、顧客対応の改善など）
- AIツールの選び方（個人事業主向けのコスト比較、導入のしやすさ）
- 具体的な活用方法やTips（技術的すぎず、実践的）
- AI分析結果の推奨キーワードと合致する内容

**medium（中優先度）:**
- 新機能の紹介（個人事業主が使える実践的な使い方を含む場合）
- 技術的な解説（ただし、個人事業主でも理解できるレベルで）
- トレンド分析（事業への影響が明確な場合）

**low（低優先度）:**
- 単なるニュースや発表（実践的な情報がない）
- 地域限定の情報（例：オーストラリア向けの紹介のみ）
- 企業の買収や提携などのビジネスニュース（実践的な情報がない）
- 技術的すぎて個人事業主には難しすぎる内容
- 一般的な情報（ユーザーが既に知っている可能性が高い）

### AI分析結果の活用

**AI分析結果を必ず考慮してください:**
- 「これから狙うべきキーワード」を優先的に記事タイトルや内容に組み込む
- 「記事戦略」の推奨事項に従って記事を構成する
- 「市場のギャップ」を埋めるような記事を優先的に生成する
- 機会スコアが高いキーワードを優先的に使用する

### 記事タイトルの例（個人事業主・地元起業家向け、具体的で実践的）

良い例（具体的、事業主向け）：
- "個人事業主向けAIツール比較：ChatGPT vs Claude vs Gemini、月額コストと使いやすさで選ぶ"
- "Microsoft 365 Copilotで顧客対応メールを自動生成：個人事業主が1日2時間削減した方法"
- "AIで業務効率化：小規模事業者が導入すべき3つのAIツールとその選び方"
- "ChatGPT APIで顧客問い合わせ対応を自動化：導入コストと効果を解説"
- "AIコンサルに頼まず自分で始める：個人事業主向けAI活用の第一歩"

避けるべき例（抽象的、技術的すぎる）：
- "Claude Opus 4.5の実践的な使い方"（何の機能か不明、技術的）
- "新モデルの活用方法"（具体的な内容がない）
- "RAG実装でよくある3つのエラー"（技術的すぎて個人事業主には難しすぎる）

ブログ候補は3-5個程度生成してください。タイトル、サマリー、contentすべてに具体的で実践的な情報を含めてください。

## 重要な注意事項

1. **元ネタの情報を必ず参照する**: 提供された公式情報やコミュニティの声から具体的な内容を抽出してください。推測で書かないでください。

2. **未来形を避ける**: 「解説します」「説明します」「紹介します」などの未来形は使わず、実際の内容を書いてください。

3. **具体的な数値や手順を含める**: 可能な限り、具体的な数値（例：「50%短縮」「3ステップ」）、手順、使用例を含めてください。

4. **AI分析結果を活用**: AI分析結果の推奨キーワード、記事戦略、市場のギャップを必ず考慮してください。

5. **個人事業主・起業家の視点**: 技術的すぎず、実践的で事業に役立つ情報を優先してください。`;
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
  const geminiKey = process.env.GEMINI_API_KEY_FREE || process.env.GEMINI_API_KEY;

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

  const prompt = generatePrompt(input);

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

記事タイトルとサマリーの要件：
- 抽象的ではなく、具体的な機能や方法を明示する
- 「実践的な使い方」ではなく「○○機能で△△を実現する方法」のように具体的に
- サマリーには何の機能か、どう使うか、何ができるかを具体的に説明
- contentには実際に記事に使える具体的な情報（手順、コード例、使用例など）を含める

記事タイトルには「使い方」「選び方」「比較」「ベストプラクティス」などのキーワードを含めるだけでなく、具体的な機能名や用途も含めてください。`,
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

  const prompt = generatePrompt(input);

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
 * 文章生成・処理系は Gemini 2.5 Flash (無料枠想定) を使用
 */
async function generateWithGemini(input: SummaryInput): Promise<{
  summary: string;
  blogIdeas: BlogIdea[];
}> {
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

  const prompt = generatePrompt(input);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSON形式で返すように設定しているので、直接パースを試みる
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      // JSON形式でない場合は、JSON部分を抽出
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    }

    return {
      summary: parsed.summary || 'サマリーを生成できませんでした',
      blogIdeas: parsed.blogIdeas || [],
    };
  } catch (error: any) {
    console.error('Error calling Gemini API:', error);
    
    // エラー時はテンプレートベースにフォールバック
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
