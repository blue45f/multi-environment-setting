import type { MetadataRoute } from 'next';

import { SITE_URL } from '../lib/site';

// 크롤 정책 — 빌드 시 out/robots.txt 로 정적 생성된다.
//
// disallow 의 실제 적용 범위: 이 규칙은 "단일 호스트에서 /pr-<n>/·/staging/
// path-prefix 로 같은 산출물의 사본을 서빙하는 배치"(기본 도메인 path preview,
// S3 버킷 루트 직서빙)에 대한 방어선이다 — 그 배치에서만 사본 크롤을 줄여 준다.
//
// 레퍼런스 인프라의 staging/production(CloudFront origin_path 분리)과 커스텀
// 도메인 preview(pr-<n>.preview.example.com)는 호스트 자체가 갈리므로 이 path
// 규칙이 닿지 않는다. 그 배치의 실제 경계는 robots 가 아니라 접근 제어
// (ENVIRONMENTS.md: preview 에 basic auth/SSO/allowlist 권장)나 CDN 응답 헤더
// (X-Robots-Tag: noindex)다.

// output: 'export'에서는 메타데이터 라우트도 정적임을 명시해야 빌드가 통과한다.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // robots 규칙은 prefix 매칭: '/pr-' 가 /pr-123/ 등 모든 PR preview를 가린다.
      disallow: ['/pr-', '/staging/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
