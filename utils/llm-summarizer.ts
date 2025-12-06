/**
 * LLMを使用したサマリー生成ユーティリティ
 */

export interface SummaryInput {
  official: any[];
  community: any[];
  trends: any[];
  searchQueries?: any[]; // Search Consoleの検索クエリ
  popularPosts?: any[]; // 人気記事のデータ
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

  // 公式情報を要約（より詳細な情報を含める）
  const officialText = input.official
    .slice(0, 15)
    .map((item: any) => {
      const content = item.content?.substring(0, 500) || item.title || '';
      const url = item.url || '';
      return `- 【${item.title}】\n  URL: ${url}\n  内容: ${content}`;
    })
    .join('\n\n');

  // コミュニティの声を要約（より詳細な情報を含める）
  const communityText = input.community
    .slice(0, 15)
    .map((item: any) => {
      const content = item.content?.substring(0, 500) || item.title || '';
      const url = item.url || '';
      const sentiment = item.sentiment || '';
      return `- 【${item.title}】\n  URL: ${url}\n  感情: ${sentiment}\n  内容: ${content}`;
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

  const prompt = `以下のAI関連の最新情報を分析して、ブログ記事のネタを生成してください。

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

以下の形式でJSONを返してください：
{
  "summary": "今日のサマリー（200文字程度）",
  "blogIdeas": [
    {
      "title": "記事タイトル（具体的で実践的）",
      "summary": "記事作成アドバイス（300-400文字）：元ネタの情報を基に、どんなブログを書くと良いか具体的にアドバイス。記事の構成、見出し案、含めるべき内容、読者に伝えるべきポイントなどを具体的に記載",
      "content": "記事の詳細内容（800-1000文字、実際に記事に使える具体的な情報）",
      "sources": ["source_id1", "source_id2"],
      "priority": "high" | "medium" | "low",
      "recommended_keywords": ["キーワード1", "キーワード2", "キーワード3"],
      "seo_recommendations": "SEO推奨事項（300-400文字）：AnalyticsとSearch Consoleのデータを基に、狙うべきキーワード、記事の方針、構成の推奨、見出しに含めるべきキーワード、記事の長さ、過去の人気記事の傾向を踏まえた具体的な推奨事項"
    }
  ]
}

## 重要な方針

**ユーザーにとって役立つ実践的な情報を優先してください。記事タイトルとサマリーは抽象的ではなく、具体的な内容を含めてください。**

### タイトルとサマリーの要件

**タイトル:**
- 抽象的ではなく、具体的な機能や方法を明示する
- 「実践的な使い方」ではなく「○○機能で△△を実現する方法」のように具体的に
- 例: "Claude Opus 4.5のコード生成機能でAPI統合を自動化する方法"

**summary（記事作成アドバイス、300-400文字）:**
- これは「要約」ではなく「記事作成のアドバイス」です
- 元ネタの情報を基に、どんなブログを書くと良いか具体的にアドバイスしてください
- 記事の構成案、見出し案、含めるべき内容、読者に伝えるべきポイントを具体的に記載
- 元ネタの情報から具体的な内容を抽出し、それをどう記事に展開すべきかアドバイス
- 悪い例: "AWS DevOps Agentの使い方を解説します。"
- 良い例: "元ネタの情報から、AWS DevOps Agentの自律的インシデント対応機能に焦点を当てた記事を推奨。構成は「1. インシデント対応の課題」「2. AWS DevOps Agentの機能概要」「3. 具体的な設定手順（スクリーンショット付き）」「4. 実際の運用例と効果測定」「5. よくあるトラブルと対処法」が効果的。読者には「手動対応から自動化への移行で、平均対応時間を60%短縮できる」という具体的なメリットを伝える。"

**content（800-1000文字）:**
- 実際に記事に使える具体的な情報を含める
- 手順、コード例、使用例、比較、トラブルシューティングなど
- 読者が実際に試せる内容にする

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

### 記事タイトルの例（具体的で実践的）

良い例（具体的）：
- "Claude Opus 4.5のコード生成APIでREST API統合を自動化する手順"
- "GPT-5.1とClaude-4.5のコスト比較：月1000リクエストでどちらが安い？"
- "RAG実装でよくある3つのエラーとその解決方法"
- "Microsoft 365 CopilotでExcelの複雑な数式を自動生成する方法"

避けるべき例（抽象的）：
- "Claude Opus 4.5の実践的な使い方"（何の機能か不明）
- "新モデルの活用方法"（具体的な内容がない）
- "AIツールの選び方"（どのツールか不明）

ブログ候補は3-5個程度生成してください。タイトル、サマリー、contentすべてに具体的で実践的な情報を含めてください。

## 重要な注意事項

1. **元ネタの情報を必ず参照する**: 提供された公式情報やコミュニティの声から具体的な内容を抽出してください。推測で書かないでください。

2. **未来形を避ける**: 「解説します」「説明します」「紹介します」などの未来形は使わず、実際の内容を書いてください。

3. **具体的な数値や手順を含める**: 可能な限り、具体的な数値（例：「50%短縮」「3ステップ」）、手順、コード例を含めてください。

4. **元ネタがない情報は書かない**: 元ネタにない情報を推測で追加しないでください。元ネタの情報のみを基に記事を生成してください。

## SEO推奨事項の生成方針

各ブログ候補に対して、以下の情報を考慮してSEO推奨事項を生成してください：

1. **推奨キーワード（recommended_keywords）:**
   - Search Consoleの検索クエリから、記事内容に関連するキーワードを3-5個選定
   - クリック数が多い、またはCTRが高いキーワードを優先
   - 記事タイトルや内容と関連性が高いキーワードを選ぶ

2. **SEO推奨事項（seo_recommendations）:**
   - どのキーワードをメインキーワードとして狙うべきか
   - 過去の人気記事の傾向を踏まえた記事構成の推奨
   - タイトルや見出しに含めるべきキーワード
   - 記事の長さや構成の推奨（過去の人気記事の傾向から）
   - 関連キーワードの組み合わせ方

例：
- "Search Consoleのデータから、「AWS DevOps Agent 使い方」が月間100クリック、CTR 5.2%と高パフォーマンス。これをメインキーワードに推奨。過去の人気記事（平均PV 5000以上）の傾向から、記事構成は「導入→設定手順→実践例→トラブルシューティング」の4部構成が効果的。見出しには「AWS DevOps Agent」「インシデント対応」「自動化」を含め、記事長は3000-4000文字が最適。関連キーワード「DevOps 自動化」「AWS 監視」も自然に組み込む。"`;

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

  // 公式情報を要約（より詳細な情報を含める）
  const officialText = input.official
    .slice(0, 15)
    .map((item: any) => {
      const content = item.content?.substring(0, 500) || item.title || '';
      const url = item.url || '';
      return `- 【${item.title}】\n  URL: ${url}\n  内容: ${content}`;
    })
    .join('\n\n');

  // コミュニティの声を要約（より詳細な情報を含める）
  const communityText = input.community
    .slice(0, 15)
    .map((item: any) => {
      const content = item.content?.substring(0, 500) || item.title || '';
      const url = item.url || '';
      const sentiment = item.sentiment || '';
      return `- 【${item.title}】\n  URL: ${url}\n  感情: ${sentiment}\n  内容: ${content}`;
    })
    .join('\n\n');

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

  const prompt = `以下のAI関連の最新情報を分析して、ブログ記事のネタを生成してください。

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

以下の形式でJSONを返してください：
{
  "summary": "今日のサマリー（200文字程度）",
  "blogIdeas": [
    {
      "title": "記事タイトル（具体的で実践的）",
      "summary": "記事作成アドバイス（300-400文字）：元ネタの情報を基に、どんなブログを書くと良いか具体的にアドバイス。記事の構成、見出し案、含めるべき内容、読者に伝えるべきポイントなどを具体的に記載",
      "content": "記事の詳細内容（800-1000文字、実際に記事に使える具体的な情報）",
      "sources": ["source_id1", "source_id2"],
      "priority": "high" | "medium" | "low",
      "recommended_keywords": ["キーワード1", "キーワード2", "キーワード3"],
      "seo_recommendations": "SEO推奨事項（300-400文字）：AnalyticsとSearch Consoleのデータを基に、狙うべきキーワード、記事の方針、構成の推奨、見出しに含めるべきキーワード、記事の長さ、過去の人気記事の傾向を踏まえた具体的な推奨事項"
    }
  ]
}

## 重要な方針

**ユーザーにとって役立つ実践的な情報を優先してください。記事タイトルとサマリーは抽象的ではなく、具体的な内容を含めてください。**

### タイトルとサマリーの要件

**タイトル:**
- 抽象的ではなく、具体的な機能や方法を明示する
- 「実践的な使い方」ではなく「○○機能で△△を実現する方法」のように具体的に
- 例: "Claude Opus 4.5のコード生成機能でAPI統合を自動化する方法"

**summary（記事作成アドバイス、300-400文字）:**
- これは「要約」ではなく「記事作成のアドバイス」です
- 元ネタの情報を基に、どんなブログを書くと良いか具体的にアドバイスしてください
- 記事の構成案、見出し案、含めるべき内容、読者に伝えるべきポイントを具体的に記載
- 元ネタの情報から具体的な内容を抽出し、それをどう記事に展開すべきかアドバイス
- 悪い例: "AWS DevOps Agentの使い方を解説します。"
- 良い例: "元ネタの情報から、AWS DevOps Agentの自律的インシデント対応機能に焦点を当てた記事を推奨。構成は「1. インシデント対応の課題」「2. AWS DevOps Agentの機能概要」「3. 具体的な設定手順（スクリーンショット付き）」「4. 実際の運用例と効果測定」「5. よくあるトラブルと対処法」が効果的。読者には「手動対応から自動化への移行で、平均対応時間を60%短縮できる」という具体的なメリットを伝える。"

**content（800-1000文字）:**
- 実際に記事に使える具体的な情報を含める
- 手順、コード例、使用例、比較、トラブルシューティングなど
- 読者が実際に試せる内容にする

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

### 記事タイトルの例（具体的で実践的）

良い例（具体的）：
- "Claude Opus 4.5のコード生成APIでREST API統合を自動化する手順"
- "GPT-5.1とClaude-4.5のコスト比較：月1000リクエストでどちらが安い？"
- "RAG実装でよくある3つのエラーとその解決方法"
- "Microsoft 365 CopilotでExcelの複雑な数式を自動生成する方法"

避けるべき例（抽象的）：
- "Claude Opus 4.5の実践的な使い方"（何の機能か不明）
- "新モデルの活用方法"（具体的な内容がない）
- "AIツールの選び方"（どのツールか不明）

ブログ候補は3-5個程度生成してください。タイトル、サマリー、contentすべてに具体的で実践的な情報を含めてください。

## 重要な注意事項

1. **元ネタの情報を必ず参照する**: 提供された公式情報やコミュニティの声から具体的な内容を抽出してください。推測で書かないでください。

2. **未来形を避ける**: 「解説します」「説明します」「紹介します」などの未来形は使わず、実際の内容を書いてください。

3. **具体的な数値や手順を含める**: 可能な限り、具体的な数値（例：「50%短縮」「3ステップ」）、手順、コード例を含めてください。

4. **元ネタがない情報は書かない**: 元ネタにない情報を推測で追加しないでください。元ネタの情報のみを基に記事を生成してください。

## SEO推奨事項の生成方針

各ブログ候補に対して、以下の情報を考慮してSEO推奨事項を生成してください：

1. **推奨キーワード（recommended_keywords）:**
   - Search Consoleの検索クエリから、記事内容に関連するキーワードを3-5個選定
   - クリック数が多い、またはCTRが高いキーワードを優先
   - 記事タイトルや内容と関連性が高いキーワードを選ぶ

2. **SEO推奨事項（seo_recommendations）:**
   - どのキーワードをメインキーワードとして狙うべきか
   - 過去の人気記事の傾向を踏まえた記事構成の推奨
   - タイトルや見出しに含めるべきキーワード
   - 記事の長さや構成の推奨（過去の人気記事の傾向から）
   - 関連キーワードの組み合わせ方

例：
- "Search Consoleのデータから、「AWS DevOps Agent 使い方」が月間100クリック、CTR 5.2%と高パフォーマンス。これをメインキーワードに推奨。過去の人気記事（平均PV 5000以上）の傾向から、記事構成は「導入→設定手順→実践例→トラブルシューティング」の4部構成が効果的。見出しには「AWS DevOps Agent」「インシデント対応」「自動化」を含め、記事長は3000-4000文字が最適。関連キーワード「DevOps 自動化」「AWS 監視」も自然に組み込む。"`;

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
  // 最新モデル: Gemini 2.5 Flash を優先、利用できない場合は Gemini 3.0 Pro を試す
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  // 公式情報を要約（より詳細な情報を含める）
  const officialText = input.official
    .slice(0, 15)
    .map((item: any) => {
      const content = item.content?.substring(0, 500) || item.title || '';
      const url = item.url || '';
      return `- 【${item.title}】\n  URL: ${url}\n  内容: ${content}`;
    })
    .join('\n\n');

  // コミュニティの声を要約（より詳細な情報を含める）
  const communityText = input.community
    .slice(0, 15)
    .map((item: any) => {
      const content = item.content?.substring(0, 500) || item.title || '';
      const url = item.url || '';
      const sentiment = item.sentiment || '';
      return `- 【${item.title}】\n  URL: ${url}\n  感情: ${sentiment}\n  内容: ${content}`;
    })
    .join('\n\n');

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

  const prompt = `以下のAI関連の最新情報を分析して、ブログ記事のネタを生成してください。

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

以下の形式でJSONを返してください：
{
  "summary": "今日のサマリー（200文字程度）",
  "blogIdeas": [
    {
      "title": "記事タイトル（具体的で実践的）",
      "summary": "記事作成アドバイス（300-400文字）：元ネタの情報を基に、どんなブログを書くと良いか具体的にアドバイス。記事の構成、見出し案、含めるべき内容、読者に伝えるべきポイントなどを具体的に記載",
      "content": "記事の詳細内容（800-1000文字、実際に記事に使える具体的な情報）",
      "sources": ["source_id1", "source_id2"],
      "priority": "high" | "medium" | "low",
      "recommended_keywords": ["キーワード1", "キーワード2", "キーワード3"],
      "seo_recommendations": "SEO推奨事項（300-400文字）：AnalyticsとSearch Consoleのデータを基に、狙うべきキーワード、記事の方針、構成の推奨、見出しに含めるべきキーワード、記事の長さ、過去の人気記事の傾向を踏まえた具体的な推奨事項"
    }
  ]
}

## 重要な方針

**ユーザーにとって役立つ実践的な情報を優先してください。記事タイトルとサマリーは抽象的ではなく、具体的な内容を含めてください。**

### タイトルとサマリーの要件

**タイトル:**
- 抽象的ではなく、具体的な機能や方法を明示する
- 「実践的な使い方」ではなく「○○機能で△△を実現する方法」のように具体的に
- 例: "Claude Opus 4.5のコード生成機能でAPI統合を自動化する方法"

**summary（記事作成アドバイス、300-400文字）:**
- これは「要約」ではなく「記事作成のアドバイス」です
- 元ネタの情報を基に、どんなブログを書くと良いか具体的にアドバイスしてください
- 記事の構成案、見出し案、含めるべき内容、読者に伝えるべきポイントを具体的に記載
- 元ネタの情報から具体的な内容を抽出し、それをどう記事に展開すべきかアドバイス
- 悪い例: "AWS DevOps Agentの使い方を解説します。"
- 良い例: "元ネタの情報から、AWS DevOps Agentの自律的インシデント対応機能に焦点を当てた記事を推奨。構成は「1. インシデント対応の課題」「2. AWS DevOps Agentの機能概要」「3. 具体的な設定手順（スクリーンショット付き）」「4. 実際の運用例と効果測定」「5. よくあるトラブルと対処法」が効果的。読者には「手動対応から自動化への移行で、平均対応時間を60%短縮できる」という具体的なメリットを伝える。"

**content（800-1000文字）:**
- 実際に記事に使える具体的な情報を含める
- 手順、コード例、使用例、比較、トラブルシューティングなど
- 読者が実際に試せる内容にする

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

### 記事タイトルの例（具体的で実践的）

良い例（具体的）：
- "Claude Opus 4.5のコード生成APIでREST API統合を自動化する手順"
- "GPT-5.1とClaude-4.5のコスト比較：月1000リクエストでどちらが安い？"
- "RAG実装でよくある3つのエラーとその解決方法"
- "Microsoft 365 CopilotでExcelの複雑な数式を自動生成する方法"

避けるべき例（抽象的）：
- "Claude Opus 4.5の実践的な使い方"（何の機能か不明）
- "新モデルの活用方法"（具体的な内容がない）
- "AIツールの選び方"（どのツールか不明）

ブログ候補は3-5個程度生成してください。タイトル、サマリー、contentすべてに具体的で実践的な情報を含めてください。

## 重要な注意事項

1. **元ネタの情報を必ず参照する**: 提供された公式情報やコミュニティの声から具体的な内容を抽出してください。推測で書かないでください。

2. **未来形を避ける**: 「解説します」「説明します」「紹介します」などの未来形は使わず、実際の内容を書いてください。

3. **具体的な数値や手順を含める**: 可能な限り、具体的な数値（例：「50%短縮」「3ステップ」）、手順、コード例を含めてください。

4. **元ネタがない情報は書かない**: 元ネタにない情報を推測で追加しないでください。元ネタの情報のみを基に記事を生成してください。

## SEO推奨事項の生成方針

各ブログ候補に対して、以下の情報を考慮してSEO推奨事項を生成してください：

1. **推奨キーワード（recommended_keywords）:**
   - Search Consoleの検索クエリから、記事内容に関連するキーワードを3-5個選定
   - クリック数が多い、またはCTRが高いキーワードを優先
   - 記事タイトルや内容と関連性が高いキーワードを選ぶ

2. **SEO推奨事項（seo_recommendations）:**
   - どのキーワードをメインキーワードとして狙うべきか
   - 過去の人気記事の傾向を踏まえた記事構成の推奨
   - タイトルや見出しに含めるべきキーワード
   - 記事の長さや構成の推奨（過去の人気記事の傾向から）
   - 関連キーワードの組み合わせ方

例：
- "Search Consoleのデータから、「AWS DevOps Agent 使い方」が月間100クリック、CTR 5.2%と高パフォーマンス。これをメインキーワードに推奨。過去の人気記事（平均PV 5000以上）の傾向から、記事構成は「導入→設定手順→実践例→トラブルシューティング」の4部構成が効果的。見出しには「AWS DevOps Agent」「インシデント対応」「自動化」を含め、記事長は3000-4000文字が最適。関連キーワード「DevOps 自動化」「AWS 監視」も自然に組み込む。"`;

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
    
    // gemini-2.5-flash が利用できない場合は gemini-3.0-pro を試す
    if (error?.message?.includes('model') || error?.message?.includes('not found')) {
      try {
        console.log('Falling back to gemini-3.0-pro');
        const fallbackModel = genAI.getGenerativeModel({ 
          model: 'gemini-3.0-pro',
          generationConfig: {
            responseMimeType: 'application/json',
          },
        });
        const result = await fallbackModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (parseError) {
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
      } catch (fallbackError) {
        console.error('Error calling Gemini fallback model:', fallbackError);
        return generateTemplateSummary(input);
      }
    }
    
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
