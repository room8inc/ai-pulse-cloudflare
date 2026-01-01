'use client';

import { useEffect, useState } from 'react';

interface Stats {
  todayEvents: number;
  recentOfficial: any[];
  recentVoices: any[];
  blogIdeas: {
    total: number;
    pending: number;
    approved: number;
  };
  topTrends?: any[];
  topPosts?: any[];
  aiRecommendedKeywords?: any[];
  aiStrategy?: any;
}

interface BlogIdea {
  id: string;
  title: string;
  summary: string;
  priority: string;
  status: string;
  recommendation_score?: number;
  created_at: string;
  sourceUrls?: Array<{ title: string; url: string; source: string }>;
  recommended_keywords?: string[];
  seo_recommendations?: string;
}

interface FetchStatus {
  [key: string]: {
    loading: boolean;
    success: boolean;
    error: string | null;
    message: string | null;
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  debug?: string;
  message?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [blogIdeas, setBlogIdeas] = useState<BlogIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 統計データを取得
      const statsResponse = await fetch('/api/dashboard/stats');
      const statsResult = await statsResponse.json() as ApiResponse<Stats>;
      if (statsResult.success) {
        setStats(statsResult.data || null);
      }

      // ブログ候補を取得
      const ideasResponse = await fetch('/api/dashboard/blog-ideas');
      const ideasResult = await ideasResponse.json() as ApiResponse<BlogIdea[]>;
      if (ideasResult.success) {
        setBlogIdeas(ideasResult.data || []);
      } else {
        console.error('Failed to fetch blog ideas:', ideasResult.error);
        setBlogIdeas([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchApiData = async (endpoint: string, name: string) => {
    setFetchStatus((prev) => ({
      ...prev,
      [endpoint]: { loading: true, success: false, error: null, message: null },
    }));

    try {
      const response = await fetch(endpoint);
      const result = await response.json() as ApiResponse;

      if (result.success) {
        setFetchStatus((prev) => ({
          ...prev,
          [endpoint]: {
            loading: false,
            success: true,
            error: null,
            message: result.message || `${name}を取得しました`,
          },
        }));

        // データ取得後、ダッシュボードを更新
        setTimeout(() => {
          fetchData();
        }, 1000);
      } else {
        setFetchStatus((prev) => ({
          ...prev,
          [endpoint]: {
            loading: false,
            success: false,
            error: result.error || 'エラーが発生しました',
            message: null,
          },
        }));
      }
    } catch (err) {
      setFetchStatus((prev) => ({
        ...prev,
        [endpoint]: {
          loading: false,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          message: null,
        },
      }));
    }
  };

  const updateBlogIdeaStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/dashboard/blog-ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const result = await response.json() as ApiResponse;
      if (result.success) {
        // 状態を更新
        setBlogIdeas((prev) =>
          prev.map((idea) => (idea.id === id ? { ...idea, status } : idea))
        );
      }
    } catch (err) {
      console.error('Error updating blog idea:', err);
    }
  };

  if (loading) {
    return (
      <main className="container mx-auto p-8">
        <div className="text-center">読み込み中...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto p-8">
        <div className="text-red-500">エラー: {error}</div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">ダッシュボード</h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? '更新中...' : '🔄 更新'}
        </button>
      </div>

      {/* データ取得ボタン */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">データ取得</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => fetchApiData('/api/fetch-official', '公式情報・メディア')}
            disabled={fetchStatus['/api/fetch-official']?.loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {fetchStatus['/api/fetch-official']?.loading ? '取得中...' : '📰 公式・メディア'}
          </button>
          <button
            onClick={() => fetchApiData('/api/fetch-community', 'コミュニティ')}
            disabled={fetchStatus['/api/fetch-community']?.loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {fetchStatus['/api/fetch-community']?.loading ? '取得中...' : '💬 コミュニティ'}
          </button>
          <button
            onClick={() => fetchApiData('/api/analyze-trends', 'トレンド分析')}
            disabled={fetchStatus['/api/analyze-trends']?.loading}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {fetchStatus['/api/analyze-trends']?.loading ? '分析中...' : '📈 トレンド分析'}
          </button>
          <button
            onClick={() => fetchApiData('/api/summarize-today', 'ブログ候補生成')}
            disabled={fetchStatus['/api/summarize-today']?.loading}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {fetchStatus['/api/summarize-today']?.loading ? '生成中...' : '✨ ブログ候補生成'}
          </button>
        </div>
        
        {/* ステータスメッセージ */}
        {Object.entries(fetchStatus).map(([endpoint, status]) => {
          if (!status.message && !status.error) return null;
          return (
            <div
              key={endpoint}
              className={`mt-2 p-2 rounded text-sm ${
                status.success
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {status.message || status.error}
            </div>
          );
        })}
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="border rounded-lg p-6 bg-blue-50">
          <h2 className="text-lg font-semibold mb-2">今日のイベント</h2>
          <p className="text-3xl font-bold">{stats?.todayEvents || 0}</p>
        </div>
        <div className="border rounded-lg p-6 bg-green-50">
          <h2 className="text-lg font-semibold mb-2">ブログ候補（保留）</h2>
          <p className="text-3xl font-bold">{stats?.blogIdeas.pending || 0}</p>
        </div>
        <div className="border rounded-lg p-6 bg-purple-50">
          <h2 className="text-lg font-semibold mb-2">ブログ候補（採用）</h2>
          <p className="text-3xl font-bold">{stats?.blogIdeas.approved || 0}</p>
        </div>
      </div>

      {/* 最新の公式アップデート・メディア情報 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">最新の公式アップデート・メディア情報</h2>
          <span className="text-sm text-gray-500">
            {stats?.recentOfficial?.length || 0}件
          </span>
        </div>
        <div className="border rounded-lg overflow-hidden">
          {stats?.recentOfficial && stats.recentOfficial.length > 0 ? (
            <ul className="divide-y">
              {stats.recentOfficial.slice(0, 10).map((item: any) => (
                <li key={item.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <a
                        href={item.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        <h3 className="font-semibold">{item.title}</h3>
                      </a>
                      <p className="text-sm text-gray-500 mt-1">
                        {item.source} • {new Date(item.created_at || item.published_at).toLocaleDateString('ja-JP')} {new Date(item.created_at || item.published_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      item.source_type === 'media' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.source_type === 'media' ? 'メディア' : '公式'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-gray-500">
              データがありません。「📰 公式・メディア」ボタンをクリックしてデータを取得してください。
            </div>
          )}
        </div>
      </div>

      {/* AI分析: これから狙うべきキーワード */}
      {stats?.aiRecommendedKeywords && stats.aiRecommendedKeywords.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">🎯 AI分析: これから狙うべきキーワード</h2>
          <div className="border rounded-lg overflow-hidden bg-gradient-to-r from-purple-50 to-blue-50">
            <ul className="divide-y">
              {stats.aiRecommendedKeywords.map((keyword: any, index: number) => {
                let metadata: any = {};
                try {
                  metadata = JSON.parse(keyword.metadata || '{}');
                } catch (e) {
                  // ignore
                }
                const opportunityScore = metadata.opportunity_score || 0;
                const competitionLevel = metadata.competition_level || 'medium';
                const suggestedArticleType = metadata.suggested_article_type || '';
                const reason = metadata.reason || '';

                return (
                  <li key={keyword.id || index} className="p-4 hover:bg-white/50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{keyword.keyword}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            opportunityScore >= 80 ? 'bg-green-100 text-green-800' :
                            opportunityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            機会スコア: {opportunityScore}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs ${
                            competitionLevel === 'low' ? 'bg-blue-100 text-blue-800' :
                            competitionLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            競合: {competitionLevel === 'low' ? '低' : competitionLevel === 'medium' ? '中' : '高'}
                          </span>
                          {suggestedArticleType && (
                            <span className="px-3 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                              {suggestedArticleType}
                            </span>
                          )}
                        </div>
                        {reason && (
                          <p className="text-sm text-gray-700 mt-2 leading-relaxed">{reason}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* AI分析: 記事戦略 */}
      {stats?.aiStrategy && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">📊 AI分析: 記事戦略</h2>
          <div className="border rounded-lg p-6 bg-gradient-to-r from-green-50 to-blue-50">
            {(() => {
              let strategyMetadata: any = {};
              try {
                strategyMetadata = JSON.parse(stats.aiStrategy.metadata || '{}');
              } catch (e) {
                // ignore
              }
              const strategyRecommendations = strategyMetadata.strategy_recommendations || '';
              const marketGaps = strategyMetadata.market_gaps || [];

              return (
                <div>
                  {strategyRecommendations && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg mb-2">📝 推奨記事戦略</h3>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{strategyRecommendations}</p>
                    </div>
                  )}
                  {marketGaps.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">🎯 市場のギャップ</h3>
                      <ul className="space-y-2">
                        {marketGaps.map((gap: any, index: number) => (
                          <li key={index} className="p-3 bg-white rounded border border-gray-200">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{gap.keyword}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                gap.potential_impact === 'high' ? 'bg-red-100 text-red-800' :
                                gap.potential_impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                影響度: {gap.potential_impact === 'high' ? '高' : gap.potential_impact === 'medium' ? '中' : '低'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{gap.gap_description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 急上昇トレンド */}
      {stats?.topTrends && stats.topTrends.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">急上昇トレンド</h2>
          <div className="border rounded-lg overflow-hidden">
            <ul className="divide-y">
              {stats.topTrends.map((trend: any, index: number) => (
                <li key={trend.id || index} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold">{trend.keyword}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        成長率: {trend.growth_rate?.toFixed(1) || 0}% • 
                        言及数: {trend.value || 0}件
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
                      {trend.growth_rate > 100 ? '🔥 急上昇' : '📈 上昇'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 人気記事 */}
      {stats?.topPosts && stats.topPosts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">人気記事（過去パフォーマンス）</h2>
          <div className="border rounded-lg overflow-hidden">
            <ul className="divide-y">
              {stats.topPosts.map((post: any, index: number) => (
                <li key={post.id || index} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold">{post.title}</h3>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        <span>PV: {post.page_views || 0}</span>
                        {post.avg_time_on_page && (
                          <span>滞在時間: {Math.round(post.avg_time_on_page)}秒</span>
                        )}
                        {post.bounce_rate && (
                          <span>直帰率: {(post.bounce_rate * 100).toFixed(1)}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ブログ候補 */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">ブログ候補</h2>
        <div className="border rounded-lg overflow-hidden">
          {blogIdeas.length > 0 ? (
            <ul className="divide-y">
              {blogIdeas.map((idea) => (
                <li key={idea.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{idea.title}</h3>
                      {idea.summary && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm font-semibold text-yellow-900 mb-1">📝 記事作成アドバイス</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{idea.summary}</p>
                        </div>
                      )}
                      {/* 元ネタのURL */}
                      {idea.sourceUrls && idea.sourceUrls.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-semibold text-gray-700 mb-1">元ネタ:</p>
                          <div className="flex flex-wrap gap-2">
                            {idea.sourceUrls.map((source: any, index: number) => (
                              <a
                                key={index}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                              >
                                <span className="text-xs">🔗</span>
                                <span className="truncate max-w-xs">{source.title || source.url}</span>
                                <span className="text-xs text-gray-500">({source.source})</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* SEO推奨事項 */}
                      {(idea.recommended_keywords && idea.recommended_keywords.length > 0) || idea.seo_recommendations ? (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-sm font-semibold text-blue-900 mb-2">📊 SEO推奨事項</p>
                          {idea.recommended_keywords && idea.recommended_keywords.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-semibold text-gray-700 mb-1">推奨キーワード:</p>
                              <div className="flex flex-wrap gap-1">
                                {idea.recommended_keywords.map((keyword: string, index: number) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {idea.seo_recommendations && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">記事作成の推奨:</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{idea.seo_recommendations}</p>
                            </div>
                          )}
                        </div>
                      ) : null}
                      <div className="flex gap-2 mt-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            idea.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : idea.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {idea.priority === 'high'
                            ? '高優先度'
                            : idea.priority === 'medium'
                            ? '中優先度'
                            : '低優先度'}
                        </span>
                        {idea.recommendation_score && (
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            推奨度: {Math.round(idea.recommendation_score)}
                          </span>
                        )}
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                          {idea.status === 'pending'
                            ? '保留'
                            : idea.status === 'approved'
                            ? '採用'
                            : idea.status === 'rejected'
                            ? 'ボツ'
                            : idea.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {idea.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateBlogIdeaStatus(idea.id, 'approved')}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            採用
                          </button>
                          <button
                            onClick={() => updateBlogIdeaStatus(idea.id, 'rejected')}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            ボツ
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-gray-500">ブログ候補がありません</div>
          )}
        </div>
      </div>
    </main>
  );
}


