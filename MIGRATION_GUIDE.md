# Cloudflare Pages + D1 + R2 移行ガイド

このドキュメントは、既存のNext.js + SQLiteプロジェクトをCloudflare Pages + D1 + R2に移行する際の変更点と注意事項を説明します。

## 主な変更点

### 1. データベースクライアント（lib/db.ts）

- **変更前**: `better-sqlite3`を使用した同期的なデータベース操作
- **変更後**: Cloudflare D1を使用した非同期のデータベース操作

**影響**:
- すべてのデータベース操作が非同期になりました
- `.all()`, `.insert()`, `.update()`, `.delete()`などのメソッドに`await`が必要です

### 2. APIルートの変更

すべてのAPIルートで以下の変更が必要です：

#### 変更前
```typescript
export async function GET(request: NextRequest) {
  const supabase = createSupabaseClient();
  const { data } = supabase.from('table').select('*').all();
  // ...
}
```

#### 変更後
```typescript
export async function GET(request: NextRequest) {
  const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
  const supabase = createSupabaseClient(env);
  const { data } = await supabase.from('table').select('*').all();
  // ...
}
```

### 3. 非同期処理の修正が必要なAPIルート

以下のAPIルートで、データベース操作に`await`を追加する必要があります：

- `app/api/fetch-official/route.ts` ✅ 修正済み
- `app/api/fetch-community/route.ts`
- `app/api/fetch-twitter/route.ts`
- `app/api/fetch-twitter-scrape/route.ts`
- `app/api/fetch-arena/route.ts`
- `app/api/fetch-ga-data/route.ts`
- `app/api/fetch-search-console/route.ts`
- `app/api/analyze-trends/route.ts`
- `app/api/analyze-blog-performance/route.ts`
- `app/api/summarize-today/route.ts`
- `app/api/push-blog-idea/route.ts`
- `app/api/dashboard/stats/route.ts`
- `app/api/dashboard/blog-ideas/route.ts`
- `app/api/clear-and-refetch/route.ts`

### 4. データベース初期化（lib/init-db.ts）

- **変更前**: ファイルシステムからSQLファイルを読み込んで実行
- **変更後**: D1データベースインスタンスを引数として受け取り、SQLを実行

**注意**: Cloudflare Pages環境では、通常は`wrangler d1 migrations apply`コマンドでマイグレーションを実行します。

### 5. 環境変数の取得

Cloudflare Pages環境では、環境変数の取得方法が異なります：

```typescript
// Cloudflare Pages環境
const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
const db = createSupabaseClient(env);
```

## 修正が必要なパターン

### パターン1: データ取得

```typescript
// ❌ 変更前
const { data } = supabase.from('table').select('*').all();

// ✅ 変更後
const { data } = await supabase.from('table').select('*').all();
```

### パターン2: データ挿入

```typescript
// ❌ 変更前
const { error } = supabase.from('table').insert({ ... });

// ✅ 変更後
const { error } = await supabase.from('table').insert({ ... });
```

### パターン3: データ更新

```typescript
// ❌ 変更前
const { error } = supabase.from('table').update({ ... }).eq('id', id);

// ✅ 変更後
const { error } = await supabase.from('table').update({ ... }).eq('id', id);
```

### パターン4: データ削除

```typescript
// ❌ 変更前
const { error } = supabase.from('table').delete().eq('id', id);

// ✅ 変更後
const { error } = await supabase.from('table').delete().eq('id', id);
```

### パターン5: 単一レコード取得

```typescript
// ❌ 変更前
const { data } = supabase.from('table').select('*').eq('id', id).single();

// ✅ 変更後
const { data } = await supabase.from('table').select('*').eq('id', id).single();
```

## 修正手順

1. **APIルートを開く**
2. **envの取得を追加**:
   ```typescript
   const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
   const supabase = createSupabaseClient(env);
   ```
3. **すべてのデータベース操作に`await`を追加**
4. **テストを実行**

## 注意事項

### D1の制限事項

- D1はSQLiteベースですが、一部のSQL構文がサポートされていない場合があります
- トリガーはサポートされていますが、制限がある場合があります
- トランザクションはサポートされています

### パフォーマンス

- D1は非同期処理のため、複数のクエリを並列実行できます
- 大量のデータを扱う場合は、バッチ処理を検討してください

### ローカル開発

- ローカル開発時は、`wrangler pages dev`を使用します
- ローカルD1データベースを使用する場合は、`wrangler d1 migrations apply --local`を実行します

## 参考

- [Cloudflare D1 ドキュメント](https://developers.cloudflare.com/d1/)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)
- [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md)

