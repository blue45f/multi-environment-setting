'use client';

import { useRuntimeConfig } from '@/lib/runtime-config';

// 각 stage의 색 + 텍스트 라벨 + 기호. 색에만 의존하지 않도록(WCAG 1.4.1)
// 색 점과 함께 사람이 읽을 수 있는 라벨/기호를 항상 같이 노출한다.
const stageMeta: Record<string, { color: string; label: string; symbol: string }> = {
  preview: { color: '#6c8cff', label: 'Preview', symbol: '◆' },
  staging: { color: '#f0a83a', label: 'Staging', symbol: '▲' },
  production: { color: '#3ad29f', label: 'Production', symbol: '●' },
};

export default function Home() {
  const { config, error } = useRuntimeConfig();

  const meta = config ? stageMeta[config.stage] : undefined;

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
          background: '#141a33',
          border: '1px solid #263056',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>Multi-Environment Demo</h1>
        <p style={{ margin: '0 0 24px', color: '#9fb0e0' }}>
          이 페이지는 런타임에 <code>/env.json</code>을 읽어 현재 환경을 표시합니다. (build-once,
          deploy-many)
        </p>

        {error && (
          <p data-testid="error" style={{ color: '#ff8080' }}>
            config 로드 실패: {error.message}
          </p>
        )}

        <dl
          style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', margin: 0 }}
        >
          <dt style={{ color: '#9fb0e0' }}>stage</dt>
          <dd style={{ margin: 0 }}>
            <span
              data-testid="stage"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
                borderRadius: 999,
                fontWeight: 600,
                background: '#1c2647',
                border: `1px solid ${meta?.color ?? '#3a4470'}`,
                color: '#e7ecff',
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
                  background: meta?.color ?? '#3a4470',
                  color: '#0b1020',
                }}
              >
                {meta?.symbol ?? ''}
              </span>
              {config?.stage ?? 'loading...'}
            </span>
          </dd>

          <dt style={{ color: '#9fb0e0' }}>apiBaseUrl</dt>
          <dd data-testid="api" style={{ margin: 0, wordBreak: 'break-all' }}>
            {config?.apiBaseUrl ?? '-'}
          </dd>

          <dt style={{ color: '#9fb0e0' }}>sentry</dt>
          <dd style={{ margin: 0 }}>{config?.sentryEnvironment ?? '-'}</dd>
        </dl>
      </section>
    </main>
  );
}
