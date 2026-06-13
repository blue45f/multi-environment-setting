import { Link } from 'react-router-dom'

import {
  architectureFlow,
  architectureLayers,
  mermaidDiagrams,
  representativeUrl,
  theoryNotes,
} from './guide-data'

import { MermaidDiagram } from '@/components/MermaidDiagram'
import { usePageMeta } from '@/lib/usePageMeta'

const guideRoutes = [
  {
    to: '/intro/theory',
    label: 'Theory',
    title: '이론 및 핵심 Baseline 가이드',
    detail:
      '공통 Baseline 수립 원칙, AWS 리소스 매핑 및 수명주기와 보안 설계 등 이론적 기초를 확인합니다.',
  },
  {
    to: '/intro/setup',
    label: 'Setup',
    title: '도메인과 플랫폼 구축',
    detail:
      'Vercel alias, AWS preview domain, S3/CloudFront, GitHub Actions 설정 경로를 따로 봅니다.',
  },
  {
    to: '/intro/scripts',
    label: 'Scripts',
    title: '간단 적용 스크립트',
    detail:
      'preflight, bootstrap, 배포, 승격, 롤백, cleanup 스크립트 사용법과 주의사항을 정리합니다.',
  },
  {
    to: '/intro/operations',
    label: 'Operations',
    title: '운영 책임과 용어',
    detail:
      'preview/staging/production 책임 분리, 초보자 시나리오, 용어사전, 운영 원칙을 확인합니다.',
  },
  {
    to: '/intro/generator',
    label: 'Generator',
    title: '아키텍처 설계 제너레이터',
    detail:
      '프로젝트 환경변수를 입력하여 테라폼, 깃허브 액션, 런타임 검증 스키마 및 스크립트를 즉시 생성합니다.',
  },
]

