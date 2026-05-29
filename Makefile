# 다중 개발 서버 — 단일 진입점.
#   make            도움말
#   make bootstrap  원커맨드 구축 (preflight → terraform apply → GitHub 설정)
SHELL := /usr/bin/env bash
SERVICE ?= web
ENV ?= preview
APP_DIR := apps/$(SERVICE)
TF_DIR := infra/terraform

.DEFAULT_GOAL := help
.PHONY: help preflight bootstrap tf-init tf-plan tf-apply tf-output tf-backend gh-setup \
        new-service app-install app-dev app-build app-test verify e2e-local rollback destroy

help: ## 명령 목록
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | sed -E 's/:[^#]*## /  →  /'

preflight: ## 사전 조건(도구/인증/tfvars) 점검
	@./scripts/preflight.sh

bootstrap: ## 원커맨드 구축: preflight → terraform apply → GitHub 변수/환경
	@./scripts/bootstrap.sh

tf-init: ## terraform init
	terraform -chdir=$(TF_DIR) init

tf-plan: ## terraform plan (생성될 리소스 검토)
	terraform -chdir=$(TF_DIR) plan

tf-apply: ## terraform apply
	terraform -chdir=$(TF_DIR) apply

tf-output: ## terraform output (GitHub 변수 값)
	terraform -chdir=$(TF_DIR) output

tf-backend: ## (팀/운영) 원격 state S3+DynamoDB 생성 + backend.hcl 작성
	@./scripts/tf-backend.sh

gh-setup: ## terraform output → GitHub variables + environments (PROD_REVIEWER=<login> 선택)
	@./scripts/gh-setup.sh

new-service: ## 새 프론트엔드 서비스 스캐폴드 — NAME=<service-name>
	@./scripts/new-service.sh $(NAME)

app-install: ## 앱 의존성 설치
	cd $(APP_DIR) && corepack pnpm install

app-dev: ## 로컬 미리보기 — SERVICE=web ENV=preview|staging|production
	@APP_DIR=$(APP_DIR) ./scripts/dev.sh $(ENV)

app-build: ## 앱 빌드 (static export → out/)
	cd $(APP_DIR) && corepack pnpm build

app-test: ## lint + typecheck + unit test (단일 서비스 SERVICE=web)
	cd $(APP_DIR) && corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test

verify: ## 로컬 전체 검증 — 모든 apps/* + shellcheck + terraform validate (CI와 동일, AWS 불필요)
	@./scripts/verify.sh

e2e-local: ## AWS 없이 로컬 E2E (build+serve+smoke) — SERVICE=web ENV=preview|staging|production
	@APP_DIR=$(APP_DIR) ./scripts/e2e-local.sh $(ENV)

rollback: ## 롤백 — SERVICE=web ENV=production SHA=<sha> DIST=<distribution_id>
	ARTIFACT_BUCKET=$$(terraform -chdir=$(TF_DIR) output -raw artifact_bucket) SERVICE_NAME=$(SERVICE) \
	  ./scripts/rollback.sh $(ENV) $(SHA) $(DIST)

destroy: ## 인프라 제거 (주의: 모든 환경 삭제)
	terraform -chdir=$(TF_DIR) destroy
