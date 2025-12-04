export default function DashboardPage() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">ダッシュボード</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">今日のアップデート</h2>
          <p className="text-gray-600">（実装予定）</p>
        </div>
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">声のサマリー</h2>
          <p className="text-gray-600">（実装予定）</p>
        </div>
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">モデル別タイムライン</h2>
          <p className="text-gray-600">（実装予定）</p>
        </div>
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">トレンド可視化</h2>
          <p className="text-gray-600">（実装予定）</p>
        </div>
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">ブログ候補</h2>
          <p className="text-gray-600">（実装予定）</p>
        </div>
      </div>
    </main>
  );
}

