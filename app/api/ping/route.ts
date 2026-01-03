export const runtime = "edge";

import { NextResponse } from 'next/server';

/**
 * 最もシンプルなテストエンドポイント
 * D1やgetRequestContextを使わず、エンドポイントが動作するかを確認
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString(),
  });
}

// Trigger redeploy for nodejs_compat_v2 flag - Sat Jan  3 21:44:11 JST 2026
