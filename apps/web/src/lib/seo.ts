import { SITE_URL } from './site';

// Next robots.ts / sitemap.ts route handler를 Vite SPA에 맞게 순수 생성기로 추출했다.
// 빌드 산출물에 정적 파일이 없으면 안 되므로, 이 생성기로 만든 문자열을
// public/robots.txt · public/sitemap.xml 로 커밋해 둔다(scripts/gen-seo.mjs 가 재생성).
// 이 모듈은 robots.test.ts / sitemap.test.ts 의 회귀 계약 단일 소스이기도 하다.

// 색인 대상 production 라우트. trailingSlash 정합을 위해 디렉터리형으로 적는다.
export const productionRoutes = [
  '/',
  '/intro/',
  '/intro/setup/',
  '/intro/scripts/',
  '/intro/operations/',
] as const;

export type SitemapEntry = {
  url: string;
  changeFrequency: 'weekly' | 'monthly';
  priority: number;
};

export function buildSitemapEntries(): SitemapEntry[] {
  return productionRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    changeFrequency: route === '/' ? 'weekly' : 'monthly',
    priority: route === '/' ? 1 : route === '/intro/' ? 0.8 : 0.7,
  }));
}

// robots.txt 본문. preview(/pr-)·staging(/staging/) prefix를 차단한다.
export function buildRobotsTxt(): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /pr-',
    'Disallow: /staging/',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].join('\n');
}

export function buildSitemapXml(lastModified: string): string {
  const urls = buildSitemapEntries()
    .map((entry) =>
      [
        '  <url>',
        `    <loc>${entry.url}</loc>`,
        `    <lastmod>${lastModified}</lastmod>`,
        `    <changefreq>${entry.changeFrequency}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ].join('\n'),
    )
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}
