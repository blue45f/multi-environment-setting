# multi-environment-setting

[27. 다중 개발 서버 구축 가이드](https://github.com/blue45f/heejun/blob/main/public/%EA%B0%9C%EB%B0%9C%EA%B0%80%EC%9D%B4%EB%93%9C/27_%EB%8B%A4%EC%A4%91_%EA%B0%9C%EB%B0%9C_%EC%84%9C%EB%B2%84_%EA%B5%AC%EC%B6%95_%EA%B0%80%EC%9D%B4%EB%93%9C.md)를 **AWS에서 실제로 빌드 가능한 레퍼런스 구현**으로 옮긴 저장소입니다.

가이드는 "무엇을/왜"를 다루고, 이 저장소는 "그래서 어떤 파일을 어떻게 두면 되는가"를 채웁니다. 모든 값은 예시 플레이스홀더이며, [§2 채워야 하는 값](#2-채워야-하는-값placeholder)만 본인 계정 값으로 바꾸면 됩니다.

> **이 문서가 단일 진실 공급원(Source of Truth)입니다.** 서비스 이름, 리전, 환경 이름, 변수 이름, S3 prefix 규칙은 여기서 정의하고 모든 워크플로/IaC/스크립트가 이를 따릅니다.

---

## 0. 30초 요약

- **주 패턴**: GitHub Actions가 빌드·검증하고(`build once`), 산출물을 S3에 올린 뒤 CloudFront로 서빙합니다 (가이드 Pattern C).
- **PR preview**: PR마다 `https://pr-<번호>.preview.example.com` URL이 자동 생성됩니다. 멀티테넌트 라우팅은 단일 CloudFront 배포 + CloudFront Function이 처리합니다.
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
│   │   │   └── preview-router.js # CloudFront Function: host → S3 prefix
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
│   ├── dev.sh                    # 로컬 멀티환경 미리보기 (env 선택)
│   ├── deploy-s3.sh              # cache-control 분리 S3 업로드
│   ├── invalidate.sh             # CloudFront invalidation (entry/config만)
│   ├── promote.sh                # releases/<sha> → current 포인터 전환
│   ├── rollback.sh               # 이전 release로 current 복구 + invalidation
│   └── cleanup-preview.sh        # 안전 가드가 있는 preview prefix 삭제
└── apps/web/                     # 예제 Next.js static-export 앱
    ├── package.json
    ├── next.config.ts
    ├── amplify.yml               # Pattern B(Amplify) 빌드 스펙
    ├── env.schema.ts             # 런타임 config 스키마 검증 (zod)
    ├── src/lib/runtime-config.ts # /env.json 런타임 로더
    ├── public/
    │   ├── env.preview.json
    │   ├── env.staging.json
    │   └── env.production.json
    └── tests/smoke/preview.spec.ts
```

---

## 2. 채워야 하는 값(placeholder)

전부 예시 값입니다. 본인 환경에 맞게 바꾸세요. **이름 규칙은 바꾸지 않는 것을 권장**합니다(워크플로/IaC가 이 규칙에 의존).

| 플레이스홀더 | 예시 값 | 의미 | 바꾸는 위치 |
| :--- | :--- | :--- | :--- |
| `SERVICE_NAME` | `web` | 서비스/앱 이름 | `infra/terraform/variables.tf`, 워크플로 `env` |
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

- **preview**: CloudFront Function(`preview-router.js`)이 `pr-123.preview.example.com` → `/web/pr-123/`로 URI를 재작성. 배포 = `aws s3 sync out s3://.../web/pr-123/`.
- **staging/production**: CloudFront origin path가 `/web/<env>/current`로 **고정**. 배포 = `releases/<sha>/`에 올린 뒤 `current/`로 동기화(`promote.sh`). 롤백 = 이전 `releases/<sha>/`를 `current/`로 되돌림(`rollback.sh`).

---

## 5. GitHub 설정 (repo variables / secrets / environments)

OIDC를 쓰므로 **장기 AWS 키 secret은 없습니다.** 아래는 모두 *variables*(민감하지 않음)로 둡니다. Terraform `outputs`가 실제 값을 출력합니다.

### Repository variables (`Settings → Secrets and variables → Actions → Variables`)

| 변수 | 예시 | 출처 |
| :--- | :--- | :--- |
| `AWS_REGION` | `ap-northeast-2` | 직접 설정 |
| `ARTIFACT_BUCKET` | `web-frontend-artifacts-123456789012-ap-northeast-2` | `terraform output artifact_bucket` |
| `AWS_PREVIEW_ROLE_ARN` | `arn:aws:iam::123456789012:role/web-gha-preview` | `terraform output preview_role_arn` |
| `AWS_STAGING_ROLE_ARN` | `arn:aws:iam::123456789012:role/web-gha-staging` | `terraform output staging_role_arn` |
| `AWS_PRODUCTION_ROLE_ARN` | `arn:aws:iam::123456789012:role/web-gha-production` | `terraform output production_role_arn` |
| `AWS_CLEANUP_ROLE_ARN` | `arn:aws:iam::123456789012:role/web-gha-cleanup` | `terraform output cleanup_role_arn` |
| `PREVIEW_DISTRIBUTION_ID` | `E1AAAAAAAAAAAA` | `terraform output preview_distribution_id` |
| `STAGING_DISTRIBUTION_ID` | `E2BBBBBBBBBBBB` | `terraform output staging_distribution_id` |
| `PRODUCTION_DISTRIBUTION_ID` | `E3CCCCCCCCCCCC` | `terraform output production_distribution_id` |
| `PREVIEW_BASE_DOMAIN` | `preview.example.com` | 직접 설정 (custom 도메인 시) |
| `PREVIEW_CLOUDFRONT_DOMAIN` | `d111.cloudfront.net` | (선택) 도메인 없이 테스트 시 path 기반 preview URL용 |
| `STAGING_DOMAIN` | `staging.example.com` | (선택) staging smoke용 — 비우면 smoke skip |
| `PRODUCTION_DOMAIN` | `www.example.com` | (선택) production smoke용 — 비우면 smoke skip |
| `AMPLIFY_APP_ID` | (비워둠) | Pattern B를 쓸 때만 |

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
