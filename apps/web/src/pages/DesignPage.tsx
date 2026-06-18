import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { StageBadge } from '@/components/StageBadge'
import { environmentOrder, stageMeta } from '@/lib/stages'
import { usePageMeta } from '@/lib/usePageMeta'
import { type Theme, themeLabel, useTheme } from '@/lib/useTheme'

// 살아있는 디자인 시스템 가이드 — 이 레퍼런스 앱이 "실제로" 쓰는 OKLCH 토큰과
// 재사용 프리미티브만 보여준다. 색 스와치 값은 getComputedStyle 로 런타임에 읽어
// 라이트/다크 토글 시 그 자리에서 갱신된다(가이드가 코드와 어긋나지 않게).

type Swatch = { token: string; label: string }

const surfaceSwatches: Swatch[] = [
  { token: '--app-bg', label: '페이지 배경' },
  { token: '--app-panel', label: '패널 (카드 표면)' },
  { token: '--app-panel-2', label: '패널 2 (한 단계 깊은 표면)' },
  { token: '--app-line', label: '구분선' },
  { token: '--app-line-strong', label: '강조 구분선' },
]

const inkSwatches: Swatch[] = [
  { token: '--app-ink', label: '본문 잉크 (≥4.5:1)' },
  { token: '--app-ink-muted', label: '보조 잉크' },
  { token: '--app-ink-subtle', label: '약한 잉크 (라벨 · AA)' },
]

const accentSwatches: Swatch[] = [
  { token: '--app-accent', label: 'accent (violet-blue)' },
  { token: '--app-accent-hover', label: 'accent hover' },
  { token: '--app-accent-soft', label: 'accent soft (배경)' },
]

const statusGroups: { name: string; tokens: Swatch[] }[] = [
  {
    name: 'ok',
    tokens: [
      { token: '--app-ok', label: 'solid' },
      { token: '--app-ok-bg', label: 'bg' },
      { token: '--app-ok-fg', label: 'fg' },
    ],
  },
  {
    name: 'warn',
    tokens: [
      { token: '--app-warn', label: 'solid' },
      { token: '--app-warn-bg', label: 'bg' },
      { token: '--app-warn-fg', label: 'fg' },
    ],
  },
  {
    name: 'err',
    tokens: [
      { token: '--app-err', label: 'solid' },
      { token: '--app-err-bg', label: 'bg' },
      { token: '--app-err-fg', label: 'fg' },
    ],
  },
]

// 본문 폰트가 'Avenir Next' / 헤딩이 동일 패밀리 850, mono 는 ui-monospace 스택.
const typeScale = [
  { label: 'Hero h1 · clamp(44px → 96px)', size: 'clamp(38px, 7vw, 72px)', weight: 850 },
  { label: 'Section h2 · clamp(26px → 42px)', size: 'clamp(26px, 3vw, 40px)', weight: 850 },
  { label: 'Card h3 · 24px', size: '24px', weight: 850 },
  { label: 'Body · clamp(17px → 21px)', size: '18px', weight: 400 },
  { label: 'Label · 12px uppercase', size: '12px', weight: 900 },
]

// globals.css 의 clamp / gap 에서 실제로 반복되는 간격 스텝.
const spacingScale = [
  { token: '8px', px: 8 },
  { token: '12px', px: 12 },
  { token: '16px', px: 16 },
  { token: '22px', px: 22 },
  { token: '28px', px: 28 },
  { token: '44px', px: 44 },
  { token: '72px', px: 72 },
]

// 페이지 전반에서 쓰이는 radius 값(8 = 표면 패널, 999 = pill/배지).
const radiusScale = [
  { label: '6px · code chip', radius: 6 },
  { label: '8px · 표면 패널', radius: 8 },
  { label: '18px · config 그룹', radius: 18 },
  { label: '28px · env 카드', radius: 28 },
  { label: '999px · pill / 배지', radius: 999 },
]

const navSections = [
  { id: 'ds-foundations', label: 'Foundations' },
  { id: 'ds-color', label: 'Color' },
  { id: 'ds-type', label: 'Typography' },
  { id: 'ds-space', label: 'Spacing & Radii' },
  { id: 'ds-elevation', label: 'Elevation & Motion' },
  { id: 'ds-components', label: 'Components' },
]

