#!/usr/bin/env bash
# 구축 전 사전 조건(도구 설치 + 인증 + 컨텍스트)을 점검한다.
# 하나라도 미충족이면 비정상 종료해 bootstrap을 막는다.
set -uo pipefail

fail=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s — %s\n' "$1" "$2"; fail=$((fail + 1)); }
need() { # 이름  점검명령  해결안내
  if eval "$2" >/dev/null 2>&1; then ok "$1"; else bad "$1" "$3"; fi
}

echo "==> 도구"
need "terraform"        "command -v terraform" "https://developer.hashicorp.com/terraform/install"
need "aws cli"          "command -v aws"       "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
need "gh (GitHub CLI)"  "command -v gh"        "https://cli.github.com"
need "node"             "command -v node"      ".nvmrc=22 (nvm use)"
need "corepack/pnpm"    "command -v corepack || command -v pnpm" "corepack enable"

echo "==> 인증 / 컨텍스트"
need "AWS 자격증명"      "aws sts get-caller-identity" "aws configure 또는 SSO 로그인"
need "GitHub 로그인"     "gh auth status"              "gh auth login"
need "git 저장소"        "git rev-parse --is-inside-work-tree" "git init"
need "terraform.tfvars" "test -f infra/terraform/terraform.tfvars" \
  "cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars 후 값 입력"

echo
if [ "$fail" -gt 0 ]; then
  printf '\033[31m✗ %d개 항목 미충족\033[0m — 위 안내대로 해결 후 다시 실행하세요.\n' "$fail"
  exit 1
fi
printf '\033[32m✓ 모든 사전 조건 충족\033[0m\n'
