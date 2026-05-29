# 다중 개발 서버 — 단일 진입점.
#   make            도움말
#   make bootstrap  원커맨드 구축 (preflight → terraform apply → GitHub 설정)
SHELL := /usr/bin/env bash
APP_DIR := apps/web
TF_DIR := infra/terraform
ENV ?= preview

.DEFAULT_GOAL := help
.PHONY: help preflight bootstrap tf-init tf-plan tf-apply tf-output gh-setup \
        app-install app-dev app-build app-test app-smoke rollback destroy

help: ## 명령 목록
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | sed -E 's/:[^#]*## /  →  /'

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

gh-setup: ## terraform output → GitHub variables + environments (PROD_REVIEWER=<login> 선택)
	@./scripts/gh-setup.sh

app-install: ## 앱 의존성 설치
	cd $(APP_DIR) && corepack pnpm install

app-dev: ## 로컬 미리보기 — ENV=preview|staging|production
	@./scripts/dev.sh $(ENV)

app-build: ## 앱 빌드 (static export → out/)
	cd $(APP_DIR) && corepack pnpm build

app-test: ## lint + typecheck + unit test
	cd $(APP_DIR) && corepack pnpm lint && corepack pnpm typecheck && corepack pnpm test

rollback: ## 롤백 — ENV=production SHA=<sha> DIST=<distribution_id>
	ARTIFACT_BUCKET=$$(terraform -chdir=$(TF_DIR) output -raw artifact_bucket) \
	  ./scripts/rollback.sh $(ENV) $(SHA) $(DIST)

destroy: ## 인프라 제거 (주의: 모든 환경 삭제)
	terraform -chdir=$(TF_DIR) destroy
