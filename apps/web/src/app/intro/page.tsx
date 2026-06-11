import Link from 'next/link';

import { SITE_URL } from '@/lib/site';

import { MermaidDiagram } from './MermaidDiagram';

const representativeUrl = SITE_URL;

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

const architectureLayers = [
  {
    name: 'Source',
    scope: '정적 프론트엔드 운영 원칙',
    detail: '환경 이름, S3 prefix, OIDC 역할, 도메인 규칙을 먼저 한 모델로 고정합니다.',
  },
  {
    name: 'Build',
    scope: 'Next static export',
    detail: '앱 코드는 한 번만 빌드하고, 산출물은 preview/staging/production이 공유합니다.',
  },
  {
    name: 'Config',
    scope: 'env.*.json runtime config',
    detail: 'API URL, Sentry 환경, public feature flag key는 런타임 `env.json`으로 바꿉니다.',
  },
  {
    name: 'Route',
    scope: 'Vercel alias · CloudFront Function · S3 prefix',
    detail:
      '개인 공개 URL은 Vercel alias로 공유하고, 실제 운영 경계는 CloudFront와 S3 prefix로 잡습니다.',
  },
  {
    name: 'Guard',
    scope: 'GitHub environments · smoke · cleanup',
    detail:
      'production은 승인 게이트, preview는 PR close/schedule cleanup으로 생명주기를 제한합니다.',
  },
];

const theoryNotes = [
  {
    title: '왜 “멀티베타”를 PR 단위로 자르는가',
    body: '여러 기능을 하나의 staging에 몰아 넣으면 리뷰 타이밍과 데이터 상태가 섞입니다. PR preview는 기능별 URL을 독립시켜 리뷰어가 “이 변경만” 보고 판단하게 만듭니다.',
  },
  {
    title: '왜 환경별 재빌드를 피하는가',
    body: 'preview에서 본 JS 번들과 production 번들이 다르면 검증 결과의 의미가 약해집니다. build once는 검증한 artifact를 그대로 승격한다는 추적성을 줍니다.',
  },
  {
    title: '왜 config를 public runtime 파일로 두는가',
    body: '브라우저 앱에서 쓰는 API base URL과 public key는 어차피 노출됩니다. secret은 배포 권한과 서버 쪽 저장소에 두고, 화면 앱은 `env.json`만 읽게 하면 환경 전환이 단순해집니다.',
  },
  {
    title: '왜 prefix와 domain을 같이 설명하는가',
    body: '개인 포트폴리오 배포는 Vercel alias로 충분하지만, 운영형 AWS에서는 `web/pr-123`, `web/staging/current`처럼 prefix가 비용·권한·cleanup 경계가 됩니다.',
  },
];

const mermaidDiagrams = [
  {
    title: '배포 아키텍처',
    summary:
      '한 번 만든 artifact가 runtime config와 route layer를 거쳐 환경별 URL로 나뉘는 모델입니다.',
    code: `flowchart LR
  Dev["Developer / PR"] --> CI["GitHub Actions"]
  CI --> Build["Build once\\nNext static export"]
  Build --> Artifact["Immutable artifact\\nout/"]
  Artifact --> Preview["preview\\n/pr-<n> + env.preview.json"]
  Artifact --> Staging["staging/current\\nenv.staging.json"]
  Artifact --> Production["production/current\\nenv.production.json"]
  Preview --> Review["리뷰어 확인"]
  Staging --> QA["QA smoke"]
  Production --> Users["사용자 트래픽"]`,
  },
  {
    title: '승격과 롤백 흐름',
    summary:
      'staging과 production은 같은 release SHA를 current 포인터로 전환하고, 장애 시 이전 SHA로 되돌립니다.',
    code: `stateDiagram-v2
  [*] --> Preview: PR open/update
  Preview --> Staging: merge to main
  Staging --> Production: approval + smoke pass
  Production --> Rollback: incident
  Rollback --> Production: promote previous release
  Preview --> Cleanup: PR close / schedule`,
  },
];

