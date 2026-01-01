export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

/**
 * ブログ候補をDBに登録するAPI
 */
export async function POST(request: NextRequest) {
  const supabase = createSupabaseClient();

  try {
    const body = await request.json();
    const { title, summary, content, sources, priority, recommendation_score } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'title is required' },
        { status: 400 }
      );
    }

    // blog_ideasテーブルに挿入
    const { error: insertError } = await supabase.from('blog_ideas').insert({
      title,
      summary: summary || null,
      content: content || null,
      sources: JSON.stringify(sources || []),
      priority: priority || 'medium',
      status: 'pending',
      recommendation_score: recommendation_score || null,
      metadata: JSON.stringify({
        created_via: 'api',
        created_at: new Date().toISOString(),
      }),
    });

    if (insertError) {
      throw insertError;
    }

    // ログを記録
    await supabase.from('logs').insert({
      level: 'info',
      endpoint: '/api/push-blog-idea',
      message: `Blog idea created: ${title}`,
      metadata: JSON.stringify({ title, priority }),
    });

    return NextResponse.json({
      success: true,
      message: 'Blog idea created successfully',
    });
  } catch (error) {
    console.error('Error in push-blog-idea:', error);

    // エラーログを記録
    await supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/push-blog-idea',
      message: error instanceof Error ? error.message : 'Unknown error',
      metadata: JSON.stringify({ error: String(error) }),
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

