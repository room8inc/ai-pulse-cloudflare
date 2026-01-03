export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

/**
 * D1データベース接続テスト用API
 * シンプルにD1に接続できるかを確認する
 */
export async function GET(request: NextRequest) {
  const debugInfo: any = {
    step: 'start',
    timestamp: new Date().toISOString(),
  };

  try {
    // Step 1: getRequestContext()を試す
    debugInfo.step = 'getting context';
    let env: any = null;
    let contextError: string | null = null;

    try {
      const context = getRequestContext();
      env = context.env;
      debugInfo.contextAvailable = true;
      debugInfo.envKeys = Object.keys(env || {});
    } catch (e) {
      contextError = e instanceof Error ? e.message : String(e);
      debugInfo.contextAvailable = false;
      debugInfo.contextError = contextError;
    }

    // Step 2: DBバインディングの確認
    debugInfo.step = 'checking DB binding';
    if (!env?.DB) {
      return NextResponse.json({
        success: false,
        error: 'D1 binding "DB" not found',
        debugInfo,
        message: 'D1データベースバインディングが見つかりません。Cloudflare PagesダッシュボードでD1バインディングを設定してください。',
      }, { status: 500 });
    }

    debugInfo.dbBindingFound = true;

    // Step 3: 簡単なクエリを実行
    debugInfo.step = 'executing test query';
    const db = env.DB;
    
    // テーブル一覧を取得
    const tablesResult = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();
    
    debugInfo.tables = tablesResult.results?.map((t: any) => t.name) || [];

    // Step 4: raw_eventsテーブルのカウント
    debugInfo.step = 'counting raw_events';
    let rawEventsCount = 0;
    try {
      const countResult = await db.prepare(
        "SELECT COUNT(*) as count FROM raw_events"
      ).first();
      rawEventsCount = countResult?.count || 0;
    } catch (e) {
      debugInfo.rawEventsError = e instanceof Error ? e.message : String(e);
    }

    // Step 5: blog_ideasテーブルのカウント
    debugInfo.step = 'counting blog_ideas';
    let blogIdeasCount = 0;
    try {
      const countResult = await db.prepare(
        "SELECT COUNT(*) as count FROM blog_ideas"
      ).first();
      blogIdeasCount = countResult?.count || 0;
    } catch (e) {
      debugInfo.blogIdeasError = e instanceof Error ? e.message : String(e);
    }

    debugInfo.step = 'complete';

    return NextResponse.json({
      success: true,
      message: 'D1データベース接続成功！',
      data: {
        tables: debugInfo.tables,
        rawEventsCount,
        blogIdeasCount,
      },
      debugInfo,
    });

  } catch (error) {
    debugInfo.step = 'error';
    debugInfo.error = error instanceof Error ? error.message : String(error);
    debugInfo.errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debugInfo,
    }, { status: 500 });
  }
}

