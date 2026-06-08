import Link from 'next/link';

const environmentModes = [
  {
    name: 'Preview',
    route: '/pr-123/',
    owner: '개발자 + 리뷰어',
    trigger: 'Pull Request 생성/업데이트',
    purpose: '기능 단위로 실제 UI를 확인하고, 리뷰 코멘트에서 바로 동작을 판단합니다.',
    checks: ['feature flag preview key', 'mock/sandbox API', 'PR 정리용 cleanup 대상'],
  },
  {
    name: 'Staging',
    route: '/staging/current/',
    owner: 'QA + 릴리즈 담당자',
    trigger: 'main merge 후 자동 배포',
    purpose:
      '프로덕션 전 최종 검증 환경으로 실제 배포 절차를 흉내 내어 기능/권한/로그 추적을 검증합니다.',
    checks: ['staging API', '실제 인증 플로우', '릴리스 체크리스트'],
  },
  {
    name: 'Production',
    route: '/production/current/',
    owner: '운영 담당자',
    trigger: '승인 플로우 + manual/보호 브랜치',
    purpose: '품질 기준을 통과한 산출물을 가장 안정된 설정으로 운영 URL에 반영합니다.',
    checks: ['production API', 'observability 태그', 'rollback 포인트'],
  },
];

const architectureFlow = [
  {
    phase: '1',
    title: 'GitHub 이벤트',
    detail: '코드 변경이 PR/merge 이벤트로 들어오면 워크플로가 실행 후보가 됩니다.',
    role: '개발자/릴리즈 엔진',
    output: '워크플로 트리거',
  },
  {
    phase: '2',
    title: '정적 산출물 빌드',
    detail:
      'Next 앱을 static export로 빌드해 동일한 `out/` 번들을 만든 뒤, 앱 로직은 환경별로 분기하지 않습니다.',
    role: '빌드 시스템',
    output: '공통 artifact',
  },
  {
    phase: '3',
    title: '런타임 설정 주입',
    detail:
      '배포 위치마다 `env.json`만 바꿔 API URL, Sentry 환경명, feature flag key를 덧씌웁니다.',
    role: 'CDN/호스팅',
    output: 'stage별 runtime config',
  },
  {
    phase: '4',
    title: '환경별 라우트',
    detail:
      'prefix 기반 URL(예: `/pr-123`, `/staging/current`)로 서로 다른 환경을 같은 앱 코드에서 분리 운영합니다.',
    role: 'CloudFront/Vercel/S3',
    output: '환경 경계 확보',
  },
  {
    phase: '5',
    title: '검증 → 승인 → 승격',
    detail:
      '각 환경에서 통과한 뒤 다음 단계로 넘어가며, 운영은 수동 승인 또는 보호 규칙으로 안전하게 전환합니다.',
    role: 'QA/운영',
    output: '롤백 가능한 배포 이력',
  },
];

const principles = [
  {
    title: '빌드는 한 번만',
    desc: '환경별로 코드를 다시 빌드할수록 버그와 비용이 늘어납니다. 가능한 같은 산출물을 공유하세요.',
  },
  {
    title: '설정은 분리',
    desc: 'API 주소, 키, sentry 환경명은 환경별 JSON으로 분리해 `env.json` 하나로 교체하면 됩니다.',
  },
  {
    title: '경계는 명확하게',
    desc: 'prefix(폴더/경로) 단위로 분리하면 삭제, 롤백, 감사가 쉬워져 운영 실수가 줄어듭니다.',
  },
  {
    title: '검증 루트 고정',
    desc: '리뷰어가 먼저 보는 preview와 운영 전 staging/prod 기준을 명확히 분리해 책임을 분담하세요.',
  },
  {
    title: '비용은 자동 청소로 통제',
    desc: 'Lifecycle 정책으로 오래된 preview 객체를 정리하고, 필요 시 S3 bucket를 최소 구성으로 유지합니다.',
  },
  {
    title: '권한은 작업별 최소화',
    desc: '루트키보다는 워크플로용 OIDC + 환경별 최소 권한을 기본으로 가는 것이 운영 비용보다 더 중요합니다.',
  },
];

