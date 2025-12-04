import { NextRequest, NextResponse } from 'next/server';

/**
 * 収集データをLLMで統合サマリー化するAPI
 * Cron: 毎朝8時実行
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: 実装予定
    return NextResponse.json({ 
      success: true, 
      message: 'summarize-today endpoint (to be implemented)',
      data: [] 
    });
  } catch (error) {
    console.error('Error in summarize-today:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

