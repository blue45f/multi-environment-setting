import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// 단위 테스트(pnpm test → vitest). 헤더·푸터·히어로의 중간 브레이크포인트(600·768·834·1024px)
// 반응형 계약을 고정한다:
// - 3존 topbar 는 641~920px 단일행 구간에서 항목 단위로 wrap 되고, 라벨은 절대 접히지 않는다.
// - runtime 카드의 한글 제목/요약은 921~1100px 좁은 카드에서 어절(keep-all) 단위로만 줄바꿈한다.
// - env-card 라우트 값(/production/current/)은 921~1035px 3열 구간에서 카드 밖으로 새지 않는다.
// - 전역 푸터는 wrap + ≤700px 컬럼 폴백을 유지한다.
// jsdom 으로는 레이아웃 계산을 검증할 수 없으므로 globals.css 의 선언 자체를 계약으로 삼는다
// (실 렌더링 검증은 Playwright smoke 영역).
const css = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 해당 선택자로 시작하는 모든 규칙 블록 본문을 모은다(미디어쿼리 내부 포함).
// 그룹 선택자의 중간 멤버(뒤에 콤마)나 더 긴 선택자(.topbar__links 등)는 매칭하지 않는다.
function ruleBodies(selector: string): string[] {
  const pattern = new RegExp(`(?:^|[\\s,])${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`, 'g');
  return [...css.matchAll(pattern)].map((match) => match[1]);
}

function expectDeclaration(selector: string, declaration: string): void {
  const bodies = ruleBodies(selector);
  expect(bodies.length, `선택자를 찾지 못함: ${selector}`).toBeGreaterThan(0);
  expect(
    bodies.some((body) => body.includes(declaration)),
    `${selector} 블록에 "${declaration}" 선언이 없다`,
  ).toBe(true);
}

describe('globals.css 중간 브레이크포인트 계약', () => {
  it('3존 topbar 는 graceful wrap 을 선언하고 라벨은 nowrap 으로 고정한다', () => {
    expectDeclaration('.topbar', 'flex-wrap: wrap');
    expectDeclaration('.topbar__links', 'flex-wrap: wrap');
    expectDeclaration('.topbar__links', 'white-space: nowrap');
    expectDeclaration('.brand-chip', 'white-space: nowrap');
    expectDeclaration('.theme-toggle', 'white-space: nowrap');
  });

  it('모바일(≤640px) topbar 는 컬럼 스택 폴백을 유지한다', () => {
    expectDeclaration('.topbar', 'flex-direction: column');
  });

  it('runtime 카드의 한글 제목/요약은 어절 단위(keep-all)로 줄바꿈한다', () => {
    expect(css).toMatch(
      /\.runtime-card h2,\s*\.runtime-card__summary\s*\{[^}]*word-break: keep-all/,
    );
  });

  it('env-card 라우트 값은 좁은 3열 카드 안에서 줄바꿈된다(overflow 금지)', () => {
    expectDeclaration('.env-card dl div', 'minmax(0, 1fr)');
    expectDeclaration('.env-card dd', 'min-width: 0');
    expectDeclaration('.env-card dd', 'word-break: break-word');
  });

  it('전역 푸터는 wrap 과 모바일 컬럼 폴백을 유지한다', () => {
    expectDeclaration('.global-site-footer', 'flex-wrap: wrap');
    expectDeclaration('.global-site-footer', 'flex-direction: column');
  });
});