const glossary = [
  {
    term: 'Artifact(아티팩트)',
    definition:
      '빌드 결과물. 코드 번들, 정적 파일, 이미지, 맵 파일 등을 한 번에 묶은 산출물입니다.',
  },
  {
    term: 'Runtime config',
    definition: '앱 시작 시 로드하는 실행 환경 설정. 본 데모의 `env.json`이 대표적입니다.',
  },
  {
    term: 'Prefix',
    definition:
      'S3/Vercel 경로에 환경별 폴더를 나누는 방식입니다. 충돌을 막고 정리 용이를 돕습니다.',
  },
  {
    term: 'Protected environment',
    definition: 'production처럼 민감한 배포를 승인 절차와 보호 규칙으로 제한하는 방식입니다.',
  },
  {
    term: 'Rollback',
    definition: '문제 생기면 이전 버전 prefix나 설정으로 즉시 되돌리는 운영 행위입니다.',
  },
  {
    term: 'Lifecycle',
    definition:
      '스토리지 오브젝트의 수명 정책. 오래된 객체를 자동 삭제해 비용을 낮추는 장치입니다.',
  },
  {
    term: 'Static export',
    definition: '서버가 아니라 HTML/CSS/JS 정적 파일만 배포하는 방식. 이 샘플의 핵심입니다.',
  },
  {
    term: 'CDN',
    definition: '정적 파일을 지역 캐시로 빠르게 전달해 지연을 줄이는 네트워크 레이어입니다.',
  },
];

const usageCommands = [
  {
    title: '로컬 preview 실행',
    command: 'NEXT_PUBLIC_ENV=preview pnpm dev',
    note: '로컬에서도 어떤 env.stage이 적용되는지 확인하려면 `/env.json` 또는 코드 경로 로직을 확인하세요.',
  },
  {
    title: '정적 산출물 생성',
    command: 'pnpm build',
    note: 'Next 앱이 `out/` 폴더에 정적 파일을 생성합니다. 팀에서는 PR마다 산출물 정책을 고정하세요.',
  },
  {
    title: 'S3 무료 샘플 업로드',
    command:
      "AWS_PROFILE=multi-env-free-sample aws s3 sync out s3://multi-env-free-sample-945203151945-ap-northeast-2/ --delete --cache-control 'no-cache, no-store, must-revalidate'",
    note: 'CloudFront 없이도 접속 가능한 저비용 공유용 경로입니다. 운영 전환 시 HTTPS가 필요하면 CloudFront를 붙입니다.',
  },
  {
    title: '환경 설정 확인',
    command:
      'curl https://web-blond-nine-45.vercel.app/env.json && curl https://web-blond-nine-45.vercel.app/intro/',
    note: '`/env.json`을 먼저 확인하면 화면 상단의 환경 상태 텍스트가 어떻게 채워지는지 이해할 수 있습니다.',
  },
];

const walkthrough = [
  {
    title: '예시: PR이 올라갔을 때',
    body: '개발자는 PR을 올리고 리뷰어는 `/pr-123/intro/` 같은 preview 경로에서 UI를 확인합니다. 필요한 경우 `env.preview.json`을 갱신하지 않고도 동작이 바뀔 수 있음을 보여줍니다.',
  },
  {
    title: '예시: main 병합 후',
    body: 'main이 병합되면 staging prefix로 승격되어 거의 동일한 기능이 다른 URL에서 더 실환경에 가까운 설정값으로 검증됩니다.',
  },
  {
    title: '예시: 운영 승인',
    body: '승인 단계에서 production prefix만 바꾸고 배포 포인트를 옮기면 `artifact`는 그대로 두면서 운영 공개가 완성됩니다.',
  },
  {
    title: '예시: PR 종료 정리',
    body: 'PR이 닫히면 preview prefix가 남지 않도록 정리하고, 오래된 임시 리소스는 lifecycle으로 회수합니다.',
  },
];

