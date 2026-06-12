import { describe, it, expect } from 'vitest';

import { SITE_URL } from '../lib/site';
import sitemap from './sitemap';

// 단위 테스트(pnpm test → vitest). 색인 대상 라우트와 trailingSlash 정합을 지킨다.
describe('sitemap', () => {
  it('production 라우트와 intro 하위 라우트만 포함한다', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/intro/`,
      `${SITE_URL}/intro/setup/`,
      `${SITE_URL}/intro/scripts/`,
      `${SITE_URL}/intro/operations/`,
    ]);
  });

  it('모든 엔트리가 절대 URL + 디렉터리형(trailingSlash) + 빌드 시각을 가진다', () => {
    for (const entry of sitemap()) {
      expect(entry.url.startsWith(`${SITE_URL}/`)).toBe(true);
      expect(entry.url.endsWith('/')).toBe(true);
      expect(entry.lastModified).toBeInstanceOf(Date);
    }
  });
});
