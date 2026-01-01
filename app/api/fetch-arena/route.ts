export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/db';
import { fetchArenaScores } from '@/utils/arena-fetcher';

/**
 * LMSYS/Arenaスコアを取得するAPI
 * Cron: 毎時実行
 */
export async function GET(request: NextRequest) {
  const env = (request as any).env || (globalThis as any).__CF_PAGES_ENV__;
  const supabase = createSupabaseClient(env);
  const results = {
    success: 0,
    failed: 0,
    total: 0,
    errors: [] as string[],
  };

  try {
    const scores = await fetchArenaScores();
    results.total = scores.length;

    // 各スコアをraw_eventsテーブルに保存
    for (const score of scores) {
      // 重複チェック（同じモデルで最新のデータが既に存在するか）
      const { data: existing } = await supabase
        .from('raw_events')
        .select('id')
        .eq('source', 'arena')
        .eq('title', score.model)
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // 1時間以内
        .single();

      if (existing) {
        // 既に1時間以内に取得済みの場合はスキップ
        continue;
      }

      // IDを生成
      const generateId = () => {
        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);
        return Array.from(randomBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
          .toLowerCase();
      };

      // raw_eventsテーブルに挿入
      const { error: insertError } = await supabase.from('raw_events').insert({
        id: generateId(),
        source: 'arena',
        source_type: 'arena',
        title: `${score.model} - Arena Score`,
        content: `Rank: ${score.rank}, Score: ${score.score}, Votes: ${score.votes}`,
        url: 'https://arena.lmsys.org',
        author: 'LMSYS',
        published_at: score.updatedAt.toISOString(),
        metadata: JSON.stringify({
          model: score.model,
          score: score.score,
          rank: score.rank,
          votes: score.votes,
        }),
      });

      if (insertError) {
        console.error(`Error inserting Arena score for ${score.model}:`, insertError);
        results.failed++;
        results.errors.push(`${score.model}: ${String(insertError)}`);
      } else {
        results.success++;
      }
    }

    // ログを記録
    await supabase.from('logs').insert({
      level: results.failed > 0 ? 'warning' : 'info',
      endpoint: '/api/fetch-arena',
      message: `Fetched ${results.success} Arena scores, ${results.failed} failed`,
      metadata: JSON.stringify({
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
      }),
    });

    return NextResponse.json({
      success: true,
      message: 'fetch-arena completed',
      data: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors,
        scores: scores.map((s) => ({
          model: s.model,
          score: s.score,
          rank: s.rank,
        })),
      },
    });
  } catch (error) {
    console.error('Error in fetch-arena:', error);

    // エラーログを記録
    await supabase.from('logs').insert({
      level: 'error',
      endpoint: '/api/fetch-arena',
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

