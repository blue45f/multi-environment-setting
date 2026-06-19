import { useCallback, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { StageBadge } from '@/components/StageBadge'
import { useRuntimeConfig } from '@/lib/runtime-config'
import { environmentOrder, stageMeta, type StageMeta } from '@/lib/stages'
import { usePageMeta } from '@/lib/usePageMeta'
import { useReveal } from '@/lib/useReveal'
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
] as const

// 히어로 "배포 원장" — vanity metric 이 아니라 이 레퍼런스의 실제 사실을 요약한다.
const heroLedger = [
  { value: '1', unit: 'build', label: '한 번 빌드' },
  { value: '3', unit: 'envs', label: 'preview · staging · production' },
  { value: 'env.json', unit: '', label: '환경 차이는 파일 하나' },
] as const

export function HomePage() {
  usePageMeta({
    title: 'Multi-Environment Demo — Build once · Deploy many 멀티환경 레퍼런스',
    description:
      'PR마다 격리된 preview, staging 검증, production 승격까지 — 한 번 빌드한 정적 산출물에 env.json만 갈아끼워 배포하는 S3+CloudFront·GitHub OIDC 멀티환경 레퍼런스',
  })

  const { config, error } = useRuntimeConfig()
  const [theme, cycleTheme] = useTheme()

  // stage 탐색기 — env-rail 카드를 클릭하면 그 환경을 런타임 카드 위에서 미리 본다.
  // 선택이 없으면(null) 실제 접속 환경(config.stage)을 그대로 보여준다.
  const [selectedStage, setSelectedStage] = useState<string | null>(null)
  const runtimeRef = useRef<HTMLElement>(null)

  const liveStage = config?.stage
  const focusStage = selectedStage ?? liveStage
  const focusMeta: StageMeta | undefined = focusStage ? stageMeta[focusStage] : undefined
  const isPreviewingOther = selectedStage != null && selectedStage !== liveStage
  const tl = themeLabel[theme]

  const handleSelectStage = useCallback((stage: string) => {
    setSelectedStage((current) => (current === stage ? null : stage))
    // 데스크톱에서 선택 시 런타임 카드로 부드럽게 시선을 모은다(모바일에선 카드가 이미 위).
    // scrollIntoView 는 enhancement 일 뿐 — jsdom/구형 환경에 없을 수 있어 가드한다.
    runtimeRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }, [])

  // 복사 — 현재(또는 미리보는) 환경의 런타임 설정을 JSON 으로 클립보드에 담는다.
  const [copied, setCopied] = useState(false)
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleCopyConfig = useCallback(() => {
    if (!config) return
    const snapshot = JSON.stringify(config, null, 2)
    const mark = () => {
      setCopied(true)
      if (copyResetRef.current) clearTimeout(copyResetRef.current)
      copyResetRef.current = setTimeout(() => setCopied(false), 2000)
    }
    void navigator.clipboard?.writeText(snapshot).then(mark, () => {
      // 클립보드 권한이 없을 때도 사용자 피드백은 남긴다(best-effort).
      mark()
    })
  }, [config])

  const { ref: envBoardRef, revealed: envBoardShown } = useReveal<HTMLElement>()
  const { ref: pipelineRef, revealed: pipelineShown } = useReveal<HTMLElement>()
  const statusId = useId()

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
            <p className="eyebrow" data-enter style={{ '--enter': 0 } as React.CSSProperties}>
              Build once · Deploy many · Promote safely
            </p>
            <h1 id="hero-title" data-enter style={{ '--enter': 1 } as React.CSSProperties}>
              <span className="sr-only">Multi-Environment Demo</span>멀티 개발환경이 지금 어떤
              값으로 떠 있는지 바로 보여주는 데모
            </h1>
            <p className="hero-lede" data-enter style={{ '--enter': 2 } as React.CSSProperties}>
              같은 정적 앱을 preview, staging, production에 배포하고, 환경별 차이는
              <code>/env.json</code> 하나로 바꿉니다. 이 화면은 그 런타임 값을 직접 읽어 현재 환경과
              배포 경로를 설명합니다.
            </p>
            <div
              className="hero-actions"
              aria-label="다음 행동"
              data-enter
              style={{ '--enter': 3 } as React.CSSProperties}
            >
              <Link className="primary-action" to="/intro">
                아키텍처 가이드 읽기
              </Link>
              <a className="secondary-action" href="#runtime">
                현재 환경 확인
              </a>
            </div>
            <dl
              className="hero-ledger"
              aria-label="레퍼런스 요약"
              data-enter
              style={{ '--enter': 4 } as React.CSSProperties}
            >
              {heroLedger.map((item) => (
                <div className="hero-ledger__item" key={item.label}>
                  <dt>
                    <span className="hero-ledger__value mono">{item.value}</span>
                    {item.unit && <span className="hero-ledger__unit">{item.unit}</span>}
                  </dt>
                  <dd>{item.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <section
            id="runtime"
            ref={runtimeRef}
            className="runtime-card"
            data-live={config ? 'true' : 'false'}
            data-enter
            style={{ '--enter': 2 } as React.CSSProperties}
            aria-labelledby="runtime-title"
          >
            <div className="runtime-card__header">
              <div>
                <p className="eyebrow">Runtime config</p>
                <h2 id="runtime-title">{isPreviewingOther ? '미리보는 환경' : '현재 접속 환경'}</h2>
              </div>
              <StageBadge stage={focusStage} testId="stage" />
            </div>

            {error && (
              <p data-testid="error" className="error-banner">
                config 로드 실패: {error.message}
              </p>
            )}

            {isPreviewingOther && (
              <p className="runtime-card__previewing" role="status">
                <span aria-hidden="true">↪</span> 실제 접속 환경은{' '}
                <strong className="mono">{liveStage ?? '-'}</strong> 입니다.
                <button
                  type="button"
                  className="runtime-card__reset"
                  onClick={() => setSelectedStage(null)}
                >
                  되돌리기
                </button>
              </p>
            )}

            <p className="runtime-card__summary">
              {focusMeta?.headline ?? '환경 정보를 불러오는 중입니다'}
            </p>
            <p className="runtime-card__body">
              {focusMeta?.description ?? '배포된 env.json을 읽으면 이 영역이 자동으로 채워집니다.'}
            </p>

            {isPreviewingOther ? (
              // 다른 환경을 미리볼 때는 실제 런타임 값(다른 env.json)을 가지고 있지 않으므로,
              // 그 환경의 배포 경로·트리거·승격 흐름을 정직하게 보여준다(값을 지어내지 않는다).
              <dl className="config-list">
                <div>
                  <dt>stage</dt>
                  <dd data-testid="api" className="mono">
                    {focusStage ?? '-'}
                  </dd>
                </div>
                <div>
                  <dt>route</dt>
                  <dd className="mono">{focusMeta?.route ?? '-'}</dd>
                </div>
                <div>
                  <dt>trigger</dt>
                  <dd>{focusMeta?.deployTrigger ?? '-'}</dd>
                </div>
                <div>
                  <dt>next</dt>
                  <dd>{focusMeta?.promotion ?? '-'}</dd>
                </div>
              </dl>
            ) : (
              <dl className="config-list">
                <div>
                  <dt>stage</dt>
                  <dd className="mono">{focusStage ?? '-'}</dd>
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
            )}

            <div className="runtime-card__foot">
              <button
                type="button"
                className="copy-config"
                onClick={handleCopyConfig}
                disabled={!config || isPreviewingOther}
                aria-describedby={statusId}
                data-copied={copied ? 'true' : 'false'}
              >
                <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
                {copied ? '복사됨' : 'env.json 복사'}
              </button>
              <span id={statusId} role="status" className="copy-config__status">
                {copied ? '클립보드에 런타임 설정을 복사했습니다.' : ''}
              </span>
            </div>
          </section>
        </div>
      </section>

      <section
        ref={envBoardRef}
        className="environment-board"
        data-reveal={envBoardShown ? 'shown' : 'pending'}
        aria-labelledby="env-title"
      >
        <div className="section-heading">
          <p className="eyebrow">Environment map</p>
          <h2 id="env-title">세 환경이 같은 앱을 다르게 실행하는 방식</h2>
          <p>
            카드를 누르면 위 런타임 패널에서 그 환경의 경로와 트리거를 미리 볼 수 있어요. 사용자는
            URL과 stage만 다르게 보지만, 내부에서는 S3 prefix, CloudFront routing, GitHub Actions
            role이 환경별로 분리됩니다.
          </p>
        </div>

        <div className="env-rail" aria-label="preview staging production 환경 흐름">
          {environmentOrder.map((stage, index) => {
            const meta = stageMeta[stage]
            const live = liveStage === stage
            const selected = selectedStage === stage
            return (
              <button
                type="button"
                className={`env-card ${live ? 'is-active' : ''} ${selected ? 'is-selected' : ''}`}
                key={stage}
                data-stagger
                style={{ '--stagger': index } as React.CSSProperties}
                aria-pressed={selected}
                onClick={() => handleSelectStage(stage)}
              >
                <div className="env-card__number" aria-hidden="true">
                  0{index + 1}
                </div>
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
                <span className="env-card__hint" aria-hidden="true">
                  {selected ? '✓ 패널에서 미리보는 중' : '→ 런타임 패널에서 보기'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section
        id="pipeline"
        ref={pipelineRef}
        className="pipeline-section"
        data-reveal={pipelineShown ? 'shown' : 'pending'}
        aria-labelledby="pipeline-title"
      >
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Pipeline story</p>
          <h2 id="pipeline-title">배포 흐름을 4단계로 압축하면 이렇게 동작합니다</h2>
        </div>
        <div className="pipeline-grid">
          {pipelineSteps.map((step, index) => (
            <article
              className="pipeline-step"
              key={step.eyebrow}
              data-stagger
              style={{ '--stagger': index } as React.CSSProperties}
            >
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
