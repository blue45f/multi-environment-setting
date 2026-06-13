import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, it, expect } from 'vitest';

import { buildRobotsTxt, buildSitemapEntries, productionRoutes } from './seo';
import { SITE_URL } from './site';

// 단위 테스트(pnpm test → vitest). Next robots.ts/sitemap.ts 라우트 핸들러를 정적
// public/robots.txt · public/sitemap.xml 로 포팅했다. 환경 경계(robots disallow)와
// 색인 라우트 회귀를 막고, 커밋된 정적 파일이 생성기 출력과 일치하는지 검증한다.

describe('robots', () => {
  it('production 루트는 허용하고 preview/staging prefix는 차단한다', () => {
    const txt = buildRobotsTxt();
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Allow: /');
    expect(txt).toContain('Disallow: /pr-');
    expect(txt).toContain('Disallow: /staging/');
  });

  it('sitemap 참조는 SITE_URL 기준 절대 URL이다', () => {
    expect(buildRobotsTxt()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });

  it('커밋된 public/robots.txt 가 생성기 출력과 일치한다', () => {
    const onDisk = readFileSync(path.resolve(process.cwd(), 'public/robots.txt'), 'utf8');
    expect(onDisk).toBe(buildRobotsTxt());
  });
});

describe('sitemap', () => {
  it('production 라우트와 intro 하위 라우트만 포함한다', () => {
    const urls = buildSitemapEntries().map((entry) => entry.url);
    expect(urls).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/intro/`,
      `${SITE_URL}/intro/setup/`,
      `${SITE_URL}/intro/scripts/`,
      `${SITE_URL}/intro/operations/`,
    ]);
  });

  it('모든 엔트리가 절대 URL + 디렉터리형(trailingSlash)을 가진다', () => {
    for (const entry of buildSitemapEntries()) {
      expect(entry.url.startsWith(`${SITE_URL}/`)).toBe(true);
      expect(entry.url.endsWith('/')).toBe(true);
    }
  });

  it('홈은 weekly/priority 1, 하위 라우트는 monthly 다', () => {
    const [home, ...rest] = buildSitemapEntries();
    expect(home.changeFrequency).toBe('weekly');
    expect(home.priority).toBe(1);
    for (const entry of rest) {
      expect(entry.changeFrequency).toBe('monthly');
    }
  });

  it('커밋된 public/sitemap.xml 이 모든 색인 라우트를 담는다', () => {
    const xml = readFileSync(path.resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
    for (const route of productionRoutes) {
      expect(xml).toContain(`<loc>${SITE_URL}${route}</loc>`);
    }
  });
});
