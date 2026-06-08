import Link from 'next/link';

const layers = [
  {
    title: 'GitHub Actions',
    body: 'PR, main push, 수동 production 배포를 서로 다른 workflow와 environment 권한으로 분리합니다.',
  },
  {
    title: 'S3 artifact prefixes',
    body: 'web/pr-123, web/staging/current, web/production/current처럼 같은 버킷 안에서 환경을 prefix로 격리합니다.',
  },
  {
    title: 'CloudFront routing',
    body: 'preview는 pr-<번호>를 인식하고, staging/production은 current prefix를 바라보도록 구성합니다.',
  },
  {
    title: 'Runtime env.json',
    body: '빌드 결과는 동일하게 유지하고 API URL, Sentry 환경, feature flag key만 런타임 파일로 바꿉니다.',
  },
];

const scenarios = [
  {
    label: 'Feature PR',
    route: '/pr-123/',
    result: '리뷰어가 실제 URL에서 새 기능을 확인합니다.',
  },
  {
    label: 'Release rehearsal',
    route: '/staging/current/',
    result: '운영 배포 전에 동일 산출물을 staging에서 검증합니다.',
  },
  {
    label: 'Production cutover',
    route: '/production/current/',
    result: '검증된 산출물만 production current로 승격합니다.',
  },
];

export const metadata = {
  title: '멀티 개발환경 소개 · Multi-Environment Demo',
  description: 'Preview, staging, production을 한 정적 앱에서 분리 운영하는 구조 설명',
};

export default function IntroPage() {
  return (
    <main id="content" className="intro-page">
      <section className="intro-hero" aria-labelledby="intro-title">
        <Link className="back-link" href="/">
          ← 데모로 돌아가기
        </Link>
        <p className="eyebrow">Architecture guide</p>
        <h1 id="intro-title">멀티 개발환경 구축을 한 장의 지도처럼 이해하기</h1>
        <p>
          이 레퍼런스는 “빌드는 한 번, 배포는 여러 환경으로”라는 원칙을 기준으로 PR preview,
          staging, production을 분리합니다. 개발자는 PR URL로 검증하고, 운영자는 같은 산출물을
          단계적으로 승격합니다.
        </p>
      </section>

      <section className="intro-diagram" aria-label="멀티 환경 아키텍처 다이어그램">
        <div className="diagram-node diagram-node--source">
          <span>source</span>
          GitHub
        </div>
        <div className="diagram-line" />
        <div className="diagram-node diagram-node--build">
          <span>build</span>
          Static artifact
        </div>
        <div className="diagram-line" />
        <div className="diagram-targets">
          {scenarios.map((scenario) => (
            <article key={scenario.label}>
              <strong>{scenario.label}</strong>
              <code>{scenario.route}</code>
              <p>{scenario.result}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="intro-layers" aria-labelledby="layers-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">What each layer does</p>
          <h2 id="layers-title">환경 분리는 한 기술이 아니라 네 계층이 나눠 맡습니다</h2>
        </div>
        <div className="layer-grid">
          {layers.map((layer, index) => (
            <article key={layer.title} className="layer-card">
              <span>0{index + 1}</span>
              <h3>{layer.title}</h3>
              <p>{layer.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="intro-checklist" aria-labelledby="checklist-title">
        <div>
          <p className="eyebrow">Why it helps</p>
          <h2 id="checklist-title">팀이 얻는 효과</h2>
        </div>
        <ul>
          <li>PR마다 살아있는 preview URL을 제공해 리뷰 품질을 올립니다.</li>
          <li>staging과 production의 환경값을 분리해 실수로 운영 API를 치는 위험을 줄입니다.</li>
          <li>정적 산출물과 런타임 설정을 분리해 rebuild 없이 환경을 바꿉니다.</li>
          <li>S3 lifecycle과 cleanup workflow로 오래된 preview 비용을 자동으로 줄입니다.</li>
        </ul>
      </section>
    </main>
  );
}
