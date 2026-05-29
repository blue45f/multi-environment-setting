#!/usr/bin/env bash
# terraform output → GitHub repository variables + environments 자동 설정.
# SETUP.md §3을 한 번에 수행한다.
#
# env(선택):
#   TF_DIR        terraform 디렉터리 (기본 infra/terraform)
#   GH_REPO       owner/repo (기본: 현재 git remote에서 추론)
#   PROD_REVIEWER production 필수 리뷰어 GitHub 로그인 (없으면 미설정)
set -euo pipefail

TF_DIR="${TF_DIR:-infra/terraform}"
REPO="${GH_REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}"
REVIEWER="${PROD_REVIEWER:-}"

tf_raw() { terraform -chdir="$TF_DIR" output -raw "$1"; }
tf_json() { terraform -chdir="$TF_DIR" output -json "$1"; }
setvar() { printf '  %-15s\n' "$1"; gh variable set "$1" --repo "$REPO" --body "$2"; }

# 멀티 서비스: 공유 값 2개 + SERVICES(JSON 배열) + DEPLOY_CONFIG(service→설정 JSON 맵).
# 워크플로가 매트릭스로 SERVICES를 돌고, 서비스별 역할/배포 ID/도메인을 DEPLOY_CONFIG에서 읽는다.
echo "==> repository variables ($REPO)"
setvar AWS_REGION     "$(tf_raw aws_region)"
setvar ARTIFACT_BUCKET "$(tf_raw artifact_bucket)"
setvar SERVICES       "$(tf_json services)"
setvar DEPLOY_CONFIG  "$(tf_json deploy_config)"

echo "==> environments"
for env in preview staging production; do
  gh api -X PUT "repos/${REPO}/environments/${env}" >/dev/null
  printf '  %s\n' "$env"
done

echo "==> production: main 브랜치 제한 + 리뷰어"
RID=""
if [ -n "$REVIEWER" ]; then
  RID="$(gh api "users/${REVIEWER}" --jq .id)"
fi
if [ -n "$RID" ]; then
  body=$(printf '{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true},"reviewers":[{"type":"User","id":%s}]}' "$RID")
else
  body='{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}'
fi
printf '%s' "$body" | gh api -X PUT "repos/${REPO}/environments/production" --input - >/dev/null
gh api -X POST "repos/${REPO}/environments/production/deployment-branch-policies" \
  -f name=main >/dev/null 2>&1 || true
if [ -n "$RID" ]; then
  printf '  reviewer: %s (id=%s)\n' "$REVIEWER" "$RID"
else
  printf '  reviewer: 미설정 — PROD_REVIEWER=<github-login>로 재실행하거나 UI에서 추가\n'
fi

echo
printf '\033[32m✓ GitHub 설정 완료\033[0m (%s)\n' "$REPO"
