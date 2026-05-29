import { defineConfig } from 'vitest/config';

// 단위 테스트만 담당한다. Playwright smoke(tests/smoke)는 제외해 충돌을 막는다.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['tests/**', 'node_modules/**', '.next/**', 'out/**'],
    environment: 'node',
  },
});