// 토큰의 "해석된" 값을 getComputedStyle 로 읽어 라이브 스와치 라벨에 쓴다. 활성 테마가
// 바뀌면 그 자리에서 다시 계산한다. 클라이언트 전용 SPA 라 렌더 중 읽어도 안전·멱등이다.
// tokens 는 모듈 상수라 참조가 안정적이고, theme 변화가 재계산 트리거다(라이브 동기화).
function useComputedTokens(
  tokens: readonly string[],
  theme: Theme
): { theme: Theme; values: Record<string, string> } {
  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement)
    const values: Record<string, string> = {}
    for (const token of tokens) {
      values[token] = styles.getPropertyValue(token).trim() || '—'
    }
    return { theme, values }
  }, [tokens, theme])
}

function SwatchTile({
  token,
  label,
  value,
  big,
}: {
  token: string
  label: string
  value?: string
  big?: boolean
}) {
  return (
    <div className="ds-swatch">
      <span
        className={`ds-swatch__chip${big ? ' ds-swatch__chip--big' : ''}`}
        style={{ background: `var(${token})` }}
        aria-hidden="true"
      />
      <div className="ds-swatch__meta">
        <code className="ds-swatch__token">{token}</code>
        <span className="ds-swatch__label">{label}</span>
        <code className="ds-swatch__value mono">{value ?? '…'}</code>
      </div>
    </div>
  )
}

const allColorTokens = [
  ...surfaceSwatches,
  ...inkSwatches,
  ...accentSwatches,
  ...statusGroups.flatMap((g) => g.tokens),
  { token: '--stage-preview', label: 'preview' },
  { token: '--stage-staging', label: 'staging' },
  { token: '--stage-production', label: 'production' },
].map((s) => s.token)

