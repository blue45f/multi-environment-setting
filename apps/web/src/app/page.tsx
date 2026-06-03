'use client';

import { useSyncExternalStore } from 'react';

import { useRuntimeConfig } from '@/lib/runtime-config';

// 각 stage → 의미 토큰(stage 별칭) + 텍스트 라벨 + 기호. 색에만 의존하지 않도록(WCAG 1.4.1)
// 색 점과 함께 사람이 읽을 수 있는 라벨/기호를 항상 같이 노출한다.
// 색값은 raw hex 가 아니라 globals.css 의 OKLCH status 토큰을 가리킨다(라이트/다크 자동 대응).
const stageMeta: Record<
  string,
  { dot: string; bg: string; fg: string; label: string; symbol: string }
> = {
  preview: {
    dot: 'var(--stage-preview)',
    bg: 'var(--stage-preview-bg)',
    fg: 'var(--stage-preview-fg)',
    label: 'Preview',
    symbol: '◆',
  },
  staging: {
    dot: 'var(--stage-staging)',
    bg: 'var(--stage-staging-bg)',
    fg: 'var(--stage-staging-fg)',
    label: 'Staging',
    symbol: '▲',
  },
  production: {
    dot: 'var(--stage-production)',
    bg: 'var(--stage-production-bg)',
    fg: 'var(--stage-production-fg)',
    label: 'Production',
    symbol: '●',
  },
};

type Theme = 'light' | 'dark' | 'system';

// pre-paint 스크립트(layout.tsx)와 동일한 키. 토글은 light/dark 만 저장하고,
// 'system' 은 저장값 제거 = prefers-color-scheme 로 되돌림.
const THEME_EVENT = 'demo:themechange';

// 브라우저 DOM(<html data-theme>)을 신뢰원천(store)으로 읽는다.
//  - SSR snapshot 은 항상 'system' → 하이드레이션 첫 렌더가 서버 HTML 과 일치(미스매치 없음).
//  - pre-paint 스크립트가 이미 시각 테마를 박아두므로 라벨이 늦게 붙어도 FOUC 는 없다.
function getThemeSnapshot(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' || attr === 'dark' ? attr : 'system';
}

function getServerThemeSnapshot(): Theme {
  return 'system';
}

function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener('storage', onChange); // 다른 탭에서의 변경도 반영
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  const cycle = () => {
    // system → dark → light → system. 시스템 선호를 존중하는 3-상태 토글.
    const next: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    try {
      if (next === 'system') localStorage.removeItem('theme');
      else localStorage.setItem('theme', next);
    } catch {
      // localStorage 불가 환경: DOM 애트리뷰트만으로 동작(best-effort).
    }
    if (next === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return [theme, cycle];
}

const themeLabel: Record<Theme, { symbol: string; text: string }> = {
  system: { symbol: '◐', text: '시스템' },
  dark: { symbol: '●', text: '다크' },
  light: { symbol: '○', text: '라이트' },
};

export default function Home() {
  const { config, error } = useRuntimeConfig();
  const [theme, cycleTheme] = useTheme();

  const meta = config ? stageMeta[config.stage] : undefined;
  const tl = themeLabel[theme];

  return (
    <main
      id="content"
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <section
        style={{
          width: 'min(560px, 92vw)',
          background: 'var(--app-panel)',
          border: '1px solid var(--app-line)',
          borderRadius: 16,
          padding: 32,
          boxShadow: 'var(--app-shadow)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 8,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.02em' }}>
            Multi-Environment Demo
          </h1>
          <button
            type="button"
            className="theme-toggle"
            onClick={cycleTheme}
            aria-label={`테마: ${tl.text} (클릭하여 전환)`}
          >
            <span aria-hidden="true">{tl.symbol}</span>
            {tl.text}
          </button>
        </div>

        <p style={{ margin: '0 0 24px', color: 'var(--app-ink-muted)', maxWidth: '60ch' }}>
          이 페이지는 런타임에 <code>/env.json</code>을 읽어 현재 환경을 표시합니다. (build-once,
          deploy-many)
        </p>

        {error && (
          <p
            data-testid="error"
            style={{
              margin: '0 0 24px',
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--app-err-bg)',
              color: 'var(--app-err-fg)',
              border: '1px solid var(--app-err)',
            }}
          >
            config 로드 실패: {error.message}
          </p>
        )}

        <dl
          style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', margin: 0 }}
        >
          <dt style={{ color: 'var(--app-ink-subtle)' }}>stage</dt>
          <dd style={{ margin: 0 }}>
            <span
              data-testid="stage"
              title={meta ? `${meta.label} 환경` : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
                borderRadius: 999,
                fontWeight: 600,
                background: meta?.bg ?? 'var(--app-panel-2)',
                border: `1px solid ${meta?.dot ?? 'var(--app-line-strong)'}`,
                color: meta?.fg ?? 'var(--app-ink-muted)',
              }}
            >
              {/* 색 점 + 기호: 색에만 의존하지 않도록 텍스트 라벨과 함께 노출 */}
              <span
                aria-hidden="true"
                style={{
                  width: 14,
                  height: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  lineHeight: 1,
                  borderRadius: 999,
                  background: meta?.dot ?? 'var(--app-line-strong)',
                  color: 'var(--app-accent-fg)',
                }}
              >
                {meta?.symbol ?? ''}
              </span>
              <span className="mono">{config?.stage ?? 'loading...'}</span>
            </span>
          </dd>

          <dt style={{ color: 'var(--app-ink-subtle)' }}>apiBaseUrl</dt>
          <dd
            data-testid="api"
            className="mono"
            style={{ margin: 0, wordBreak: 'break-all', color: 'var(--app-ink)' }}
          >
            {config?.apiBaseUrl ?? '-'}
          </dd>

          <dt style={{ color: 'var(--app-ink-subtle)' }}>sentry</dt>
          <dd className="mono" style={{ margin: 0, color: 'var(--app-ink)' }}>
            {config?.sentryEnvironment ?? '-'}
          </dd>
        </dl>
      </section>
    </main>
  );
}
