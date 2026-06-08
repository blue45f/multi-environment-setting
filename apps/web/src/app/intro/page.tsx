import Link from 'next/link';

const environmentModes = [
  {
    name: 'Preview',
    route: '/pr-123/',
    owner: '개발자 + 리뷰어',
    trigger: 'Pull Request 생성/업데이트',
    purpose: '기능 단위로 실제 URL을 만들고, 리뷰어가 화면과 API 연결값을 직접 확인합니다.',
    checks: ['feature flag preview key', 'mock or sandbox API', 'PR별 cleanup 대상'],
  },
  {
    name: 'Staging',
    route: '/staging/current/',
    owner: 'QA + 릴리즈 담당자',
    trigger: 'main merge 후 자동 배포',
    purpose: '운영 배포 전 동일 산출물을 staging 설정으로 검증합니다.',
    checks: ['staging API', 'realistic auth flow', 'release checklist'],
  },
  {
    name: 'Production',
    route: '/production/current/',
    owner: '운영 담당자',
    trigger: '수동 승인 또는 protected environment',
    purpose: '검증된 산출물만 production 설정으로 승격합니다.',
    checks: ['production API', 'observability tags', 'rollback pointer'],
  },
];

const walkthrough = [
  {
    step: '1',
    title: '환경값을 코드에 박지 않습니다',
    body: '빌드 산출물은 동일하게 유지하고, 배포 위치별 env.<stage>.json만 바꿔서 API URL과 feature flag key를 주입합니다.',
  },
  {
    step: '2',
    title: 'artifact prefix로 충돌을 막습니다',
    body: 'web/pr-123, web/staging/current, web/production/current처럼 같은 버킷 안에서도 환경별 경로를 분리합니다.',
  },
  {
    step: '3',
    title: '워크플로 권한을 환경별로 나눕니다',
    body: 'PR preview는 빠르게, staging은 main 기준으로, production은 protected approval을 거치도록 GitHub Actions를 분리합니다.',
  },
  {
    step: '4',
    title: 'cleanup을 운영 설계에 포함합니다',
    body: 'PR이 닫히면 preview prefix를 제거하고, S3 lifecycle로 오래된 샘플 객체를 자동 만료시켜 비용을 낮춥니다.',
  },
];

const usageCommands = [
  {
    title: '로컬에서 preview 환경처럼 실행',
    command: 'NEXT_PUBLIC_ENV=preview pnpm dev',
    note: '로컬 UI가 preview stage badge와 preview env.json을 기준으로 동작하는지 확인합니다.',
  },
  {
    title: '정적 산출물 생성',
    command: 'pnpm build',
    note: 'out/ 디렉터리에 S3, CloudFront, Vercel에 올릴 수 있는 정적 파일이 생성됩니다.',
  },
  {
    title: '무료 샘플 S3로 업로드',
    command:
      'AWS_PROFILE=multi-env-free-sample aws s3 sync out s3://multi-env-free-sample-945203151945-ap-northeast-2/ --delete',
    note: 'CloudFront 없이 S3 website endpoint만 사용하는 최저비용 샘플 배포입니다.',
  },
];

export const metadata = {
  title: '멀티 개발환경 사용 가이드 · Multi-Environment Demo',
  description: 'Preview, staging, production을 한 정적 앱에서 분리 운영하는 실전 사용법과 데모',
};

