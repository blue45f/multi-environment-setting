import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/node_modules/**',
    '**/tests/**',
    '**/*.d.ts',
    '**/*.tsbuildinfo',
    '**/*.config.{js,mjs,cjs,ts}',
  ]),

  // Base TS rules.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unsafe-function-type': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unused-expressions': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'error',
      'prefer-const': 'error',
      'no-useless-assignment': 'error',
    },
  },

  // React 19 + Vite + React Compiler (browser).
  {
    files: ['src/**/*.{ts,tsx}', 'env.schema.ts'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      'react-hooks/rules-of-hooks': 'error',
      // react-hooks v7 ships React Compiler diagnostics; enforce them as errors.
      'react-hooks/set-state-in-effect': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/incompatible-library': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/refs': 'error',
      'react-hooks/preserve-manual-memoization': 'error',
      'react-hooks/static-components': 'error',
    },
  },

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

  // Test files — Vitest globals; relax fast-refresh constraint.
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
