import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';

import { NotFoundPage, NOT_FOUND_TITLE } from './NotFoundPage';

// 단위 테스트(pnpm test → vitest). 브랜드 404의 계약을 지킨다: 한글 안내 +
// 멀티환경(cleanup) 맥락 + 복구 경로 두 개. SPA catch-all(`*`)과 정적 404.html
// 폴백에서 이 화면이 사용자에게 그대로 노출되므로 기본/무스타일 404로의 회귀를 막는다.
function render(): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('한글 안내 문구와 PR preview cleanup 맥락을 보여준다', () => {
    const html = render();
    expect(html).toContain('이 경로에는 배포된 산출물이 없습니다');
    expect(html).toContain('/pr-&lt;번호&gt;/'); // <code>/pr-<번호>/</code> — HTML 이스케이프 형태
  });

  it('복구 경로(/, /intro)를 모두 제공한다', () => {
    const html = render();
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/intro"');
  });

  it('페이지 타이틀이 한글 404 제목을 가진다', () => {
    expect(NOT_FOUND_TITLE).toContain('페이지를 찾을 수 없음');
  });
});
