import { NextRequest, NextResponse } from 'next/server';

/**
 * LMSYS/Arenaスコアを取得するAPI
 * Cron: 毎時実行
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: 実装予定
    return NextResponse.json({ 
      success: true, 
      message: 'fetch-arena endpoint (to be implemented)',
      data: [] 
    });
  } catch (error) {
    console.error('Error in fetch-arena:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

