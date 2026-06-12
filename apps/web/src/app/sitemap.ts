import type { MetadataRoute } from 'next';

import { SITE_URL } from '../lib/site';

// 색인 대상 production 라우트 목록. 빌드 시 out/sitemap.xml 로 정적 생성된다.
//
// trailingSlash: true(next.config.ts)에 맞춰 URL도 디렉터리형(`/intro/`)으로 적는다.
// lastModified는 빌드 시각 — build-once 구조에서는 곧 "마지막 릴리즈 빌드 시각"이다.

// output: 'export'에서는 메타데이터 라우트도 정적임을 명시해야 빌드가 통과한다.
export const dynamic = 'force-static';

const productionRoutes = ['/', '/intro/', '/intro/setup/', '/intro/scripts/', '/intro/operations/'];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return productionRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route === '/intro/' ? 0.8 : 0.7,
  }));
}
