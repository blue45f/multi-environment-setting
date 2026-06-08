# multi-environment-setting

[27. 다중 개발 서버 구축 가이드](https://github.com/blue45f/heejun/blob/main/public/%EA%B0%9C%EB%B0%9C%EA%B0%80%EC%9D%B4%EB%93%9C/27_%EB%8B%A4%EC%A4%91_%EA%B0%9C%EB%B0%9C_%EC%84%9C%EB%B2%84_%EA%B5%AC%EC%B6%95_%EA%B0%80%EC%9D%B4%EB%93%9C.md)를 **AWS에서 실제로 빌드 가능한 레퍼런스 구현**으로 옮긴 저장소입니다.

가이드는 "무엇을/왜"를 다루고, 이 저장소는 "그래서 어떤 파일을 어떻게 두면 되는가"를 채웁니다. 모든 값은 예시 플레이스홀더이며, [§2 채워야 하는 값](#2-채워야-하는-값placeholder)만 본인 계정 값으로 바꾸면 됩니다.

> **이 문서가 단일 진실 공급원(Source of Truth)입니다.** 서비스 이름, 리전, 환경 이름, 변수 이름, S3 prefix 규칙은 여기서 정의하고 모든 워크플로/IaC/스크립트가 이를 따릅니다.

---

## 0. 30초 요약

- **주 패턴**: GitHub Actions가 빌드·검증하고(`build once`), 산출물을 S3에 올린 뒤 CloudFront로 서빙합니다 (가이드 Pattern C).
- **PR preview**: custom 도메인을 켜면 PR마다 `https://pr-<번호>.preview.example.com` URL이 자동 생성됩니다. 도메인 없이 시작하면 CloudFront 기본 도메인의 `/pr-<번호>/` path preview를 사용합니다. 멀티테넌트 라우팅은 단일 CloudFront 배포 + CloudFront Function이 처리합니다.
- **승격**: 검증된 동일 artifact를 staging → production으로 승격합니다. 환경별 재빌드 없음.
- **권한**: 장기 AWS 키 없이 GitHub OIDC로 단기 자격증명을 받습니다. preview/staging/production/cleanup 역할이 분리됩니다.
- **정리**: PR close + 매일 schedule cleanup으로 orphan 리소스를 막습니다.
- **대안**: SSR이 필요하거나 Amplify를 쓰고 싶으면 `apps/web/amplify.yml` + `aws amplify start-deployment` 경로(Pattern B)를 그대로 활성화할 수 있습니다.

---

## 1. 파일 레이아웃

```text
multi-environment-setting/
├── README.md                     # ← 단일 진실 공급원 (이 문서)
├── Makefile                      # 단일 진입점 (make / make bootstrap)
├── .nvmrc                        # Node 버전 핀 (CI/로컬 공통)
├── .gitignore
├── docs/
│   ├── ENVIRONMENTS.md           # 환경 매트릭스 상세 (URL/데이터/권한/수명)
│   ├── SETUP.md                  # AWS 0→1 구축 순서 (Terraform + GitHub 설정)
│   └── runbooks/
│       └── frontend-preview.md   # 장애 대응 / rollback runbook
├── infra/
│   ├── terraform/                # 주 IaC — OIDC, S3, CloudFront, Route53, ACM
│   │   ├── versions.tf
│   │   ├── variables.tf
│   │   ├── main.tf
│   │   ├── github-oidc.tf
│   │   ├── s3.tf
│   │   ├── cloudfront.tf
│   │   ├── route53.tf
│   │   ├── outputs.tf
│   │   ├── functions/
│   │   │   └── preview-router.js.tftpl # CloudFront Function 템플릿(서비스별 주입)
│   │   ├── terraform.tfvars.example
│   │   └── README.md
│   └── cloudformation/
│       └── frontend.yaml         # Terraform 핵심 스택의 CloudFormation 동등본
├── .github/
│   └── workflows/
│       ├── preview.yml           # PR preview 배포 (S3 sync + invalidation + comment)
│       ├── deploy.yml            # staging/production 승격 (build once, deploy many)
│       ├── cleanup-preview.yml   # PR close + schedule cleanup (dry-run 포함)
│       └── validate.yml          # 저장소 자기검증 (terraform/shell/actions/app · AWS 불필요)
├── scripts/
│   ├── preflight.sh              # 사전 조건(도구/인증/tfvars) 점검
│   ├── bootstrap.sh              # 원커맨드 구축 (preflight → apply → gh-setup)
│   ├── gh-setup.sh               # terraform output → GitHub 변수/환경 자동 설정
│   ├── tf-backend.sh             # (선택) 원격 state S3+DynamoDB 생성
│   ├── new-service.sh            # 새 프론트엔드 서비스(apps/<name>) 스캐폴드
│   ├── dev.sh                    # 로컬 멀티환경 미리보기 (env 선택)
│   ├── e2e-local.sh              # AWS 없이 로컬 E2E (build+serve+smoke)
│   ├── verify.sh                 # 로컬 전체 검증 (모든 apps/* + shellcheck + tf validate)
│   ├── deploy-s3.sh              # cache-control 분리 S3 업로드
│   ├── invalidate.sh             # CloudFront invalidation (entry/config만)
│   ├── promote.sh                # releases/<sha> → current 포인터 전환
│   ├── rollback.sh               # 이전 release로 current 복구 + invalidation
│   └── cleanup-preview.sh        # 안전 가드가 있는 preview prefix 삭제
└── apps/web/                     # 예제 Next.js static-export 앱 (Next 16 · React 19 · React Compiler 활성화)
    ├── package.json
    ├── next.config.ts
    ├── amplify.yml               # Pattern B(Amplify) 빌드 스펙
    ├── env.schema.ts             # 런타임 config 스키마 검증 (zod)
    ├── src/lib/runtime-config.ts # 런타임 config 로더 (/env.json 또는 path preview의 /pr-<n>/env.json)
    ├── public/
    │   ├── env.preview.json
    │   ├── env.staging.json
    │   └── env.production.json
    └── tests/smoke/
        ├── preview.spec.ts        # 배포된 URL 로드 + 환경(stage) 표시 smoke
        └── web-vitals.spec.ts     # Core Web Vitals 성능 예산 가드 (LCP/CLS/TTFB/load)
```

---

## 2. 채워야 하는 값(placeholder)

전부 예시 값입니다. 본인 환경에 맞게 바꾸세요. **이름 규칙은 바꾸지 않는 것을 권장**합니다(워크플로/IaC가 이 규칙에 의존).

| 플레이스홀더 | 예시 값 | 의미 | 바꾸는 위치 |
| :--- | :--- | :--- | :--- |
| `service_name` | `web` | 프로젝트 이름(공유 버킷 prefix) | `terraform.tfvars` |
| `services` | `["web"]` | 운영할 프론트엔드 앱 목록(멀티 서비스). 각 이름은 `^[a-z]([a-z0-9-]*[a-z0-9])?$` 규칙을 따르고 중복될 수 없음 | `terraform.tfvars` — 앱 생성은 `make new-service NAME=<name>` |
| AWS account id | `123456789012` | AWS 계정 ID | Terraform가 자동 조회 (`aws_caller_identity`) |
| AWS region | `ap-northeast-2` | 배포 리전(서울) | `variables.tf`, GitHub `vars.AWS_REGION` |
| `OWNER/REPO` | `blue45f/heejun` | GitHub 저장소 | `variables.tf`(OIDC sub) |
| apex 도메인 | `example.com` | 루트 도메인 | `variables.tf` |
| preview 도메인 | `*.preview.example.com` | PR preview 와일드카드 | Route53/ACM |
| staging 도메인 | `staging.example.com` | staging | Route53/ACM |
| production 도메인 | `www.example.com` | production | Route53/ACM |

> 계정 ID·도메인·role ARN은 **PR 본문이나 커밋에 그대로 노출하지 마세요**. 가이드 §15 원칙. 실제 값은 `terraform.tfvars`(gitignore됨)와 GitHub repo variables/secrets로 관리합니다.

---

## 3. 환경 매트릭스 (요약)

상세는 [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md).

| 환경 | 트리거 | URL | 데이터 | 권한(OIDC role) | 수명 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| local | 개발자 실행 | `localhost:3000` | MSW/fixture | 개인 | 수동 |
| **preview** | `pull_request` | `pr-<n>.preview.example.com` | mock / sandbox / read-only | `web-gha-preview` | PR close까지 |
| branch dev | `feature/**` push | `<branch>.dev.example.com` | dev API / sandbox | (preview role 재사용) | branch delete까지 |
| integration | `develop` merge | `integration.example.com` | 통합 테스트 DB | (staging role) | 상시 |
| **staging** | release candidate | `staging.example.com` | production 유사(마스킹) | `web-gha-staging` | 상시 |
| **production** | release approval | `www.example.com` | production | `web-gha-production` | 상시 |

> **격리 원칙**: production secret과 production 쓰기 권한은 staging 이하로 절대 흘려보내지 않습니다. preview/branch는 mock 또는 sandbox만 사용합니다.

---

## 4. S3 prefix 규칙 (단일 진실 공급원)

모든 워크플로/스크립트/IAM 정책이 이 레이아웃을 전제로 합니다.

```text
s3://<ARTIFACT_BUCKET>/
  web/
    pr-123/                       # preview: PR 번호별, CloudFront Function이 host로 라우팅
      index.html                  #   Cache-Control: no-cache
      _next/static/...            #   Cache-Control: immutable
      env.json                    #   no-cache (= env.preview.json 복사본)
      deployment.json             #   no-cache (revision/checksum 메타)
    staging/
      releases/
        9f1a2b3/...               # 불변(immutable) 릴리스, sha별
      current/...                 # staging 배포가 가리키는 포인터(= 최신 release 복사본)
    production/
      releases/
        9f1a2b3/...
      current/...                 # production CloudFront origin path = /web/production/current
```

- **멀티 서비스**: 위 `web`는 `var.services`의 한 서비스 예시입니다. 서비스마다 같은 레이아웃(`<service>/...`)과 배포 3종·역할·함수를 갖습니다. 앱 추가는 `make new-service NAME=<name>`.
- **preview**: 서비스별 CloudFront Function(`preview-router.js.tftpl`, 서비스명이 주입됨)이 `pr-123.preview.example.com`(또는 `<cf-domain>/pr-123/`) → `/<service>/pr-123/`로 URI를 재작성. CloudFront 기본 도메인 path preview에서는 Next의 root asset(`/_next/...`) 요청이 PR prefix를 잃을 수 있어, 같은 host의 `Referer` 첫 path segment가 `/pr-<n>/`일 때만 `pr-<n>`을 복원하고 문서 URL은 `/pr-<n>/...`로 정규화한다. 배포 = `aws s3 sync out s3://.../<service>/pr-123/`.
- **staging/production**: CloudFront origin path가 `/<service>/<env>/current`로 **고정**. 배포 = `releases/<sha>/`에 올린 뒤 `current/`로 동기화(`promote.sh`). 롤백 = 이전 `releases/<sha>/`를 `current/`로 되돌림(`rollback.sh`).

---

## 5. GitHub 설정 (repo variables / secrets / environments)

OIDC를 쓰므로 **장기 AWS 키 secret은 없습니다.** 아래 변수는 모두 **`make gh-setup`(= `scripts/gh-setup.sh`)이 `terraform output`에서 읽어 자동 설정**합니다. 손으로 넣을 필요가 없습니다.

### Repository variables (`Settings → Secrets and variables → Actions → Variables`)

| 변수 | 값 | 설정 |
| :--- | :--- | :--- |
| `AWS_REGION` | `ap-northeast-2` | `make gh-setup` 자동 |
| `ARTIFACT_BUCKET` | `web-frontend-artifacts-<account>-<region>` (모든 서비스 공유) | `make gh-setup` 자동 |
| `SERVICES` | `["web"]` (JSON 배열 — 워크플로 매트릭스) | `make gh-setup` 자동 |
| `DEPLOY_CONFIG` | `{"web":{preview_role_arn,…,*_distribution_id,*_cloudfront_domain,preview_url_template}}` (JSON 맵) | `make gh-setup` 자동 |
| `AMPLIFY_APP_ID` | (비워둠) | Pattern B 쓸 때만 직접 |

> 워크플로는 `SERVICES`를 매트릭스로 돌고, 서비스별 역할/배포 ID/도메인은 `fromJSON(vars.DEPLOY_CONFIG)[service]`에서 가져옵니다. `DEPLOY_CONFIG`가 비어 있으면(부트스트랩 전) 배포 워크플로는 자동 skip됩니다.

### Environments (`Settings → Environments`)

| environment | 보호 규칙 | 용도 |
| :--- | :--- | :--- |
| `preview` | 없음(빠른 반복) | PR preview 배포 + cleanup |
| `staging` | 선택: QA reviewer | release candidate 배포 |
| `production` | **필수 reviewer + 배포 브랜치 제한(`main`)** | production 배포 |

> OIDC trust policy가 `repo:OWNER/REPO:environment:<env>` claim으로 역할을 제한하므로, environment 이름과 trust 조건이 일치해야 합니다.

---

## 6. 빠른 시작 (5분, 원커맨드)

전제: `terraform`·`aws`·`gh`·`node`가 설치돼 있고 AWS/GitHub 로그인 완료. 상세는 [`docs/SETUP.md`](docs/SETUP.md).
도구 설치가 번거로우면 `.devcontainer`로 VS Code/Codespaces에서 즉시 시작할 수 있습니다(터미널에서 `aws configure`/`gh auth login`만 추가).

```bash
# 0) 값 1개 파일만 채운다
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
#   github_owner / github_repo 입력 (도메인 없이 시작하려면 enable_custom_domain=false 유지)

# 1) 원커맨드 구축: 사전점검 → terraform apply → GitHub 변수/환경 자동 설정
make bootstrap
#   (production 리뷰어까지 지정하려면)  PROD_REVIEWER=<github-login> make gh-setup

# 2) 끝. PR을 열면 preview가 자동 배포되고 PR에 URL이 코멘트됩니다.
```

수동/개별 단계가 필요하면:

```bash
make preflight        # 사전 조건 점검
make tf-plan          # 생성될 리소스 검토
make tf-apply         # 인프라 생성
make gh-setup         # terraform output → GitHub 변수/환경
make app-dev ENV=staging   # 로컬에서 환경별 미리보기
make help             # 전체 명령
```

### AWS 계정이 아직 없다면 (로컬에서 먼저 확인)

인프라 없이도 멀티환경 동작(빌드 → 정적 서빙 → 런타임 `env.json` 적용 → smoke)을 로컬에서 그대로 검증할 수 있습니다.

```bash
make app-dev   ENV=preview      # 개발 서버로 환경별 미리보기
make e2e-local ENV=staging      # build → out/ 정적 서빙 → Playwright smoke (AWS 불필요)
make verify                     # 모든 apps/* 검증 + (설치 시) shellcheck·terraform validate
```

로컬 서버를 열면 `/`는 현재 `env.json`이 어떤 환경값을 주입했는지 보여주는 데모 워크벤치로 동작합니다. `/intro`는 preview → staging → production 흐름, S3 prefix, CloudFront routing, runtime config 역할을 한 장의 소개 페이지로 설명합니다.

`make bootstrap`(실제 AWS 생성)은 계정이 준비되면 그때 실행하면 됩니다. CI의 `validate.yml`도 AWS 없이 통과합니다.

### 성능 회귀 가드 (Core Web Vitals smoke)

`tests/smoke/web-vitals.spec.ts`는 smoke 스위트(`playwright test tests/smoke`)에 포함되어 **배포된 실제 URL마다** Core Web Vitals를 측정하고 예산을 넘기면 배포를 실패시킵니다. 즉 `preview.yml`·`deploy.yml`(staging/production)·`make e2e-local`이 도는 모든 환경에서 자동으로 성능 회귀(번들 폭증·렌더 차단·레이아웃 점프)를 잡습니다. 추가 npm 의존성 없이 브라우저 네이티브 `PerformanceObserver`(LCP / layout-shift)와 Navigation Timing(TTFB / DOMContentLoaded / load)만 사용합니다.

- 측정값은 Playwright 리포트에 `web-vitals.json`으로 첨부되고 `[web-vitals] …` 로그로도 출력됩니다.
- 기본 예산은 Google "good" 임계의 약 2배(명백한 회귀에서만 실패 → CI 플레이키 회피)이며, 환경별로 워크플로 `env`에서 덮어쓸 수 있습니다.

| 환경변수 | 기본값 | 의미 |
| :--- | :--- | :--- |
| `PERF_BUDGET_LCP_MS` | `4000` | Largest Contentful Paint 상한(ms) |
| `PERF_BUDGET_CLS` | `0.25` | Cumulative Layout Shift 상한 |
| `PERF_BUDGET_TTFB_MS` | `3000` | Time To First Byte 상한(ms, CDN miss 여유 포함) |
| `PERF_BUDGET_LOAD_MS` | `8000` | 전체 `load` 이벤트 상한(ms) |

> production을 더 빡세게 잡고 싶으면 `deploy.yml`의 production smoke 스텝 `env:`에 `PERF_BUDGET_LCP_MS: 2500` 처럼 추가하면 됩니다. 측정 불가(null) 지표는 환경 차이로 흔들릴 수 있어 게이트를 막지 않습니다.

---

## 7. 패턴 선택 (가이드 §2 대응)

이 저장소는 **Pattern C(S3/CloudFront direct)**를 기본 구현으로 제공하고, **Pattern B(Amplify manual deploy)** 훅을 함께 둡니다.

```text
SSR / API Routes / Middleware 필요?
├─ 아니오(static export 가능) ─┬─ CI 강한 통제 + 캐시/권한 직접 제어 → Pattern C  ★ 이 저장소 기본
│                              └─ Amplify 관리형 유지              → Pattern B  (amplify.yml + start-deployment)
└─ 예 ─────────────────────────── Amplify Hosting compute 또는 runtime server(ECS/App Runner) → docs/SETUP.md 참고
```

`apps/web/next.config.ts`는 `output: 'export'`(static)로 설정되어 있습니다. SSR이 필요하면 이 옵션을 제거하고 Amplify Hosting compute 또는 runtime 배포로 전환하세요.

---

## 8. 안전 원칙 (가이드 baseline 대응)

- client bundle에 secret 금지 → `public/env.*.json`은 **public 값만**. secret은 SSM Parameter Store / GitHub environment secret.
- `index.html`/`env.json`은 `no-cache`, hash asset은 `immutable`. (`scripts/deploy-s3.sh`가 강제)
- CloudFront invalidation은 기본적으로 entry/config만. 전체(`/*`)는 사유 기록 후에만.
- cleanup 삭제는 `web/pr-<숫자>/` 패턴 가드를 통과해야 실행 (`scripts/cleanup-preview.sh`).
- production 배포는 GitHub `environment: production` reviewer 승인 후에만 role 획득.

---

## 관련 문서

- [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) — 환경 매트릭스 상세
- [docs/SETUP.md](docs/SETUP.md) — AWS 0→1 구축 순서
- [docs/runbooks/frontend-preview.md](docs/runbooks/frontend-preview.md) — 장애/rollback runbook
- [infra/terraform/README.md](infra/terraform/README.md) — Terraform 사용법

## 9. 최근 배포/개선 로그 (2026-06-08 기준)

최근 데모 목적의 소개 페이지를 다음 기준으로 고도화했습니다.

1) 소개 페이지 완전 리라이팅
- `/intro`를 초보자 onboarding 관점으로 재설계했습니다.
- 아키텍처 흐름을 단계별로 도식화(`1~5` 단계)해 코드 변경 → 정적 빌드 → runtime 설정 주입 → 환경별 라우팅 순서를 한 눈에 파악할 수 있게 구성했습니다.
- 환경 운영 원칙(`빌드 분리 없음`, `설정 분리`, `승격/rollback 경계`, `비용 관리`)을 원칙 카드로 정리했습니다.
- 용어사전(Artifact/Runtime config/Prefix/Protected environment/Lifecycle 등)을 추가해 초보자도 낯선 용어를 바로 이해할 수 있게 했습니다.
- 모바일/테블릿/데스크톱 반응형 규칙을 강화해 텍스트 가독성과 카드 레이아웃이 화면 폭에 맞게 바뀌도록 조정했습니다.

2) CSS 및 UX 정비
- `apps/web/src/app/globals.css`에 소개 페이지 전용 레이아웃과 반응형 블록을 추가했습니다.
- 애니메이션은 진입 페이드/업 방식으로 최소화해 과장되지 않게 정보 밀도는 유지하고 가독성을 우선시했습니다.
- 색/여백/타이포를 기존 디자인 토큰(`--app-*`) 위에 일관성 있게 정렬했습니다.

