# multi-environment-setting — 개발 가이드

다중 환경(preview/staging/production) 정적 프론트엔드 배포의 **AWS 레퍼런스 구현**.
"무엇을/왜"는 [README.md](../README.md)(단일 진실 공급원), 환경·변수 정의는
[ENVIRONMENTS.md](./ENVIRONMENTS.md), 1회 셋업은 [SETUP.md](./SETUP.md)를 따릅니다.
포트폴리오 공통 컨벤션은 상위 워크스페이스 루트의 `DEVELOPMENT.md`·`CONTRIBUTING.md` 참고.

> **의도적 예외 (루트 표준과 다름):** 이 저장소는 **루트 `package.json`이 없습니다.** 검증/실행 진입점은
> `pnpm`이 아니라 **`make`**(→ `scripts/*.sh`)이고, CI 필수 체크도 집계 잡 `Validate`입니다. 인프라(Terraform)와
> 앱(Next)을 한 레포에서 다루기 때문이며, 이 차이는 포트폴리오 루트 `DEVELOPMENT.md` §8에 등재돼 있습니다.

## 스택

- **앱** (`apps/web`): Next.js 16(App Router) · React 19(**React Compiler 활성화** — `next.config.ts`의 최상위 `reactCompiler: true`) · TypeScript · Tailwind(design tokens) · Vitest
- **린트/포맷**: ESLint flat config(`apps/web/eslint.config.mjs`, `eslint-config-next` 확장) + Prettier(`apps/web/.prettierrc`)
- **인프라** (`infra/`): Terraform — CloudFront + S3 정적 호스팅(가이드 Pattern C, build-once), 멀티테넌트 라우팅은 CloudFront Function, 권한은 GitHub OIDC 단기 자격증명
- **패키지 매니저**: corepack 기반 pnpm(`apps/web`의 `packageManager` 필드), Node는 `.nvmrc`(22)

## 셋업 & 실행

```bash
corepack enable
make preflight                 # 도구/인증/tfvars 사전 점검
make app-install               # 앱 의존성 설치 (apps/* 전체)
make app-dev SERVICE=web ENV=preview   # 로컬 미리보기
```

전체 인프라 1회 구축(AWS 필요)은 `make bootstrap`(→ preflight → terraform apply → GitHub 변수/환경).
새 프론트엔드 서비스 스캐폴드는 `make new-service NAME=<service-name>`.

> 주요 `make` 타깃은 `make help`로 확인. 앱별 직접 실행은 `apps/web`에서 `pnpm dev`/`pnpm build`/`pnpm test`도 가능하지만,
> CI와 동일한 검증은 항상 `make verify`로 합니다.

## 검증 게이트

`make verify` 하나가 **로컬·CI 동일 게이트**입니다(AWS 불필요).

```bash
make verify    # 모든 apps/* (lint + typecheck + unit test + build) + shellcheck + terraform validate
make app-test SERVICE=web   # 단일 서비스만 (eslint . + tsc --noEmit + vitest run)
```

- CI: `.github/workflows/validate.yml`이 `make verify` 상당의 검증을 돌리고, 집계 잡 **`Validate`**가 PR 필수 체크.
- 배포: `deploy.yml`(env별 승격), `preview.yml`(PR마다 `pr-<번호>.preview.example.com`), `cleanup-preview.yml`(PR close + 매일 schedule).

## 컨벤션

- **커밋**: Conventional Commits(`feat`/`fix`/`refactor`/`chore`/`docs`/`ci`/`test`/`build`/`style`), 헤더 ≤ 100자.
  루트 package.json이 없어 husky/commitlint 로컬 훅은 두지 않습니다(의도적) — 컨벤션은 리뷰와 PR에서 지킵니다.
- **React Compiler**: 컴포넌트 자동 메모이즈 — 순수 메모이제이션용 `useMemo`/`useCallback`/`React.memo` 추가 금지,
  Rules of React 위반 금지. 배선은 `apps/web/next.config.ts`(`reactCompiler: true`) + `babel-plugin-react-compiler`.
- **단일 진실 공급원**: 서비스 이름·리전·환경 이름·변수 이름·S3 prefix 규칙은 [README.md](../README.md)에서 정의하고
  모든 워크플로/IaC/스크립트가 이를 따릅니다. 새 값은 README에 먼저 등재.
- **배포 영향 변경**: 디렉터리/이름/리전 변경 시 Terraform(`infra/`)·워크플로·스크립트 경로를 함께 갱신하고
  관련 런북(`docs/runbooks/`)을 확인.

## 디렉터리 핵심

```text
apps/web/           # Next 16 프론트엔드 (정적 export → out/)
infra/              # Terraform (CloudFront + S3 + OIDC roles, 멀티환경)
scripts/            # verify.sh 등 make가 호출하는 셸 스크립트
docs/               # ENVIRONMENTS · SETUP · DEVELOPMENT · runbooks/
.github/workflows/  # validate · deploy · preview · cleanup-preview
Makefile            # 모든 워크플로의 진입점 (make help)
```

## 트러블슈팅 · 운영

환경 승격/롤백/정리 등 운영 절차는 `docs/runbooks/`와 [ENVIRONMENTS.md](./ENVIRONMENTS.md) 참고.
롤백은 `make rollback SERVICE=web ENV=production SHA=<sha> DIST=<distribution_id>`.