export default function IntroPage() {
  return (
    <main id="content" className="intro-page">
      <section className="guide-hero" aria-labelledby="intro-title">
        <Link className="back-link" href="/">
          ← 데모로 돌아가기
        </Link>
        <div className="guide-hero__grid">
          <div>
            <p className="eyebrow">Multi-environment field guide</p>
            <h1 id="intro-title">Preview, staging, production을 한 번에 설명하는 실전 데모</h1>
            <p>
              이 페이지는 “빌드는 한 번, 설정은 런타임에, 배포는 환경별로”라는 원칙을 실제 팀 온보딩
              문서처럼 설명합니다. PR 리뷰, QA 검증, 운영 승격이 어떤 URL과 설정 파일을 거치는지 한
              화면에서 따라갈 수 있습니다.
            </p>
          </div>
          <aside className="guide-snapshot" aria-label="현재 데모 요약">
            <span className="guide-snapshot__label">Live model</span>
            <strong>Static app + runtime env.json</strong>
            <dl>
              <div>
                <dt>Build</dt>
                <dd>Next static export</dd>
              </div>
              <div>
                <dt>Deploy</dt>
                <dd>S3 / CloudFront / Vercel compatible</dd>
              </div>
              <div>
                <dt>Cost mode</dt>
                <dd>No server, no database, no NAT</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="guide-flow" aria-labelledby="flow-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">How the system moves</p>
          <h2 id="flow-title">하나의 산출물이 세 환경을 통과하는 방식</h2>
        </div>
        <div className="guide-rail" aria-label="빌드와 배포 흐름">
          <article>
            <span>source</span>
            <strong>GitHub PR</strong>
            <p>리뷰가 필요한 변경이 들어오면 preview workflow가 시작됩니다.</p>
          </article>
          <article>
            <span>build</span>
            <strong>Static artifact</strong>
            <p>Next 앱을 정적 파일로 만들고, 환경값은 별도 JSON으로 유지합니다.</p>
          </article>
          <article>
            <span>route</span>
            <strong>Environment URL</strong>
            <p>preview, staging, production prefix가 서로 다른 런타임 설정을 가리킵니다.</p>
          </article>
        </div>
      </section>

      <section className="guide-modes" aria-labelledby="modes-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Environment playbook</p>
          <h2 id="modes-title">환경별로 무엇을 보고, 누가 승인하는지 분리합니다</h2>
        </div>
        <div className="mode-grid">
          {environmentModes.map((mode) => (
            <article key={mode.name} className="mode-card">
              <div className="mode-card__top">
                <strong>{mode.name}</strong>
                <code>{mode.route}</code>
              </div>
              <dl>
                <div>
                  <dt>Owner</dt>
                  <dd>{mode.owner}</dd>
                </div>
                <div>
                  <dt>Trigger</dt>
                  <dd>{mode.trigger}</dd>
                </div>
              </dl>
              <p>{mode.purpose}</p>
              <ul>
                {mode.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-demo" aria-labelledby="demo-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Interactive mental model</p>
          <h2 id="demo-title">데모를 이렇게 보면 됩니다</h2>
        </div>
        <div className="walkthrough-list">
          {walkthrough.map((item) => (
            <article key={item.step}>
              <span>{item.step}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-usage" aria-labelledby="usage-title">
        <div>
          <p className="eyebrow">Runbook</p>
          <h2 id="usage-title">직접 실행할 때 쓰는 명령</h2>
          <p>
            로컬 개발자는 apps/web에서 실행하고, AWS 샘플은 전용 multi-env-free-sample 프로필만
            사용합니다. 운영용 termsdesk-deploy 같은 다른 서비스 계정은 쓰지 않습니다.
          </p>
        </div>
        <div className="command-stack">
          {usageCommands.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <pre>
                <code>{item.command}</code>
              </pre>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-compare" aria-labelledby="compare-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Decision guide</p>
          <h2 id="compare-title">Vercel과 AWS 샘플을 언제 쓰면 좋은가</h2>
        </div>
        <div className="compare-grid">
          <article>
            <h3>Vercel preview</h3>
            <p>
              빠른 공유 URL과 프론트엔드 리뷰에 적합합니다. 팀 배포 보호, 무료 플랜 배포 한도,
              프로젝트 연결 상태를 확인해야 합니다.
            </p>
          </article>
          <article>
            <h3>AWS S3 website</h3>
            <p>
              CloudFront 없이 가장 단순하고 저렴하게 정적 산출물을 확인할 때 적합합니다. HTTPS가
              필요하면 CloudFront를 추가합니다.
            </p>
          </article>
          <article>
            <h3>Full AWS architecture</h3>
            <p>
              실제 운영 전환에는 CloudFront, GitHub OIDC, protected environment, cleanup
              workflow까지 포함한 구성이 맞습니다.
            </p>
          </article>
        </div>
      </section>

      <section className="guide-footer" aria-label="다음 행동">
        <div>
          <p className="eyebrow">Next action</p>
          <h2>먼저 preview URL을 보고, 그다음 staging 승격을 확인하세요</h2>
        </div>
        <Link className="guide-cta" href="/">
          환경 데모 열기
        </Link>
      </section>
    </main>
  );
}
