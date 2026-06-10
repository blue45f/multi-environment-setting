import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';

import NotFound, { metadata } from './not-found';

// 단위 테스트(pnpm test → vitest). out/404.html 로 내보내지는 브랜드 404의 계약을 지킨다:
// 한글 안내 + 멀티환경(cleanup) 맥락 + 복구 경로 두 개. S3/CloudFront 미스 시 이 화면이
// 사용자에게 그대로 서빙되므로, Next 기본 404(영문·무스타일)로의 회귀를 막는다.
describe('not-found', () => {
  it('한글 안내 문구와 PR preview cleanup 맥락을 보여준다', () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain('이 경로에는 배포된 산출물이 없습니다');
    expect(html).toContain('/pr-&lt;번호&gt;/'); // <code>/pr-<번호>/</code> — HTML 이스케이프 형태
  });

  it('복구 경로(/, /intro)를 모두 제공한다', () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/intro"');
  });

  it('metadata title이 한글 404 제목을 가진다', () => {
    expect(metadata.title).toContain('페이지를 찾을 수 없음');
  });
});
