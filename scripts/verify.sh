#!/usr/bin/env bash
# 로컬 전체 검증 — CI(validate.yml)와 같은 게이트를 AWS 없이 돌린다.
# apps/* 의 모든 서비스에 대해 install/lint/typecheck/test/build,
# 그리고 (설치돼 있으면) shellcheck·terraform validate를 수행한다.
set -uo pipefail

fail=0

for dir in apps/*/; do
  [ -f "${dir}package.json" ] || continue
  svc="$(basename "$dir")"
  echo "════ [$svc] install · lint · typecheck · test · build ════"
  (
    cd "$dir" &&
      corepack pnpm install --frozen-lockfile &&
      corepack pnpm lint &&
      corepack pnpm typecheck &&
      corepack pnpm test &&
      corepack pnpm build
  ) || { echo "✗ [$svc] 실패"; fail=1; }
done

echo "════ shellcheck (scripts) ════"
if command -v shellcheck >/dev/null 2>&1; then
  shellcheck scripts/*.sh || fail=1
else
  echo "shellcheck 미설치 — 건너뜀 (CI validate.yml에서 검사됨)"
fi

echo "════ terraform validate ════"
if command -v terraform >/dev/null 2>&1; then
  terraform -chdir=infra/terraform validate || fail=1
else
  echo "terraform 미설치 — 건너뜀 (CI validate.yml에서 검사됨)"
fi

echo
if [ "$fail" -eq 0 ]; then
  printf '\033[32m✓ 로컬 전체 검증 통과\033[0m\n'
else
  printf '\033[31m✗ 검증 실패 — 위 로그 확인\033[0m\n'
  exit 1
fi
