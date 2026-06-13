import path from 'node:path';

import { defineConfig } from 'vitest/config';

// 단위 테스트만 담당한다. Playwright smoke(tests/smoke)는 제외해 충돌을 막는다.
// not-found.test.tsx 가 react-dom/server 로 마크업을 렌더하므로 jsdom 이 필요하다.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/**', 'node_modules/**', 'dist/**'],
    environment: 'jsdom',
  },
});