export function DesignPage() {
  usePageMeta({
    title: '디자인 시스템 · Multi-Environment Setting',
    description:
      '이 멀티환경 레퍼런스 앱이 실제로 사용하는 OKLCH 토큰, 타이포 스케일, 스테이지 색 시스템과 재사용 컴포넌트를 한곳에서 보여주는 살아있는 스타일 가이드입니다.',
  })

  const [theme, cycleTheme] = useTheme()
  const tl = themeLabel[theme]
  // 테마가 바뀌면 토큰 값을 다시 계산한다(라이브 스와치).
  const { values: tokenValues } = useComputedTokens(allColorTokens, theme)

  return (
    <main id="main-content" tabIndex={-1} className="intro-page ds-page">
      <nav className="guide-route-nav" aria-label="디자인 시스템 탐색">
        <Link className="back-link" to="/">
          ← 데모로 돌아가기
        </Link>
        <button
          type="button"
          className="theme-toggle"
          onClick={cycleTheme}
          aria-label={`테마: ${tl.text} (클릭하여 전환)`}
        >
          <span aria-hidden="true">{tl.symbol}</span>
          {tl.text}
        </button>
      </nav>

      <header className="guide-page-hero ds-hero" aria-labelledby="ds-title">
        <p className="eyebrow">Design system</p>
        <h1 id="ds-title">Multi-env Lab 디자인 시스템</h1>
        <p>
          이 페이지는 별도 컴포넌트 킷이 아니라, 레퍼런스 앱이 <strong>실제로 쓰는</strong> OKLCH
          토큰과 반복 패턴을 그대로 모아 보여줍니다. 색 값은 런타임에 <code>getComputedStyle</code>
          로 읽으므로, 위 토글로 테마를 바꾸면 스와치도 함께 갱신됩니다.
        </p>
      </header>

      <nav className="ds-section-nav" aria-label="섹션 바로가기">
        {navSections.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>

      {/* ── Foundations: Color ─────────────────────────────────────── */}
      <section id="ds-color" className="ds-section" aria-labelledby="ds-color-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Foundations</p>
          <h2 id="ds-color-title">색 — warm paper 중립 + violet-blue accent</h2>
          <p>
            #000/#fff 를 쓰지 않고 모든 중립색을 따뜻한 hue(~80)로 틴트합니다. accent 는 작은 면적
            전용 violet-blue 단색이고, 상태색은 서로/accent 와 hue 가 겹치지 않게 분리됩니다.
          </p>
        </div>

        <h3 className="ds-subhead">표면 (paper neutrals)</h3>
        <div className="ds-swatch-grid">
          {surfaceSwatches.map((s) => (
            <SwatchTile key={s.token} {...s} value={tokenValues[s.token]} big />
          ))}
        </div>

        <h3 className="ds-subhead">잉크 램프</h3>
        <div className="ds-swatch-grid">
          {inkSwatches.map((s) => (
            <SwatchTile key={s.token} {...s} value={tokenValues[s.token]} big />
          ))}
        </div>

        <h3 className="ds-subhead">Accent · violet-blue</h3>
        <div className="ds-swatch-grid">
          {accentSwatches.map((s) => (
            <SwatchTile key={s.token} {...s} value={tokenValues[s.token]} big />
          ))}
        </div>

        <h3 className="ds-subhead">상태색 · ok / warn / err</h3>
        <div className="ds-status-grid">
          {statusGroups.map((group) => (
            <div key={group.name} className="ds-status-group">
              <span className="ds-status-group__name mono">{group.name}</span>
              <div className="ds-status-group__swatches">
                {group.tokens.map((s) => (
                  <SwatchTile
                    key={s.token}
                    token={s.token}
                    label={s.label}
                    value={tokenValues[s.token]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <h3 className="ds-subhead">시그니처 · 스테이지 색 시스템</h3>
        <p className="ds-note">
          preview / staging / production 은 색만으로 구분하지 않고 항상 기호(◆▲●) + 라벨과 함께
          노출됩니다(WCAG 1.4.1).
        </p>
        <div className="ds-stage-grid">
          {environmentOrder.map((stage) => {
            const meta = stageMeta[stage]
            return (
              <article
                key={stage}
                className="ds-stage-card"
                style={{
                  borderColor: `var(--stage-${stage})`,
                  background: `var(--stage-${stage}-bg)`,
                }}
              >
                <StageBadge stage={stage} />
                <strong>{meta.label}</strong>
                <code className="mono ds-stage-card__token">{`--stage-${stage}`}</code>
                <code className="mono ds-stage-card__value">{tokenValues[`--stage-${stage}`]}</code>
              </article>
            )
          })}
        </div>
      </section>

      {/* ── Foundations: Typography ────────────────────────────────── */}
      <section id="ds-type" className="ds-section" aria-labelledby="ds-type-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Foundations</p>
          <h2 id="ds-type-title">타이포그래피</h2>
          <p>
            헤딩·본문 모두 <code>Avenir Next</code> 한 패밀리를 굵기 대비로 운용하고, 기계
            데이터(URL · stage 값)만 <code>ui-monospace</code> + tabular-nums 로 표기합니다.
          </p>
        </div>

        <div className="ds-type-list">
          {typeScale.map((step) => (
            <div key={step.label} className="ds-type-row">
              <span className="ds-type-row__label mono">{step.label}</span>
              <span
                className="ds-type-row__sample"
                style={{ fontSize: step.size, fontWeight: step.weight }}
              >
                Build once · 한 번 빌드
              </span>
            </div>
          ))}
        </div>

        <div className="ds-measure">
          <span className="ds-subhead">본문 측정 폭 · 65–75ch</span>
          <p className="ds-measure__body">
            본문은 한 줄을 65–75 글자로 제한해 시선 이동을 줄입니다. 이 단락은 그 측정 폭을 그대로
            적용한 예시로, 토큰화된 <code>--app-ink-muted</code> 색과 1.7 행간을 함께 보여줍니다. 긴
            산문에는 <code>text-wrap: pretty</code> 를 적용해 고아 단어를 줄입니다.
          </p>
        </div>
      </section>

      {/* ── Foundations: Spacing & Radii ───────────────────────────── */}
      <section id="ds-space" className="ds-section" aria-labelledby="ds-space-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Foundations</p>
          <h2 id="ds-space-title">간격 · 반경</h2>
          <p>
            간격은 고정 스케일이 아니라 <code>clamp()</code> 로 뷰포트에 따라 호흡합니다. 아래는
            레이아웃 전반에서 반복되는 대표 스텝입니다.
          </p>
        </div>

        <div className="ds-split">
          <div>
            <h3 className="ds-subhead">간격 스텝</h3>
            <div className="ds-space-list">
              {spacingScale.map((step) => (
                <div key={step.token} className="ds-space-row">
                  <code className="mono ds-space-row__token">{step.token}</code>
                  <span
                    className="ds-space-row__bar"
                    style={{ width: step.px }}
                    aria-hidden="true"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="ds-subhead">반경</h3>
            <div className="ds-radius-grid">
              {radiusScale.map((step) => (
                <div key={step.label} className="ds-radius-item">
                  <span
                    className="ds-radius-item__box"
                    style={{ borderRadius: Math.min(step.radius, 36) }}
                    aria-hidden="true"
                  />
                  <code className="mono">{step.label}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Foundations: Elevation & Motion ────────────────────────── */}
      <section id="ds-elevation" className="ds-section" aria-labelledby="ds-elevation-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Foundations</p>
          <h2 id="ds-elevation-title">표면 깊이 · 모션</h2>
          <p>
            단일 합성 그림자 <code>--app-shadow</code> 가 카드의 깊이를 담당합니다. 모션은 상태
            전달에만 쓰고, 모두 <code>prefers-reduced-motion</code> 폴백을 가집니다.
          </p>
        </div>

        <div className="ds-split">
          <div>
            <h3 className="ds-subhead">Elevation · --app-shadow</h3>
            <div className="ds-elevation-card">
              <code className="mono">box-shadow: var(--app-shadow)</code>
            </div>
          </div>

          <div>
            <h3 className="ds-subhead">Motion · ease-out, 160–180ms</h3>
            <p className="ds-note">
              아래 버튼에 마우스를 올리거나 포커스하면 transform/색만 부드럽게 전환됩니다.
            </p>
            <button type="button" className="ds-motion-demo">
              hover / focus
            </button>
          </div>
        </div>
      </section>

      {/* ── Components ─────────────────────────────────────────────── */}
      <section id="ds-components" className="ds-section" aria-labelledby="ds-components-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Components</p>
          <h2 id="ds-components-title">재사용 프리미티브</h2>
          <p>
            이 앱에는 정식 컴포넌트 킷이 없으므로, 문서 페이지 전반에서 반복되는 실제 UI 패턴만 상태
            캡션과 함께 모았습니다.
          </p>
        </div>

        <h3 className="ds-subhead">버튼 / 링크 액션</h3>
        <div className="ds-component-row">
          <div className="ds-specimen">
            <a className="primary-action" href="#ds-components">
              Primary action
            </a>
            <span className="ds-specimen__caption mono">.primary-action · accent</span>
          </div>
          <div className="ds-specimen">
            <a className="secondary-action" href="#ds-components">
              Secondary action
            </a>
            <span className="ds-specimen__caption mono">.secondary-action · ghost</span>
          </div>
          <div className="ds-specimen">
            <span className="theme-toggle">
              <span aria-hidden="true">◐</span>토글
            </span>
            <span className="ds-specimen__caption mono">.theme-toggle · pill ghost</span>
          </div>
        </div>

        <h3 className="ds-subhead">스테이지 배지 (모든 상태)</h3>
        <div className="ds-component-row">
          {environmentOrder.map((stage) => (
            <div key={stage} className="ds-specimen">
              <StageBadge stage={stage} />
              <span className="ds-specimen__caption mono">stage={stage}</span>
            </div>
          ))}
          <div className="ds-specimen">
            <StageBadge />
            <span className="ds-specimen__caption mono">로딩 (값 없음)</span>
          </div>
        </div>

        <h3 className="ds-subhead">상태 콜아웃</h3>
        <div className="ds-component-row">
          <div className="ds-specimen ds-specimen--grow">
            <p className="error-banner">config 로드 실패: env.json 을 찾을 수 없습니다</p>
            <span className="ds-specimen__caption mono">.error-banner · err</span>
          </div>
          <div className="ds-specimen ds-specimen--grow">
            <div className="ds-callout-warn">
              <strong>주의</strong> production 배포는 수동 승인이 필요합니다.
            </div>
            <span className="ds-specimen__caption mono">.script-caution 패턴 · warn</span>
          </div>
        </div>

        <h3 className="ds-subhead">코드 chip / 블록</h3>
        <div className="ds-component-row">
          <div className="ds-specimen">
            <code className="ds-code-chip">/production/current/</code>
            <span className="ds-specimen__caption mono">inline code chip</span>
          </div>
          <div className="ds-specimen ds-specimen--grow">
            <pre className="ds-code-block">
              <code>{`pnpm --filter web build
# build once → deploy many`}</code>
            </pre>
            <span className="ds-specimen__caption mono">pre 코드 블록</span>
          </div>
        </div>

        <h3 className="ds-subhead">키–값 리스트 (config-list)</h3>
        <dl className="config-list ds-config-sample">
          <div>
            <dt>stage</dt>
            <dd className="mono">production</dd>
          </div>
          <div>
            <dt>apiBaseUrl</dt>
            <dd className="mono">https://api.example.com</dd>
          </div>
          <div>
            <dt>sentry</dt>
            <dd className="mono">production</dd>
          </div>
        </dl>
        <p className="ds-note">
          Mermaid 다이어그램 래퍼(<code>.rendered-mermaid</code>)는 소개 페이지의 이론 가이드에서
          실제 렌더 상태와 함께 확인할 수 있습니다.
        </p>
      </section>

      <footer className="guide-footer ds-footer" aria-label="다음 행동">
        <div>
          <p className="eyebrow">Next route</p>
          <h2>토큰이 실제로 쓰이는 화면 보기</h2>
        </div>
        <Link className="guide-cta" to="/intro">
          아키텍처 가이드로 이동
        </Link>
      </footer>
    </main>
  )
}
