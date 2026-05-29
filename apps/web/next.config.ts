import type { NextConfig } from 'next';

// 정적 export 설정 (가이드 Pattern C — S3 + CloudFront 직접 서빙)
const nextConfig: NextConfig = {
  // out/ 디렉터리에 순수 정적 산출물(HTML/CSS/JS)을 생성한다.
  // 워크플로(deploy.yml / preview.yml)가 apps/web/out 을 그대로 S3에 업로드한다.
  output: 'export',

  // static export 에서는 Next Image 최적화 서버가 없으므로 반드시 비활성화한다.
  images: { unoptimized: true },

  // trailingSlash 를 켜면 `/foo` 라우트가 `out/foo/index.html` 로 출력된다.
  //  - S3/CloudFront 는 디렉터리 요청(`/foo/`)을 `index.html` 로 매핑하는 것이 자연스럽다.
  //  - CloudFront Function(preview-router.js)이 host → `/web/pr-<n>/` prefix 로 재작성한 뒤
  //    그대로 디렉터리형 경로로 도달하므로, `index.html` 매핑이 끊기지 않는다.
  //  - 즉 정적 호스팅의 라우팅 규칙과 1:1로 맞아 404 위험을 줄인다.
  trailingSlash: true,
};

export default nextConfig;
