import { describe, it, expect } from 'vitest';

import { SITE_URL } from '../lib/site';
import robots from './robots';

// 단위 테스트(pnpm test → vitest). 환경 경계(robots disallow) 회귀를 막는다.
describe('robots', () => {
  it('production 루트는 허용하고 preview/staging prefix는 차단한다', () => {
    expect(robots().rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: ['/pr-', '/staging/'],
    });
  });

  it('sitemap 참조는 SITE_URL 기준 절대 URL이다', () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
