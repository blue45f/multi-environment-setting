#!/usr/bin/env bash
# 로컬에서 선택한 환경의 runtime config로 앱을 띄운다 (멀티환경 빠른 미리보기).
#   ./scripts/dev.sh preview     # 기본
#   ./scripts/dev.sh staging
#   ./scripts/dev.sh production
# public/env.<env>.json 을 public/env.json 으로 복사한다(gitignore됨).
set -euo pipefail

ENVNAME="${1:-preview}"
APP_DIR="${APP_DIR:-apps/web}" # Makefile이 SERVICE에 맞춰 전달 (예: apps/admin)
SRC="${APP_DIR}/public/env.${ENVNAME}.json"

if [ ! -f "$SRC" ]; then
  echo "환경 파일 없음: $SRC (preview|staging|production 중 하나)" >&2
  exit 1
fi

cp "$SRC" "${APP_DIR}/public/env.json"
echo "==> env.json = env.${ENVNAME}.json"
cd "$APP_DIR"
corepack pnpm install
echo "==> http://localhost:3000 (Ctrl+C 종료)"
corepack pnpm dev
