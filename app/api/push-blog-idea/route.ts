import { NextRequest, NextResponse } from 'next/server';

/**
 * ブログ候補をDBに登録するAPI
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: 実装予定
    const body = await request.json();
    return NextResponse.json({ 
      success: true, 
      message: 'push-blog-idea endpoint (to be implemented)',
      data: body 
    });
  } catch (error) {
    console.error('Error in push-blog-idea:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