3) 샘플 배포 반영
- 빌드 결과를 최신으로 생성하고 S3 샘플 버킷에 sync했습니다.
  - 빌드: `pnpm --filter web build`
  - 동기화: `AWS_PROFILE=multi-env-free-sample aws s3 sync out s3://multi-env-free-sample-945203151945-ap-northeast-2/ --delete --cache-control 'no-cache, no-store, must-revalidate'`
- S3 샘플 확인 경로:
  - 데모 홈: `http://multi-env-free-sample-945203151945-ap-northeast-2.s3-website.ap-northeast-2.amazonaws.com/`
  - 소개 페이지: `http://multi-env-free-sample-945203151945-ap-northeast-2.s3-website.ap-northeast-2.amazonaws.com/intro/`
  - 런타임 설정: `http://multi-env-free-sample-945203151945-ap-northeast-2.s3-website.ap-northeast-2.amazonaws.com/env.json`

4) 운영 노트
- Vercel 무료 플랜에서는 배포 횟수 제한이 있어 재배포가 실패할 수 있어, 현재는 비용이 가장 낮은 S3 경로를 기준으로 샘플을 유지하고 있습니다.
- `/env.json` 404 이슈는 Vercel 재배포 없이도 라우팅 rewrite로 해결했으며, 장기적으로는 배포 파이프라인에서 env.json 동기화 단계를 보장하는 것을 권장합니다.
- 필요 시 `docs/`의 runbook 또는 운영 체크리스트에 `route rewrite`, `deploy lock`, `rollback` 항목을 추가하면 운영 관점 추적성이 더 좋아집니다.

이 기록은 향후 회고/리뷰/운영 인수인계를 위한 기준선으로 사용합니다.
