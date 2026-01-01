import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
  const supabase = createSupabaseClient(env);

  try {
    await supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/fetch-search-console',
      message: 'Search Console fetch skipped (Edge Runtime compatibility mode)',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Search Console fetching is currently disabled for Edge Runtime compatibility. Please run the sync script locally.',
      data: { fetched: 0, updated: 0 }
    });

  } catch (error) {
    console.error('Error in fetch-search-console:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}

