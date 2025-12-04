import { NextRequest, NextResponse } from 'next/server';

/**
 * Twitter/X投稿を取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: 実装予定
    return NextResponse.json({ 
      success: true, 
      message: 'fetch-twitter endpoint (to be implemented)',
      data: [] 
    });
  } catch (error) {
    console.error('Error in fetch-twitter:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

