import { base, react, defineConfig } from '@heejun/eslint-config'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'

export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/tests/**',
    '**/.vercel/**',
    '**/*.d.ts',
    '**/*.tsbuildinfo',
    '**/*.config.{js,mjs,cjs,ts}',
  ]),

  // 공유 베이스(TS + import 위생 + prettier 충돌 비활성).
  base({ files: ['**/*.{ts,tsx}'], tsconfigRootDir: import.meta.dirname }),

  // React 19 + Vite + React Compiler — src 와 env.schema 에만 적용.
  react({ files: ['src/**/*.{ts,tsx}', 'env.schema.ts'] }),

  // GeneratorPage 는 GitHub Actions YAML / Makefile / shell 을 JS 템플릿 리터럴로
  // 생성한다. `\${{ ... }}` 는 JS 보간(${...})을 막기 위한 필수 이스케이프이고,
  // `\$(...)`/`\$VAR` 는 생성 산출물을 리터럴로 유지하기 위한 의도적·일관된 표기다.
  // no-useless-escape 는 이 패턴을 오탐하므로 이 파일에서만 끈다(출력 보존).
  {
    files: ['src/pages/intro/GeneratorPage.tsx'],
    rules: {
      'no-useless-escape': 'off',
    },
  },

  // 테스트 — Vitest globals; fast-refresh 제약 완화.
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-refresh/only-export-components': 'off',
    },
  }
)