const platformGuides = [
  {
    platform: 'Local first',
    goal: 'AWS 계정 없이 구조 검증',
    command: 'make e2e-local ENV=preview',
    steps: [
      'env.preview.json을 out/env.json으로 복사',
      'Next static export 생성',
      '정적 파일 서버로 out/ 서빙',
      'Playwright smoke와 Web Vitals 예산 확인',
    ],
  },
  {
    platform: 'AWS S3 baseline',
    goal: '가장 작은 정적 호스팅 검증',
    command: 'AWS_PROFILE=multi-env-free-sample aws s3 sync apps/web/out s3://<bucket>/ --delete',
    steps: [
      '서버/DB/NAT 없이 정적 산출물만 공개',
      'env.json과 HTML은 no-cache',
      '해시 asset은 immutable 캐시',
      '샘플 리소스는 lifecycle로 비용 제한',
    ],
  },
  {
    platform: 'AWS CloudFront production',
    goal: 'preview/staging/production 운영형 분리',
    command: 'make bootstrap',
    steps: [
      'Terraform으로 S3, CloudFront, OIDC 역할 생성',
      'CloudFront Function으로 host/path를 S3 prefix로 재작성',
      'GitHub variables와 environments 자동 설정',
      'production은 승인 후 동일 artifact를 승격',
    ],
  },
  {
    platform: 'GitHub Actions',
    goal: 'PR preview와 승격 자동화',
    command: 'make gh-setup',
    steps: [
      'SERVICES 매트릭스로 서비스별 빌드/배포',
      'DEPLOY_CONFIG에서 역할 ARN과 배포 ID 조회',
      'PR close와 schedule cleanup으로 orphan prefix 정리',
      'Validate 집계 체크로 PR 필수 게이트 구성',
    ],
  },
  {
    platform: 'Vercel personal',
    goal: '개인 포트폴리오와 빠른 공유 URL',
    command: 'vercel --prod --yes',
    steps: [
      '운영 모델의 기준은 AWS 문서로 유지',
      '대표 URL은 개인 프로젝트 공개용으로만 사용',
      'SSO protection은 공개 필요 시 해제',
      'canonical URL과 공개 접속 포인트만 싱크',
    ],
  },
];

const domainFlow = [
  {
    name: 'Vercel deployment URL',
    example: 'web-<random>-blue45fs-projects.vercel.app',
    use: '개별 배포마다 생기는 불변 확인 URL',
    detail:
      'Vercel이 배포 ID와 프로젝트/팀 scope를 섞어 자동 생성합니다. 매번 달라질 수 있으므로 문서의 기준 URL로 쓰지 않습니다.',
  },
  {
    name: 'Vercel representative alias',
    example: representativeUrl.replace('https://', ''),
    use: '개인 프로젝트 공유와 포트폴리오 공개 URL',
    detail:
      '현재 배포를 사람이 기억하기 쉬운 alias에 연결합니다. 운영 아키텍처의 기준은 아니고, 소개페이지를 빠르게 공유하기 위한 입구입니다.',
  },
  {
    name: 'AWS preview domain',
    example: 'pr-123.preview.example.com',
    use: 'PR마다 격리된 베타 환경',
    detail:
      'custom domain을 켜면 PR 번호가 host label이 됩니다. 도메인이 없으면 CloudFront 기본 도메인의 `/pr-123/` path preview로 시작합니다.',
  },
  {
    name: 'AWS staging / production',
    example: 'staging.example.com / www.example.com',
    use: '상시 검증과 운영 트래픽',
    detail:
      'CloudFront origin path를 각각 `/web/staging/current`, `/web/production/current`에 고정해 release 승격과 rollback을 단순화합니다.',
  },
];

