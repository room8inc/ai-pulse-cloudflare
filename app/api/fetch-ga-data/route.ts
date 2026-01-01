import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
  const supabase = createSupabaseClient(env);

  try {
    // ログを記録
    await supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/fetch-ga-data',
      message: 'GA fetch skipped (Edge Runtime compatibility mode)',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Google Analytics fetching is currently disabled for Edge Runtime compatibility. Please run the sync script locally.',
      data: { fetched: 0, updated: 0 }
    });

  } catch (error) {
    console.error('Error in fetch-ga-data:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

