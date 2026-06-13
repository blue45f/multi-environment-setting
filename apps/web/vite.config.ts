/// <reference types="vite/client" />
import path from 'node:path';

import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite SPA (React + React Router v7 + React Compiler).
//
// base: '/' — ABSOLUTE base. SPA는 단일 dist/index.html을 모든 라우트에 폴백
// 서빙하므로 상대 base('./')는 /intro/theory 같은 nested 라우트를 하드로드할 때
// 자산을 현재 URL 깊이 기준으로 잘못 해석해 404가 난다. 절대 base로 두고,
// 서브패스(preview /pr-<n>/) 배포에서는 CloudFront Function(preview-router.js)이
// referer로 PR prefix를 복원해 '/assets/...' 요청을 '/web/pr-<n>/assets/...'로
// 재작성한다(Next의 '/_next/' referer 복원과 동일 패턴). staging/production은
// 배포 루트에서 서빙되어 '/assets/...'가 그대로 맞는다.
//
// SPA history fallback: dist/index.html 만 산출되므로 확장자 없는 경로/디렉터리는
// 호스팅에서 index.html로 폴백되어야 한다. dev/preview는 자동 처리, S3/CloudFront는
// preview-router.js가 document 요청을 루트 index.html로 매핑한다(인프라에서 배선).
export default defineConfig({
  base: '/',
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    fs: {
      // ScriptsPage가 repo 루트 scripts/*.sh 를 ?raw 로 인라인하므로(apps/web 밖),
      // dev server에서 상위 디렉터리 읽기를 허용한다. 빌드 시엔 import 그래프가
      // 그대로 번들에 포함되어 별도 설정 없이 동작한다.
      allow: [path.resolve(__dirname, '../..')],
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
});
