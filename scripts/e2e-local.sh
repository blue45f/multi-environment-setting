#!/usr/bin/env bash
# AWS 없이 로컬에서 전체 흐름을 검증한다: build → 정적 서빙(out/) → Playwright smoke.
# 배포 파이프라인이 하는 일(정적 산출물 + env.json 서빙)을 로컬에서 동일하게 재현한다.
#   ./scripts/e2e-local.sh [preview|staging|production]   (기본 preview)
set -euo pipefail

ENVNAME="${1:-preview}"
PORT="${PORT:-4173}"
APP_DIR="${APP_DIR:-apps/web}" # Makefile이 SERVICE에 맞춰 전달 (예: apps/admin)

cd "$APP_DIR"
SRC="public/env.${ENVNAME}.json"
[ -f "$SRC" ] || { echo "환경 파일 없음: ${APP_DIR}/${SRC}" >&2; exit 1; }

echo "==> build (static export)"
corepack pnpm install --frozen-lockfile
corepack pnpm build
cp "$SRC" out/env.json
echo "    env.json = env.${ENVNAME}.json"

echo "==> serve out/ on :${PORT}"
python3 -m http.server "$PORT" --directory out >/tmp/e2e-serve.log 2>&1 &
SRV=$!
cleanup() { kill "$SRV" 2>/dev/null || true; }  # 우리가 띄운 PID만 종료 (포트 무차별 kill 금지)
trap cleanup EXIT

for _ in $(seq 1 30); do
  curl -sf "http://localhost:${PORT}/" >/dev/null 2>&1 && break
  sleep 0.3
done

echo "==> playwright smoke (BASE_URL=http://localhost:${PORT})"
corepack pnpm exec playwright install chromium
BASE_URL="http://localhost:${PORT}" corepack pnpm exec playwright test tests/smoke --project=chromium

echo "✓ 로컬 E2E 통과 (env=${ENVNAME}) — AWS 없이 검증 완료"