const scriptCatalog = [
  {
    name: 'preflight.sh',
    command: 'make preflight',
    purpose: '도구, 인증, tfvars 준비 상태를 먼저 확인합니다.',
    principle: '실제 리소스 생성 전에 실패 조건을 빠르게 드러냅니다.',
  },
  {
    name: 'bootstrap.sh',
    command: 'make bootstrap',
    purpose: 'preflight → terraform apply → gh-setup을 한 번에 실행합니다.',
    principle: '초기 구축 순서를 한 스크립트로 고정해 누락을 줄입니다.',
  },
  {
    name: 'dev.sh',
    command: 'make app-dev ENV=staging',
    purpose: '선택한 env 파일을 public/env.json으로 복사하고 dev server를 띄웁니다.',
    principle: '로컬에서도 런타임 config 분리 방식을 그대로 체험합니다.',
  },
  {
    name: 'e2e-local.sh',
    command: 'make e2e-local ENV=preview',
    purpose: 'AWS 없이 build → out/ 서빙 → smoke를 재현합니다.',
    principle: '배포 파이프라인의 핵심을 로컬에서 반복 검증합니다.',
  },
  {
    name: 'deploy-s3.sh',
    command: './scripts/deploy-s3.sh apps/web/out s3://<bucket>/web/pr-123',
    purpose: '정적 산출물을 S3에 올리고 파일 종류별 cache-control을 분리합니다.',
    principle: 'HTML/config는 no-cache, 해시 asset은 immutable로 캐시 오염을 막습니다.',
  },
  {
    name: 'promote.sh',
    command:
      './scripts/promote.sh s3://<bucket>/web/staging/releases/<sha> s3://<bucket>/web/staging/current',
    purpose: '불변 release를 current prefix로 승격합니다.',
    principle: '검증한 artifact를 다시 빌드하지 않고 같은 산출물로 승격합니다.',
  },
  {
    name: 'rollback.sh',
    command: 'make rollback SERVICE=web ENV=production SHA=<sha> DIST=<id>',
    purpose: '이전 release를 current로 되돌리고 entry/config를 invalidate합니다.',
    principle: '장애 시 새 빌드가 아니라 검증된 이전 SHA로 복구합니다.',
  },
  {
    name: 'cleanup-preview.sh',
    command: 'DRY_RUN=true ./scripts/cleanup-preview.sh sweep',
    purpose: '닫힌 PR의 preview prefix 후보를 찾고 안전하게 삭제합니다.',
    principle: '정확한 pr-숫자 prefix, open PR 보존, grace period, 삭제 한도로 사고를 막습니다.',
  },
  {
    name: 'new-service.sh',
    command: 'make new-service NAME=admin',
    purpose: 'apps/web 템플릿에서 새 프론트엔드 서비스를 복제합니다.',
    principle: '서비스 추가 후 Terraform services 배열과 GitHub 매트릭스에 자연스럽게 합류합니다.',
  },
];

