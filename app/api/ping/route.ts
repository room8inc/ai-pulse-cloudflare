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

