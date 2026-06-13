import { SITE_URL } from '@/lib/site'

export const representativeUrl = SITE_URL

export const environmentModes = [
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
]

export const architectureFlow = [
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
]

export const architectureLayers = [
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
]

export const theoryNotes = [
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
]

export const mermaidDiagrams = [
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
]

export const platformGuides = [
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
]

export const domainFlow = [
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
]

export const scriptCatalog = [
  {
    category: '사전 점검',
    name: 'preflight.sh',
    command: 'make preflight',
    purpose: '구축 전에 도구, 인증, tfvars 준비 상태를 먼저 확인합니다.',
    when: '처음 저장소를 받은 직후, `make bootstrap` 전, 또는 AWS/GitHub 인증이 바뀐 뒤 실행합니다.',
    inputs: [
      'Terraform, AWS CLI, GitHub CLI, Node 22, corepack 또는 pnpm',
      'AWS 로그인 상태(`aws sts get-caller-identity`)',
      'GitHub 로그인 상태(`gh auth status`)',
      '`infra/terraform/terraform.tfvars` 파일',
    ],
    steps: [
      '필수 CLI가 설치되어 있는지 확인합니다.',
      'AWS/GitHub 인증과 현재 git 저장소 상태를 확인합니다.',
      '부족한 항목만 안내하고 실패 코드로 종료해 다음 단계 실행을 막습니다.',
    ],
    principle: '실제 리소스 생성 전에 실패 조건을 빠르게 드러냅니다.',
    caution: '읽기성 점검만 수행하므로 가장 먼저 실행해도 안전합니다.',
  },
  {
    category: '초기 구축',
    name: 'bootstrap.sh',
    command: 'make bootstrap',
    purpose: 'preflight → terraform apply → gh-setup을 한 번에 실행합니다.',
    when: '`terraform.tfvars`에 GitHub owner/repo와 리전 값을 채운 뒤, AWS 인프라를 처음 만들 때 사용합니다.',
    inputs: [
      '`infra/terraform/terraform.tfvars`',
      'AWS 리소스를 만들 수 있는 계정 권한',
      'GitHub repository variables/environments를 수정할 수 있는 권한',
    ],
    steps: [
      '`scripts/preflight.sh`로 사전 조건을 확인합니다.',
      '`terraform init`과 `terraform apply`를 실행해 S3, CloudFront, OIDC 역할을 만듭니다.',
      '`scripts/gh-setup.sh`로 GitHub 변수와 environments를 설정합니다.',
    ],
    principle: '초기 구축 순서를 한 스크립트로 고정해 누락을 줄입니다.',
    caution:
      'AWS 리소스를 실제로 생성합니다. `terraform apply` 계획을 확인한 뒤 `yes`를 입력하세요.',
  },
  {
    category: 'GitHub 설정',
    name: 'gh-setup.sh',
    command: 'PROD_REVIEWER=<github-login> make gh-setup',
    purpose: 'Terraform output을 GitHub variables와 environments로 자동 반영합니다.',
    when: '`terraform apply` 이후, 서비스가 추가되었거나 CloudFront 배포 ID/역할 ARN이 바뀐 뒤 실행합니다.',
    inputs: [
      '`terraform output`의 `aws_region`, `artifact_bucket`, `services`, `deploy_config`',
      '`GH_REPO` 선택값: 현재 git remote와 다른 repo에 설정할 때 사용',
      '`PROD_REVIEWER` 선택값: production 승인자를 자동 등록할 때 사용',
    ],
    steps: [
      '`AWS_REGION`, `ARTIFACT_BUCKET`, `SERVICES`, `DEPLOY_CONFIG` repo variables를 설정합니다.',
      '`preview`, `staging`, `production` environments를 생성합니다.',
      'production은 `main` 브랜치 배포 정책을 걸고, reviewer가 있으면 승인자를 추가합니다.',
    ],
    principle: 'Terraform 출력값과 GitHub UI 수동 입력값이 어긋나는 문제를 줄입니다.',
    caution:
      '`PROD_REVIEWER`를 생략하면 production reviewer는 미설정입니다. 운영 전 GitHub UI나 재실행으로 반드시 보강하세요.',
  },
  {
    category: '팀 운영',
    name: 'tf-backend.sh',
    command: 'make tf-backend',
    purpose: '선택적으로 Terraform 원격 state용 S3 버킷과 DynamoDB 락 테이블을 만듭니다.',
    when: '혼자 쓰는 로컬 state를 넘어서 팀이 같은 AWS 환경을 함께 관리해야 할 때 사용합니다.',
    inputs: [
      '`AWS_REGION` 선택값: 기본 `ap-northeast-2`',
      '`SERVICE_NAME` 선택값: 기본 `web`',
      '`TF_STATE_BUCKET`, `TF_LOCK_TABLE` 선택값: 이름을 직접 지정할 때 사용',
    ],
    steps: [
      'state 버킷을 만들고 버전 관리, 암호화, public access block을 켭니다.',
      'DynamoDB 락 테이블을 만들거나 기존 테이블을 재사용합니다.',
      '`infra/terraform/backend.hcl`을 작성합니다.',
    ],
    principle: '여러 사람이 동시에 Terraform을 실행할 때 state 충돌을 줄입니다.',
    caution:
      '이 스크립트만으로 backend가 활성화되지는 않습니다. `versions.tf`의 `backend "s3" {}` 주석 해제 후 `terraform init -backend-config=backend.hcl -migrate-state`를 실행하세요.',
  },
  {
    category: '로컬 미리보기',
    name: 'dev.sh',
    command: 'make app-dev SERVICE=web ENV=staging',
    purpose: '선택한 env 파일을 public/env.json으로 복사하고 dev server를 띄웁니다.',
    when: 'AWS 배포 전 `preview`, `staging`, `production` 런타임 설정 차이를 로컬 화면에서 확인할 때 사용합니다.',
    inputs: [
      '`apps/<service>/public/env.preview.json|env.staging.json|env.production.json`',
      '`SERVICE` 선택값: 기본 `web`',
      '`ENV` 선택값: 기본 `preview`',
    ],
    steps: [
      '선택한 `env.<환경>.json`을 `public/env.json`으로 복사합니다.',
      '앱 디렉터리에서 pnpm 의존성을 설치합니다.',
      'Next dev server를 `http://localhost:3000`으로 실행합니다.',
    ],
    principle: '로컬에서도 런타임 config 분리 방식을 그대로 체험합니다.',
    caution:
      '`public/env.json`은 로컬 산출물입니다. `env.*.json`에는 브라우저에 노출되면 안 되는 secret을 넣지 마세요.',
  },
  {
    category: '로컬 E2E',
    name: 'e2e-local.sh',
    command: 'make e2e-local SERVICE=web ENV=preview',
    purpose: 'AWS 없이 build → out/ 서빙 → smoke를 재현합니다.',
    when: 'PR을 올리기 전, 또는 AWS 계정 없이 build-once와 runtime config가 실제로 맞물리는지 확인할 때 사용합니다.',
    inputs: [
      '`apps/<service>/public/env.<환경>.json`',
      '`PORT` 선택값: 기본 `4173`',
      'Playwright Chromium 설치 가능 상태',
    ],
    steps: [
      '`pnpm install --frozen-lockfile` 후 static export 빌드를 실행합니다.',
      '선택한 env 파일을 `out/env.json`으로 복사합니다.',
      '`python3 -m http.server`로 `out/`을 서빙하고 Playwright smoke를 실행합니다.',
    ],
    principle: '배포 파이프라인의 핵심을 로컬에서 반복 검증합니다.',
    caution: '기본 포트가 사용 중이면 `PORT=4174 make e2e-local ENV=preview`처럼 바꿔 실행하세요.',
  },
  {
    category: '전체 검증',
    name: 'verify.sh',
    command: 'make verify',
    purpose: '모든 앱의 lint, format check, typecheck, test, build를 한 번에 실행합니다.',
    when: 'PR 올리기 전, 서비스 추가 후, 또는 공통 설정을 바꾼 뒤 CI와 가까운 로컬 게이트를 돌릴 때 사용합니다.',
    inputs: [
      '`apps/*/package.json`이 있는 모든 서비스',
      '각 앱의 pnpm lockfile과 Node 22 환경',
      '선택 도구: shellcheck, terraform',
    ],
    steps: [
      '각 `apps/*` 디렉터리에서 install, lint, format:check, typecheck, test, build를 수행합니다.',
      '설치되어 있으면 `scripts/*.sh`에 shellcheck를 실행합니다.',
      '설치되어 있으면 Terraform backend 없이 `terraform validate`를 실행합니다.',
    ],
    principle: 'AWS 없이도 CI validate와 가까운 품질 게이트를 로컬에서 재현합니다.',
    caution:
      '로컬에 shellcheck나 terraform이 없으면 해당 단계는 건너뜁니다. CI에서는 별도로 검사되므로 PR 전에는 가능하면 설치해 확인하세요.',
  },
  {
    category: 'S3 업로드',
    name: 'deploy-s3.sh',
    command: './scripts/deploy-s3.sh apps/web/out s3://<bucket>/web/pr-123',
    purpose: '정적 산출물을 S3에 올리고 파일 종류별 cache-control을 분리합니다.',
    when: 'preview prefix나 release prefix에 static export 산출물을 직접 올릴 때 사용합니다. GitHub Actions도 같은 정책을 따릅니다.',
    inputs: [
      '업로드할 로컬 디렉터리: 예 `apps/web/out`',
      '대상 S3 URI: 예 `s3://<bucket>/web/pr-123` 또는 `.../releases/<sha>`',
      'S3 sync/rm 권한이 있는 AWS 자격증명',
    ],
    steps: [
      '해시 자산은 `public,max-age=31536000,immutable`로 업로드합니다.',
      'HTML, RSC `*.txt`, sitemap, `env.json`, `deployment.json`은 no-cache로 업로드합니다.',
      '`env.*.json` 템플릿과 source map은 업로드 대상에서 제거합니다.',
    ],
    principle: 'HTML/config는 no-cache, 해시 asset은 immutable로 캐시 오염을 막습니다.',
    caution:
      '`--delete`가 대상 prefix 기준으로 동작합니다. `pr-123`, `releases/<sha>`, `current` 경로를 잘못 넣지 않았는지 먼저 확인하세요.',
  },
  {
    category: '캐시 갱신',
    name: 'invalidate.sh',
    command: './scripts/invalidate.sh <distribution_id> /index.html /env.json /deployment.json',
    purpose: 'CloudFront에서 entry/config 파일만 빠르게 무효화합니다.',
    when: '배포 직후 `index.html`, `env.json`, `deployment.json` 최신 반영이 필요하거나 rollback 후 캐시를 비울 때 사용합니다.',
    inputs: [
      'CloudFront distribution ID',
      'leading slash가 붙은 path 목록',
      'CloudFront invalidation 권한',
    ],
    steps: [
      'path를 주지 않으면 `/index.html`, `/env.json`, `/deployment.json`을 기본으로 사용합니다.',
      '필요하면 `/web/pr-123/*`처럼 재작성된 origin-style 경로도 직접 지정할 수 있습니다.',
      'AWS CLI의 invalidation 결과 테이블을 출력합니다.',
    ],
    principle: '불변 asset 전체가 아니라 entry/config만 갱신해 비용과 전파 시간을 줄입니다.',
    caution:
      '`/*` 전체 무효화는 비용과 전파 시간이 커집니다. 장애 대응처럼 사유가 있을 때만 사용하세요.',
  },
  {
    category: '승격',
    name: 'promote.sh',
    command:
      './scripts/promote.sh s3://<bucket>/web/staging/releases/<sha> s3://<bucket>/web/staging/current',
    purpose: '불변 release를 current prefix로 승격합니다.',
    when: '이미 업로드된 `releases/<sha>` 산출물을 staging 또는 production의 `current`로 전환할 때 사용합니다.',
    inputs: ['존재하는 release S3 URI', '대상 current S3 URI', 'S3 list/sync 권한'],
    steps: [
      'release prefix가 실제로 존재하는지 먼저 확인합니다.',
      'release 내용을 current prefix로 `aws s3 sync --delete` 합니다.',
      '`deploy-s3.sh`가 설정한 cache-control과 content-type 메타데이터를 보존합니다.',
    ],
    principle: '검증한 artifact를 다시 빌드하지 않고 같은 산출물로 승격합니다.',
    caution:
      '새 빌드를 만들지 않습니다. 어떤 SHA를 어떤 환경으로 승격하는지 release note와 함께 남기세요.',
  },
  {
    category: '롤백',
    name: 'rollback.sh',
    command: 'make rollback SERVICE=web ENV=production SHA=<sha> DIST=<id>',
    purpose: '이전 release를 current로 되돌리고 entry/config를 invalidate합니다.',
    when: 'staging 또는 production에서 장애가 확인되어 이미 검증된 이전 release SHA로 되돌려야 할 때 사용합니다.',
    inputs: [
      '`SERVICE`, `ENV`, `SHA`, `DIST`',
      '`ARTIFACT_BUCKET`: Makefile이 Terraform output에서 자동 주입',
      'S3 sync와 CloudFront invalidation 권한',
    ],
    steps: [
      '요청한 `releases/<sha>`가 없으면 사용 가능한 release 목록을 출력하고 중단합니다.',
      '해당 release를 `current/`로 `aws s3 sync --delete` 합니다.',
      '`DIST`가 있으면 `/index.html`, `/env.json`, `/deployment.json`을 invalidate합니다.',
    ],
    principle: '장애 시 새 빌드가 아니라 검증된 이전 SHA로 복구합니다.',
    caution:
      '`DIST`를 생략하면 CloudFront invalidation은 직접 실행해야 합니다. 롤백 사유와 SHA를 운영 기록에 남기세요.',
  },
  {
    category: '정리',
    name: 'cleanup-preview.sh',
    command:
      'ARTIFACT_BUCKET=<bucket> GH_REPO=<owner/repo> DRY_RUN=true ./scripts/cleanup-preview.sh sweep',
    purpose: '닫힌 PR의 preview prefix 후보를 찾고 안전하게 삭제합니다.',
    when: '닫힌 PR의 preview S3 prefix가 쌓일 때, 또는 schedule cleanup 동작을 수동으로 확인할 때 사용합니다.',
    inputs: [
      '`ARTIFACT_BUCKET` 필수',
      '`GH_TOKEN`, `GH_REPO` 필수: sweep에서 open PR 보존 여부 확인',
      '`SERVICE_NAME`, `DRY_RUN`, `GRACE_DAYS`, `MAX_DELETIONS` 선택값',
    ],
    steps: [
      'S3에서 `<service>/pr-<숫자>/` prefix만 후보로 수집합니다.',
      'GitHub open PR 목록을 조회해 열려 있는 PR은 보존합니다.',
      'closed 후 grace period가 지난 후보만 `cleanup-report/`에 기록합니다.',
      '`DRY_RUN=false`일 때만 `MAX_DELETIONS` 한도 안에서 삭제합니다.',
    ],
    principle: '정확한 pr-숫자 prefix, open PR 보존, grace period, 삭제 한도로 사고를 막습니다.',
    caution:
      '처음에는 반드시 `DRY_RUN=true`로 후보를 확인하세요. 개별 삭제는 `ARTIFACT_BUCKET=<bucket> ./scripts/cleanup-preview.sh delete 123`처럼 숫자 PR만 허용합니다.',
  },
  {
    category: '서비스 추가',
    name: 'new-service.sh',
    command: 'make new-service NAME=admin',
    purpose: 'apps/web 템플릿에서 새 프론트엔드 서비스를 복제합니다.',
    when: '한 저장소에서 `web`, `admin`처럼 여러 프론트엔드 앱을 같은 preview/staging/production 규칙으로 운영할 때 사용합니다.',
    inputs: [
      '`NAME`: 소문자로 시작하고 소문자/숫자/하이픈만 허용',
      '`apps/web` 템플릿 앱',
      '`infra/terraform/terraform.tfvars`의 `services` 배열 후속 수정',
    ],
    steps: [
      '`node_modules`, `.next`, `out`, 테스트 산출물, `public/env.json`을 제외하고 복사합니다.',
      '새 앱의 `package.json` name을 서비스명으로 바꿉니다.',
      '`services = ["web", "admin"]`처럼 tfvars를 수정한 뒤 `make tf-apply && make gh-setup`을 실행합니다.',
    ],
    principle: '서비스 추가 후 Terraform services 배열과 GitHub 매트릭스에 자연스럽게 합류합니다.',
    caution:
      '이미 존재하는 앱 이름이면 중단합니다. 현재 custom domain은 primary 서비스(`services[0]`) 기준이므로 추가 서비스 도메인은 별도 확장이 필요합니다.',
  },
]

