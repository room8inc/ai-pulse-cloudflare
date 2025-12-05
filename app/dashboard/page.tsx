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
}

interface BlogIdea {
  id: string;
  title: string;
  summary: string;
  priority: string;
  status: string;
  recommendation_score?: number;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [blogIdeas, setBlogIdeas] = useState<BlogIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 統計データを取得
        const statsResponse = await fetch('/api/dashboard/stats');
        const statsResult = await statsResponse.json();
        if (statsResult.success) {
          setStats(statsResult.data);
        }

        // ブログ候補を取得
        const ideasResponse = await fetch('/api/dashboard/blog-ideas');
        const ideasResult = await ideasResponse.json();
        if (ideasResult.success) {
          setBlogIdeas(ideasResult.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const updateBlogIdeaStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/dashboard/blog-ideas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const result = await response.json();
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
      <h1 className="text-3xl font-bold mb-6">ダッシュボード</h1>

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

      {/* 最新の公式アップデート */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">最新の公式アップデート</h2>
        <div className="border rounded-lg overflow-hidden">
          {stats?.recentOfficial && stats.recentOfficial.length > 0 ? (
            <ul className="divide-y">
              {stats.recentOfficial.slice(0, 5).map((item: any) => (
                <li key={item.id} className="p-4 hover:bg-gray-50">
                  <a
                    href={item.url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    <h3 className="font-semibold">{item.title}</h3>
                  </a>
                  <p className="text-sm text-gray-500 mt-1">
                    {item.source} • {new Date(item.published_at).toLocaleDateString('ja-JP')}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-gray-500">データがありません</div>
          )}
        </div>
      </div>

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
                        <p className="text-gray-600 mt-2">{idea.summary}</p>
                      )}
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


