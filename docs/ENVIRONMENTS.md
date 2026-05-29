# 환경 매트릭스 (ENVIRONMENTS)

이 저장소의 모든 환경은 **같은 S3 버킷 + prefix 규칙 + 동일 artifact**를 공유합니다. 환경마다 다른 것은 *URL·데이터·권한·런타임 config(`env.json`)*뿐입니다. (가이드 §1.2 / §8)

> 단일 진실 공급원은 [README](../README.md)입니다. 여기서는 운영에 필요한 세부를 확장합니다.

---

## 1. 전체 매트릭스

| 환경 | 트리거 | URL | 데이터 | API target | 권한(OIDC role) | 접근 제어 | 수명 / cleanup |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **local** | 개발자 실행 | `localhost:3000` | MSW/fixture | mock | 개인 자격증명 | 로컬 | 수동 |
| **preview** | `pull_request` | `pr-<n>.preview.example.com` | mock/sandbox/read-only | sandbox 또는 dev(read-only) | `web-gha-preview` | basic auth/SSO/allowlist 권장 | PR close → 자동 삭제 |
| **branch dev** | `feature/**` push | `<branch>.dev.example.com` | dev/sandbox | dev API | preview role 재사용 | 팀 | branch delete → 정리 |
| **integration** | `develop` merge | `integration.example.com` | 통합 테스트 DB | integration API | staging role | 팀/QA | 상시 |
| **staging** | main push (release candidate) | `staging.example.com` | production 유사(민감정보 마스킹) | staging API | `web-gha-staging` | QA/운영 승인자 | 상시 |
| **production** | environment 승인 | `www.example.com` | production | production API | `web-gha-production` | public | 상시 |

URL은 `enable_custom_domain = true`일 때의 예시입니다. 도메인이 없으면 `https://<preview_cloudfront_domain>/pr-<n>/`처럼 CloudFront 기본 도메인 + path로 접근합니다.

---

## 2. 격리 원칙 (가장 중요)

- **production secret/쓰기 권한은 staging 이하로 절대 내려가지 않습니다.** OIDC trust가 `repo:OWNER/REPO:environment:<env>` claim으로 역할을 분리하므로, preview 워크플로는 production role을 얻을 수 없습니다(`infra/terraform/github-oidc.tf`).
- **preview/branch는 mock 또는 sandbox만** 사용합니다. 실제 사용자 데이터/production DB에 접근하지 않습니다.
- **권한 범위**:
  - `web-gha-preview` → `web/pr-*` 쓰기 + preview distribution invalidation (+선택 Amplify `pr-*` branch).
  - `web-gha-staging` → `web/staging/*` 쓰기 + staging invalidation.
  - `web-gha-production` → `web/production/*` 쓰기 + production invalidation. **environment reviewer 승인 후에만 AssumeRole.**
  - `web-gha-cleanup` → `web/pr-*` 삭제/목록 (+선택 Amplify `pr-*` 삭제). 쓰기 권한 없음.

---

## 3. S3 prefix & artifact 레이아웃

```text
s3://<ARTIFACT_BUCKET>/
  web/
    pr-123/                  # preview — CloudFront Function이 host로 라우팅, 통째로 교체
    staging/
      releases/<sha>/        # 불변 릴리스 (rollback 소스)
      current/               # staging CloudFront origin path = /web/staging/current
    production/
      releases/<sha>/
      current/               # production CloudFront origin path = /web/production/current
```

- preview는 PR마다 `web/pr-<n>/`에 통째로 sync (`scripts/deploy-s3.sh`).
- staging/production은 `releases/<sha>/`에 올린 뒤 `current/`로 승격(`scripts/promote.sh`). 롤백은 이전 `releases/<sha>/`를 `current/`로 되돌림(`scripts/rollback.sh`).

---

## 4. 런타임 config 매핑 (`env.json`)

| 환경 | 사용하는 파일 | 배포 시 동작 |
| :--- | :--- | :--- |
| preview | `apps/web/public/env.preview.json` | `out/env.json`으로 복사되어 서빙 |
| staging | `apps/web/public/env.staging.json` | 〃 |
| production | `apps/web/public/env.production.json` | 〃 |

- 키 구조는 `apps/web/env.schema.ts`(zod)가 검증합니다: `stage`, `apiBaseUrl`, `sentryEnvironment`, `featureFlagClientKey`.
- **public 값만** 둡니다. secret은 SSM Parameter Store / GitHub environment secret으로 분리합니다.
- `env.json`은 `no-cache`로 올라가므로(`deploy-s3.sh`) 같은 정적 번들을 환경마다 다른 config로 재사용할 수 있습니다(build-once, deploy-many).

---

## 5. Auth / Cookie / CORS (환경 분리 시 장애 지점) — 가이드 §8.3

| 항목 | 기준 |
| :--- | :--- |
| OAuth callback | preview는 동적 서브도메인이라 wildcard callback이 어려우면, preview auth는 mock 또는 staging auth로 제한 |
| Cookie domain | production cookie와 preview/staging cookie를 **분리**. preview에서 production 세션이 섞이지 않게 |
| CORS | preview 서브도메인 패턴만 허용. `*` + credential 조합 금지 |
| CSRF | preview도 production과 동일한 `SameSite`/`Secure` 정책 사용 |

---

## 6. 데이터 민감도

| 환경 | 데이터 | 마스킹 |
| :--- | :--- | :--- |
| preview / branch dev | mock·sandbox·합성 데이터 | 실데이터 없음 |
| integration | 통합 테스트용 시드 데이터 | 합성 |
| staging | production 유사 | **PII/민감정보 마스킹 필수** |
| production | 실제 사용자 데이터 | — |

---

## 7. 환경 추가하기 (예: `qa`)

새 환경을 붙이려면 아래를 **함께** 추가합니다.

1. `infra/terraform`에 distribution + (필요 시) OIDC role을 추가하고, OIDC trust의 `sub`에 `:environment:qa`를 넣습니다.
2. GitHub `Settings → Environments`에 `qa`를 만듭니다(이름이 trust claim과 일치해야 함).
3. `apps/web/public/env.qa.json`을 추가하고 `env.schema.ts`의 `stage` enum에 `'qa'`를 더합니다.
4. 워크플로(`deploy.yml`)에 `deploy-qa` job을 추가하고, 해당 role ARN/distribution ID 변수를 GitHub에 설정합니다.
5. (도메인 사용 시) Route53 레코드 + ACM SAN에 `qa.example.com`을 추가합니다.

---

## 참고

- 구축 순서/수정 위치: [SETUP.md](SETUP.md)
- 장애/롤백: [runbooks/frontend-preview.md](runbooks/frontend-preview.md)