const scriptPrinciples = [
  {
    title: '입력값은 Makefile로 좁힌다',
    detail:
      '`SERVICE`, `ENV`, `SHA`, `DIST` 같은 작은 변수만 바꾸면 되게 만들어 팀원이 긴 명령을 외우지 않게 합니다.',
  },
  {
    title: '환경 설정은 파일 복사로 주입한다',
    detail:
      '`env.preview.json`을 `env.json`으로 복사하는 방식이라 앱 번들을 다시 빌드하지 않아도 환경 차이를 설명할 수 있습니다.',
  },
  {
    title: 'S3 캐시는 파일 성격별로 나눈다',
    detail:
      'entry/config는 최신성이 중요하고 hash asset은 불변성이 중요합니다. `deploy-s3.sh`는 두 요구를 다른 sync pass로 처리합니다.',
  },
  {
    title: '삭제와 롤백은 방어적으로 만든다',
    detail:
      'cleanup은 prefix 패턴과 open PR을 확인하고, rollback은 존재하는 release SHA만 current로 되돌립니다.',
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
      'S3 경로에 환경별 폴더를 나누는 방식입니다. 충돌을 막고 cleanup, 감사, rollback을 쉽게 만듭니다.',
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
    title: '대표 Vercel URL 확인',
    command: `curl -I ${representativeUrl}/intro/ && curl ${representativeUrl}/env.json`,
    note: '개인 프로젝트 공유용 대표 URL입니다. 운영 모델과 배포 문서는 AWS S3/CloudFront 기준으로 유지합니다.',
  },
  {
    title: 'S3 무료 샘플 업로드',
    command:
      "AWS_PROFILE=multi-env-free-sample aws s3 sync out s3://multi-env-free-sample-945203151945-ap-northeast-2/ --delete --cache-control 'no-cache, no-store, must-revalidate'",
    note: 'CloudFront 없이도 접속 가능한 저비용 공유용 경로입니다. 운영 전환 시 HTTPS가 필요하면 CloudFront를 붙입니다.',
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
  title: '멀티베타 환경 개발가이드 · 시작부터 운영까지',
  description:
    'Next.js, React.js 같은 정적 프론트엔드 리소스의 preview, staging, production 멀티베타 환경을 build-once 방식으로 설명하는 아키텍처 가이드',
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

      <section className="guide-stack" aria-labelledby="stack-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">source of truth</p>
          <h2 id="stack-title">한 페이지에서 전체 모델을 먼저 파악</h2>
          <p>
            이 페이지 안에서 정적 리소스 대상, AWS 배포 구조, runtime config, 스크립트, 도메인
            흐름을 모두 확인할 수 있게 구성했습니다. 외부 문서는 보조 자료이고, 전체 맥락은 여기서
            먼저 파악합니다.
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

      <section className="guide-theory" aria-labelledby="theory-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">markdown theory notes</p>
          <h2 id="theory-title">멀티베타 환경을 설계할 때 먼저 잡아야 할 이론</h2>
          <p>
            아래 내용은 `docs/MULTI_BETA_GUIDE.md`에 같은 관점으로 정리되어 있습니다. 화면은
            onboarding용 요약이고, Markdown 문서는 리뷰와 운영 인수인계용 기준선입니다.
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

      <section className="guide-domains" aria-labelledby="domains-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">domain and traffic flow</p>
          <h2 id="domains-title">배포되면 URL은 어떻게 만들어지고 트래픽은 어디로 흐를까요</h2>
          <p>
            개인 공유용 Vercel URL은 기억하기 쉬운 alias만 관리하고, 실제 운영형 멀티베타 도메인은
            AWS에서 preview/staging/production 규칙으로 고정합니다. 랜덤 URL과 운영 URL을 섞어
            기준으로 쓰지 않는 것이 핵심입니다.
          </p>
        </div>

        <div className="domain-flow">
          {domainFlow.map((domain) => (
            <article key={domain.name} className="domain-card">
              <span>{domain.name}</span>
              <h3>{domain.example}</h3>
              <strong>{domain.use}</strong>
              <p>{domain.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-platforms" aria-labelledby="platforms-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">platform setup paths</p>
          <h2 id="platforms-title">플랫폼별로 가장 짧게 구축하는 경로</h2>
          <p>
            이 저장소는 Next.js static export, React SPA처럼 빌드 결과가 HTML/CSS/JS 정적 파일로
            떨어지는 프론트엔드를 기준으로 합니다. 개인 공개 URL은 Vercel로 가볍게 유지하고, 실제
            멀티베타 운영 모델은 AWS S3/CloudFront/GitHub OIDC 기준으로 설명합니다.
          </p>
        </div>

        <div className="platform-grid">
          {platformGuides.map((guide) => (
            <article key={guide.platform} className="platform-card">
              <div>
                <span>{guide.platform}</span>
                <h3>{guide.goal}</h3>
              </div>
              <pre>
                <code>{guide.command}</code>
              </pre>
              <ol>
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-scripts" aria-labelledby="scripts-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">ready-made scripts</p>
          <h2 id="scripts-title">이미 만들어 둔 간단 적용 스크립트</h2>
          <p>
            긴 클라우드 명령을 직접 외우지 않도록 `Makefile`이 단일 진입점 역할을 합니다. 각
            스크립트는 한 가지 책임만 갖고, 실패 조건과 삭제 범위를 코드 안에서 제한합니다.
          </p>
        </div>

        <div className="script-list">
          {scriptCatalog.map((script) => (
            <article key={script.name} className="script-row">
              <div>
                <span>{script.name}</span>
                <h3>{script.purpose}</h3>
              </div>
              <pre>
                <code>{script.command}</code>
              </pre>
              <p>{script.principle}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-script-theory" aria-labelledby="script-theory-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">script theory</p>
          <h2 id="script-theory-title">스크립트가 단순해 보이지만 안전하게 동작하는 원리</h2>
        </div>

        <div className="script-theory-grid">
          {scriptPrinciples.map((item) => (
            <article key={item.title} className="script-theory-card">
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
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
          <p className="eyebrow">AWS rollout guide</p>
          <h2 id="compare-title">AWS 기준으로 어디부터 고도화할까요</h2>
        </div>
        <div className="compare-grid">
          <article>
            <h3>1. S3 static baseline</h3>
            <p>
              가장 먼저 `out/` 정적 산출물을 S3 prefix에 올려 build-once 구조가 맞는지 확인합니다.
              `index.html`, `env.json`, `deployment.json`은 no-cache로 두고 hash asset만 immutable로
              분리합니다.
            </p>
          </article>
          <article>
            <h3>2. CloudFront routing</h3>
            <p>
              preview는 <code>pr-&lt;n&gt;</code> prefix, staging/production은 <code>current</code>{' '}
              prefix로 라우팅합니다. CloudFront Function은 host/path를 S3 prefix로 재작성하고
              entry/config invalidation만 수행합니다.
            </p>
          </article>
          <article>
            <h3>3. OIDC promotion</h3>
            <p>
              GitHub OIDC 역할을 preview/staging/production/cleanup으로 나누고, production은
              environment reviewer 승인 뒤에만 AssumeRole이 가능하게 둡니다. rollback은 이전 release
              SHA를 `current`로 되돌립니다.
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
