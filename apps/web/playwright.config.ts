import { defineConfig, devices } from '@playwright/test';

// 배포된 URL 기준 smoke 테스트. BASE_URL은 워크플로가 preview/staging/production URL로 주입한다.
export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
