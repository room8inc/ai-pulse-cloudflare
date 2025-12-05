import { initDatabase } from './init-db';

/**
 * アプリ起動時にデータベースを初期化
 * サーバーサイドでのみ実行
 */
let dbInitialized = false;

export function ensureDatabaseInitialized() {
  if (dbInitialized) {
    return;
  }

  try {
    initDatabase();
    dbInitialized = true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // エラーでも続行（開発中は問題ない）
  }
}