export const scriptRunFlows = [
  {
    title: 'AWS 없이 먼저 확인',
    commands: ['make app-dev ENV=preview', 'make e2e-local ENV=staging', 'make verify'],
    note: '계정 준비 전에도 런타임 config, static export, smoke, 전체 앱 검증 흐름을 로컬에서 확인합니다.',
  },
  {
    title: '처음 AWS에 구축',
    commands: [
      'cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars',
      'make preflight',
      'make bootstrap',
      'PROD_REVIEWER=<github-login> make gh-setup',
    ],
    note: '값은 `terraform.tfvars` 한 곳에 모으고, Terraform output은 `gh-setup`으로 GitHub에 반영합니다.',
  },
  {
    title: '서비스 하나 더 추가',
    commands: [
      'make new-service NAME=admin',
      'services = ["web", "admin"]',
      'make tf-apply',
      'make gh-setup',
    ],
    note: '앱 생성 뒤 Terraform services 배열에 추가하면 GitHub Actions 매트릭스가 새 서비스를 함께 처리합니다.',
  },
  {
    title: '운영 문제 대응',
    commands: [
      'make rollback SERVICE=web ENV=production SHA=<sha> DIST=<id>',
      './scripts/invalidate.sh <distribution_id>',
      'ARTIFACT_BUCKET=<bucket> GH_REPO=<owner/repo> DRY_RUN=true ./scripts/cleanup-preview.sh sweep',
    ],
    note: '장애 대응은 검증된 SHA로 되돌리고, cleanup은 dry-run 리포트를 먼저 확인하는 순서로 진행합니다.',
  },
]

export const scriptPrinciples = [
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
  {
    title: '캐시 무효화는 작은 범위로 끝낸다',
    detail:
      '`invalidate.sh`는 기본적으로 entry/config만 지웁니다. 해시 asset 전체를 지우지 않아 비용과 전파 시간을 줄입니다.',
  },
]

export const principles = [
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
]

export const glossary = [
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
]

export const usageCommands = [
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
]

export const walkthrough = [
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
]