export const metadata = {
  title: '멀티 환경 안내 페이지 · 시작부터 운영까지',
  description:
    'Preview, staging, production이 어떻게 분리되고 비용 효율적으로 운영되는지 초보자 관점의 아키텍처 가이드',
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
            <p className="eyebrow">멀티 환경 도시 가이드</p>
            <h1 id="intro-title">멀티 개발환경, 초보자도 한 번에 이해하는 지도형 설명</h1>
            <p>
              이 페이지는 팀 onboarding에 바로 사용할 수 있도록 구성한 실전 예시입니다. 코드와 배포
              파이프라인은 가급적 단순하게 유지하고, 운영은 환경별 설정(`env.json`)을 분리해
              제어하는 방식으로 설명합니다.
            </p>
          </div>

          <aside className="guide-snapshot" aria-label="데모 요약">
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

      <section className="guide-city" aria-labelledby="city-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">architecture city map</p>
          <h2 id="city-title">아키텍처 도시화: 데이터가 도로를 따라 흐르는 방식</h2>
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

      <section className="guide-principles" aria-labelledby="principles-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Architecture principles</p>
          <h2 id="principles-title">아키텍처 핵심 원리</h2>
        </div>

        <div className="principles-grid">
          {principles.map((item) => (
            <article key={item.title} className="principle-card">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-modes" aria-labelledby="modes-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Environment playbook</p>
          <h2 id="modes-title">환경별 운영 책임 분리</h2>
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
          <h2 id="demo-title">초보자용 시나리오로 확인</h2>
        </div>
        <div className="walkthrough-list">
          {walkthrough.map((item) => (
            <article key={item.title}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-glossary" aria-labelledby="glossary-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Glossary</p>
          <h2 id="glossary-title">용어사전</h2>
          <p>처음 접하는 용어를 한 줄 정의로 정리했습니다.</p>
        </div>
        <dl className="glossary-list">
          {glossary.map((entry) => (
            <div key={entry.term} className="glossary-item">
              <dt>{entry.term}</dt>
              <dd>{entry.definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="guide-usage" aria-labelledby="usage-title">
        <div>
          <p className="eyebrow">Runbook</p>
          <h2 id="usage-title">직접 실행할 때 쓰는 명령</h2>
          <p>
            로컬 개발은 `apps/web`에서 실행하고, AWS 샘플은 전용 `multi-env-free-sample` 프로필만
            사용합니다. 다른 서비스 계정(예: `termsdesk-deploy`)은 사용하지 않습니다.
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
          <h2 id="compare-title">Vercel / AWS 어디에 먼저 쓰면 될까요</h2>
        </div>
        <div className="compare-grid">
          <article>
            <h3>Vercel preview</h3>
            <p>
              팀 리뷰용 빠른 공유 URL에 가장 강합니다. 다만 팀 보안 설정(요청 시 protection) 과 무료
              플랜 배포 한도는 반드시 확인해야 합니다.
            </p>
          </article>
          <article>
            <h3>AWS S3 정적</h3>
            <p>
              CloudFront 없이도 가장 저렴하고 단순하게 테스트 가능합니다. HTTPS가 필요하거나 캐시
              정책이 중요하면 CloudFront를 추가하세요.
            </p>
          </article>
          <article>
            <h3>실제 운영</h3>
            <p>
              운영 전환에는 protected environments, PR 승인 게이트, cleanup workflow, IAM 최소 권한,
              모니터링 관측 지점까지 함께 구성합니다.
            </p>
          </article>
        </div>
      </section>

      <section className="guide-footer" aria-label="다음 행동">
        <div>
          <p className="eyebrow">Next action</p>
          <h2>이 페이지를 따라 한 번만 실행해 보세요</h2>
        </div>
        <Link className="guide-cta" href="/">
          데모 페이지로 이동
        </Link>
      </section>
    </main>
  );
}
