import { Link } from 'react-router-dom'

import { StageBadge } from '@/components/StageBadge'
import { useRuntimeConfig } from '@/lib/runtime-config'
import { environmentOrder, stageMeta } from '@/lib/stages'
import { usePageMeta } from '@/lib/usePageMeta'
import { themeLabel, useTheme } from '@/lib/useTheme'

const pipelineSteps = [
  {
    eyebrow: '01',
    title: 'Build once',
    body: 'Next.js 정적 산출물은 한 번만 만들고, 환경값은 빌드 산출물 밖의 env.json으로 분리합니다.',
  },
  {
    eyebrow: '02',
    title: 'Inject runtime config',
    body: 'preview/staging/production이 같은 앱 코드를 쓰면서 API 주소와 sentry 환경만 런타임에 바꿉니다.',
  },
  {
    eyebrow: '03',
    title: 'Route by environment',
    body: 'CloudFront Function과 S3 prefix가 PR 번호와 환경 이름을 읽어 정확한 산출물로 연결합니다.',
  },
  {
    eyebrow: '04',
    title: 'Clean up automatically',
    body: 'PR preview와 release artifact는 lifecycle/cleanup 스크립트로 오래 남지 않게 관리합니다.',
  },
]

export function HomePage() {
  usePageMeta({
    title: 'Multi-Environment Demo — Build once · Deploy many 멀티환경 레퍼런스',
    description:
      'PR마다 격리된 preview, staging 검증, production 승격까지 — 한 번 빌드한 정적 산출물에 env.json만 갈아끼워 배포하는 S3+CloudFront·GitHub OIDC 멀티환경 레퍼런스',
  })

  const { config, error } = useRuntimeConfig()
  const [theme, cycleTheme] = useTheme()

  const currentMeta = config ? stageMeta[config.stage] : undefined
  const tl = themeLabel[theme]

  return (
    <main id="main-content" tabIndex={-1} className="demo-page">
      <section className="hero-shell" aria-labelledby="hero-title">
        <div className="topbar" aria-label="데모 탐색">
          <Link className="brand-chip" to="/">
            <span aria-hidden="true" className="brand-chip__grid" />
            Multi-env Lab
          </Link>
          <nav className="topbar__links" aria-label="주요 링크">
            <a href="#runtime">런타임 값</a>
            <a href="#pipeline">배포 흐름</a>
            <Link to="/intro">소개 페이지</Link>
          </nav>
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

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Build once · Deploy many · Promote safely</p>
            <h1 id="hero-title">
              <span className="sr-only">Multi-Environment Demo</span>멀티 개발환경이 지금 어떤
              값으로 떠 있는지 바로 보여주는 데모
            </h1>
            <p className="hero-lede">
              같은 정적 앱을 preview, staging, production에 배포하고, 환경별 차이는
              <code>/env.json</code> 하나로 바꿉니다. 이 화면은 그 런타임 값을 직접 읽어 현재 환경과
              배포 경로를 설명합니다.
            </p>
            <div className="hero-actions" aria-label="다음 행동">
              <Link className="primary-action" to="/intro">
                아키텍처 가이드 읽기
              </Link>
              <a className="secondary-action" href="#runtime">
                현재 환경 확인
              </a>
            </div>
          </div>

          <section id="runtime" className="runtime-card" aria-labelledby="runtime-title">
            <div className="runtime-card__header">
              <div>
                <p className="eyebrow">Runtime config</p>
                <h2 id="runtime-title">현재 접속 환경</h2>
              </div>
              <StageBadge stage={config?.stage} testId="stage" />
            </div>

            {error && (
              <p data-testid="error" className="error-banner">
                config 로드 실패: {error.message}
              </p>
            )}

            <p className="runtime-card__summary">
              {currentMeta?.headline ?? '환경 정보를 불러오는 중입니다'}
            </p>
            <p className="runtime-card__body">
              {currentMeta?.description ??
                '배포된 env.json을 읽으면 이 영역이 자동으로 채워집니다.'}
            </p>

            <dl className="config-list">
              <div>
                <dt>stage</dt>
                <dd className="mono">{config?.stage ?? '-'}</dd>
              </div>
              <div>
                <dt>apiBaseUrl</dt>
                <dd data-testid="api" className="mono">
                  {config?.apiBaseUrl ?? '-'}
                </dd>
              </div>
              <div>
                <dt>sentry</dt>
                <dd className="mono">{config?.sentryEnvironment ?? '-'}</dd>
              </div>
              <div>
                <dt>feature flag</dt>
                <dd className="mono">{config?.featureFlagClientKey ?? '-'}</dd>
              </div>
            </dl>
          </section>
        </div>
      </section>

      <section className="environment-board" aria-labelledby="env-title">
        <div className="section-heading">
          <p className="eyebrow">Environment map</p>
          <h2 id="env-title">세 환경이 같은 앱을 다르게 실행하는 방식</h2>
          <p>
            사용자는 URL과 stage만 다르게 보지만, 내부에서는 S3 prefix, CloudFront routing, GitHub
            Actions role이 환경별로 분리됩니다.
          </p>
        </div>

        <div className="env-rail" aria-label="preview staging production 환경 흐름">
          {environmentOrder.map((stage, index) => {
            const meta = stageMeta[stage]
            const active = config?.stage === stage
            return (
              <article className={`env-card ${active ? 'is-active' : ''}`} key={stage}>
                <div className="env-card__number">0{index + 1}</div>
                <StageBadge stage={stage} />
                <h3>{meta.headline}</h3>
                <p>{meta.description}</p>
                <dl>
                  <div>
                    <dt>route</dt>
                    <dd className="mono">{meta.route}</dd>
                  </div>
                  <div>
                    <dt>trigger</dt>
                    <dd>{meta.deployTrigger}</dd>
                  </div>
                  <div>
                    <dt>next</dt>
                    <dd>{meta.promotion}</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      </section>

      <section id="pipeline" className="pipeline-section" aria-labelledby="pipeline-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Pipeline story</p>
          <h2 id="pipeline-title">배포 흐름을 4단계로 압축하면 이렇게 동작합니다</h2>
        </div>
        <div className="pipeline-grid">
          {pipelineSteps.map((step) => (
            <article className="pipeline-step" key={step.eyebrow}>
              <span>{step.eyebrow}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
