'use client';

import { useRuntimeConfig } from '@/lib/runtime-config';

const badgeColor: Record<string, string> = {
  preview: '#6c8cff',
  staging: '#f0a83a',
  production: '#3ad29f',
};

export default function Home() {
  const { config, error } = useRuntimeConfig();

  return (
    <main
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

        <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px 16px', margin: 0 }}>
          <dt style={{ color: '#9fb0e0' }}>stage</dt>
          <dd style={{ margin: 0 }}>
            <span
              data-testid="stage"
              style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: 999,
                fontWeight: 600,
                background: config ? (badgeColor[config.stage] ?? '#6c8cff') : '#3a4470',
                color: '#0b1020',
              }}
            >
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
