import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/init-db';

/**
 * データベースを初期化するAPI
 * 初回セットアップ時やスキーマ変更時に実行
 */
export async function GET(request: NextRequest) {
  try {
    initDatabase();
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

