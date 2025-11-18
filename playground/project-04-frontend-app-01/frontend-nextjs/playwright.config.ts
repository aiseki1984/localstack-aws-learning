import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * LocalStack環境のTodoアプリをテスト
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // タイムアウト（LocalStackは遅いため長めに設定）
  timeout: 60000, // 60秒
  
  // 並列実行（LocalStackでは1つずつ実行した方が安定）
  fullyParallel: false,
  
  // CI環境では失敗時にリトライ
  retries: process.env.CI ? 2 : 1,
  
  // ワーカー数（LocalStackでは並列実行を避ける）
  workers: 1,
  
  // レポーター
  reporter: 'html',
  
  use: {
    // LocalStackのS3エンドポイント
    baseURL: 'http://todo-app-bucket.s3.localhost.localstack.cloud:4566',
    
    // トレース（デバッグ用）
    trace: 'on-first-retry',
    
    // スクリーンショット
    screenshot: 'only-on-failure',
    
    // ナビゲーションタイムアウト
    navigationTimeout: 30000,
    
    // アクションタイムアウト
    actionTimeout: 10000,
  },

  // テストするブラウザ
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 開発サーバー（すでにLocalStackで起動済みなのでコメントアウト）
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