export function IntroPage() {
  usePageMeta({
    title: '멀티베타 환경 개발가이드 · 개요',
    description:
      'Next.js, React.js 같은 정적 프론트엔드 리소스의 preview, staging, production 멀티베타 환경 개요',
  })

  return (
    <>
      <section className="guide-hero" aria-labelledby="intro-title">
        <div className="guide-hero__grid">
          <div>
            <p className="eyebrow">Multi-beta guide</p>
            <h1 id="intro-title">멀티베타 환경 개발가이드</h1>
            <p>
              이 페이지는 Next.js, React.js 같은 정적 프론트엔드 리소스를 preview, staging,
              production으로 나누어 배포하는 레퍼런스 onboarding 문서입니다. 각 환경은 같은 정적
              산출물을 공유하고, 차이는 `env.json`, prefix, 승인 흐름으로만 제어합니다.
            </p>
          </div>

          <aside className="guide-snapshot" aria-label="데모 요약">
            <span className="guide-snapshot__label">Representative domain</span>
            <strong>{representativeUrl.replace('https://', '')}</strong>
            <dl>
              <div>
                <dt>Model</dt>
                <dd>Static resources · Build once</dd>
              </div>
              <div>
                <dt>Primary guide</dt>
                <dd>Static frontend AWS reference</dd>
              </div>
              <div>
                <dt>Deploy targets</dt>
                <dd>Personal Vercel · AWS S3/CloudFront</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="guide-route-picker" aria-labelledby="route-picker-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">split by router</p>
          <h2 id="route-picker-title">내용을 라우터 단위로 나누었습니다</h2>
          <p>
            개요는 이 페이지에서 먼저 보고, 실행 방법·스크립트·운영 설명은 하위 페이지로
            분리했습니다. 한 페이지를 계속 스크롤하지 않고 목적에 맞는 라우트로 바로 이동합니다.
          </p>
        </div>

        <div className="guide-route-grid">
          {guideRoutes.map((route) => (
            <Link key={route.to} className="guide-route-card" to={route.to}>
              <span>{route.label}</span>
              <h3>{route.title}</h3>
              <p>{route.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="guide-stack" aria-labelledby="stack-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">source of truth</p>
          <h2 id="stack-title">전체 모델을 먼저 파악</h2>
          <p>
            정적 리소스 대상, AWS 배포 구조, runtime config, 도메인 흐름은 하나의 모델로 연결됩니다.
            상세 실행은 하위 라우트에서 보고, 여기서는 전체 구조를 먼저 잡습니다.
          </p>
        </div>

        <div className="stack-strip" aria-label="아키텍처 계층">
          {architectureLayers.map((layer) => (
            <article key={layer.name} className="stack-layer">
              <span>{layer.name}</span>
              <h3>{layer.scope}</h3>
              <p>{layer.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-city" aria-labelledby="city-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">architecture city map</p>
          <h2 id="city-title">데이터가 도로를 따라 흐르는 방식</h2>
        </div>
        <p className="guide-city__intro">
          배포를 이해할 때 가장 쉬운 질문은 “누가 뭘 바꾸는가”입니다. 이 샘플은 항상 같은 앱을
          만들고, 도로(환경 경로)와 신호등(권한/승인 단계)만 바꿔 다루는 방식입니다.
        </p>

        <ol className="city-map" aria-label="멀티 환경 흐름 지도">
          {architectureFlow.map((item) => (
            <li key={item.phase} className="city-step">
              <span className="city-step__phase">{item.phase}</span>
              <article>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
                <p className="city-step__meta">
                  <strong>주체:</strong> {item.role}
                </p>
                <p className="city-step__meta">
                  <strong>산출:</strong> {item.output}
                </p>
              </article>
            </li>
          ))}
        </ol>

        <p className="guide-city__caption">
          한 줄 요약: 빌드 아티팩트는 유지하고, 환경 경계는 `env.json` + prefix + 승인 흐름으로
          바꾼다.
        </p>
      </section>

      <section className="guide-theory" aria-labelledby="theory-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">markdown theory notes</p>
          <h2 id="theory-title">멀티베타 환경을 설계할 때 먼저 잡아야 할 이론</h2>
          <p>
            아래 내용은{' '}
            <a
              href="https://github.com/blue45f/multi-environment-setting/blob/main/docs/MULTI_BETA_GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--app-accent)', textDecoration: 'underline', fontWeight: 600 }}
            >
              docs/MULTI_BETA_GUIDE.md
            </a>
            에 같은 관점으로 정리되어 있습니다. 화면은 onboarding용 요약이고, Markdown 문서는 리뷰와
            운영 인수인계용 기준선입니다.
          </p>
        </div>

        <div className="theory-grid">
          {theoryNotes.map((note) => (
            <article key={note.title} className="theory-card">
              <h3>{note.title}</h3>
              <p>{note.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-mermaid" aria-labelledby="mermaid-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">mermaid diagrams</p>
          <h2 id="mermaid-title">Markdown 문서에 그대로 들어가는 다이어그램</h2>
          <p>
            GitHub에서는 아래 Mermaid 블록이 렌더링됩니다. 배포 설명을 구두로만 하지 않고, pull
            request 리뷰·운영 문서에서 같은 그림을 재사용합니다.
          </p>
        </div>

        <div className="mermaid-grid">
          {mermaidDiagrams.map((diagram) => (
            <article key={diagram.title} className="mermaid-card">
              <div>
                <h3>{diagram.title}</h3>
                <p>{diagram.summary}</p>
              </div>
              <MermaidDiagram chart={diagram.code} title={diagram.title} />
              <details className="mermaid-source">
                <summary>Mermaid source</summary>
                <pre aria-label={`${diagram.title} Mermaid source`}>
                  <code>{diagram.code}</code>
                </pre>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-footer" aria-label="다음 행동">
        <div>
          <p className="eyebrow">Next route</p>
          <h2>이론 가이드부터 이어서 확인하세요</h2>
        </div>
        <Link className="guide-cta" to="/intro/theory">
          이론 가이드로 이동
        </Link>
      </section>
    </>
  )
}
