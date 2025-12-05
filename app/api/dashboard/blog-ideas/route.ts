import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';

/**
 * ブログ候補一覧を取得するAPI
 */
export async function GET(request: NextRequest) {
  try {
    const db = createSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    let query = db.from('blog_ideas').select('*');

    if (status !== 'all') {
      // statusでフィルタリング（将来的に実装）
      // 現時点では全件取得
    }

    const { data: ideas } = query.all();

    // 優先度と推奨度でソート
    const sortedIdeas = (ideas || []).sort((a: any, b: any) => {
      // 優先度: high > medium > low
      const priorityOrder: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // 推奨度でソート
      const scoreA = a.recommendation_score || 0;
      const scoreB = b.recommendation_score || 0;
      return scoreB - scoreA;
    });

    return NextResponse.json({
      success: true,
      data: sortedIdeas,
    });
  } catch (error) {
    console.error('Error in dashboard/blog-ideas:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * ブログ候補のステータスを更新するAPI
 */
export async function PATCH(request: NextRequest) {
  try {
    const db = createSupabaseClient();
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'id and status are required' },
        { status: 400 }
      );
    }

    const { error } = db.from('blog_ideas').update({ status }).eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Blog idea status updated',
    });
  } catch (error) {
    console.error('Error updating blog idea:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

