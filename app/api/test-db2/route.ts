export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server';

/**
 * D1データベース接続テスト用API (getRequestContextを使わないバージョン)
 * process.envからD1バインディングを取得
 */
export async function GET(request: NextRequest) {
  try {
    // グローバル変数からenvを取得を試みる
    const globalEnv = (globalThis as any).__env__ || 
                      (globalThis as any).__CF_PAGES_ENV__ ||
                      (globalThis as any).process?.env ||
                      {};

    // requestからenvを取得を試みる
    const requestEnv = (request as any).env || {};

    const debugInfo = {
      hasGlobalEnv: Object.keys(globalEnv).length > 0,
      globalEnvKeys: Object.keys(globalEnv),
      hasRequestEnv: Object.keys(requestEnv).length > 0,
      requestEnvKeys: Object.keys(requestEnv),
      hasGlobalDB: !!globalEnv.DB,
      hasRequestDB: !!requestEnv.DB,
    };

    // DBバインディングを探す
    const db = requestEnv.DB || globalEnv.DB;

    if (!db) {
      return NextResponse.json({
        success: false,
        error: 'D1 binding not found',
        debugInfo,
        suggestion: 'Cloudflare PagesダッシュボードでD1バインディング(DB)を設定してください',
      }, { status: 500 });
    }

    // テーブル一覧を取得
    const result = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();

    return NextResponse.json({
      success: true,
      message: 'D1接続成功！',
      tables: result.results?.map((t: any) => t.name) || [],
      debugInfo,
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

