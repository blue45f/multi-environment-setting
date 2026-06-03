import { test, expect } from '@playwright/test';

// Core Web Vitals / 성능 회귀 가드.
//
// 이 smoke는 preview.yml / deploy.yml(staging·production) / e2e-local.sh 가 돌리는
// `playwright test tests/smoke` 에 그대로 포함되므로, 배포된 실제 URL마다 성능 신호를
// 측정한다. 목적은 "정확한 점수 측정"이 아니라 "굵직한 회귀(번들 폭증·렌더 차단·레이아웃
// 점프)를 배포 게이트에서 잡는 것"이다. 따라서 예산(budget)은 넉넉하게 잡아 CI 플레이키를
// 피하고, 필요하면 환경변수로 환경별 조정이 가능하게 한다.
//
// 추가 의존성 없음: 브라우저 네이티브 PerformanceObserver(LCP / layout-shift) +
// Navigation Timing(TTFB / DOMContentLoaded / load) 만 사용한다. web-vitals npm 패키지를
// 끌어오지 않고도 Chromium에서 핵심 지표를 직접 읽을 수 있다.

// 예산(ms / 단위 없음). 환경별로 빡세게/느슨하게 조정하려면 워크플로에서 env로 덮어쓴다.
const num = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// 기본값은 Google "good" 임계의 약 2배(=배포를 막을 만한 명백한 회귀에서만 실패).
const BUDGET = {
  lcpMs: num('PERF_BUDGET_LCP_MS', 4000), // good ≤ 2500
  cls: num('PERF_BUDGET_CLS', 0.25), // good ≤ 0.1
  ttfbMs: num('PERF_BUDGET_TTFB_MS', 3000), // good ≤ 800 (CDN miss 여유)
  loadMs: num('PERF_BUDGET_LOAD_MS', 8000), // 전체 load 상한
};

type WebVitals = {
  lcpMs: number | null;
  cls: number;
  ttfbMs: number | null;
  domContentLoadedMs: number | null;
  loadMs: number | null;
};

test('@preview Core Web Vitals 가 성능 예산 안에 있다', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });

  // 페이지 로드 후 stage가 채워질 때까지 기다린다(런타임 config 적용 완료 시점).
  await expect(page.getByTestId('stage')).not.toHaveText('loading...');

  const vitals = await page.evaluate<WebVitals>(async () => {
    const navEntry = performance.getEntriesByType(
      'navigation',
    )[0] as PerformanceNavigationTiming | undefined;

    // LCP / CLS 는 PerformanceObserver 버퍼에서 읽는다(buffered: true 로 과거 엔트리 포함).
    const lcp = await new Promise<number | null>((resolve) => {
      try {
        let last: number | null = null;
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const tail = entries[entries.length - 1] as PerformanceEntry & {
            renderTime?: number;
            loadTime?: number;
          };
          if (tail) last = tail.renderTime || tail.loadTime || tail.startTime;
        });
        obs.observe({ type: 'largest-contentful-paint', buffered: true });
        // 추가 LCP 후보가 더 들어오지 않도록 잠깐 대기 후 확정.
        setTimeout(() => {
          obs.disconnect();
          resolve(last);
        }, 500);
      } catch {
        resolve(null);
      }
    });

    let cls = 0;
    try {
      const clsEntries = performance.getEntriesByType('layout-shift') as Array<
        PerformanceEntry & { value: number; hadRecentInput: boolean }
      >;
      for (const e of clsEntries) {
        if (!e.hadRecentInput) cls += e.value;
      }
    } catch {
      cls = 0;
    }

    return {
      lcpMs: lcp,
      cls,
      ttfbMs: navEntry ? navEntry.responseStart - navEntry.requestStart : null,
      domContentLoadedMs: navEntry ? navEntry.domContentLoadedEventEnd : null,
      loadMs: navEntry ? navEntry.loadEventEnd : null,
    };
  });

  // 측정값을 리포트에 첨부 — 배포마다 추세를 눈으로 확인할 수 있게 한다.
  await test.info().attach('web-vitals.json', {
    body: JSON.stringify({ budget: BUDGET, measured: vitals }, null, 2),
    contentType: 'application/json',
  });
  console.log('[web-vitals]', JSON.stringify(vitals));

  // 예산 단언. 값이 측정 불가(null)인 지표는 환경 차이로 흔들릴 수 있으므로 건너뛴다
  // (정적 export + 헤드리스에서 일부 지표가 비는 경우가 있어 게이트를 막지 않는다).
  if (vitals.lcpMs !== null) {
    expect(vitals.lcpMs, `LCP ${Math.round(vitals.lcpMs)}ms > ${BUDGET.lcpMs}ms`).toBeLessThanOrEqual(
      BUDGET.lcpMs,
    );
  }
  expect(vitals.cls, `CLS ${vitals.cls.toFixed(3)} > ${BUDGET.cls}`).toBeLessThanOrEqual(BUDGET.cls);
  if (vitals.ttfbMs !== null) {
    expect(
      vitals.ttfbMs,
      `TTFB ${Math.round(vitals.ttfbMs)}ms > ${BUDGET.ttfbMs}ms`,
    ).toBeLessThanOrEqual(BUDGET.ttfbMs);
  }
  if (vitals.loadMs !== null && vitals.loadMs > 0) {
    expect(
      vitals.loadMs,
      `load ${Math.round(vitals.loadMs)}ms > ${BUDGET.loadMs}ms`,
    ).toBeLessThanOrEqual(BUDGET.loadMs);
  }
});
