#!/usr/bin/env bash
# 이전 릴리스로 롤백한다. (가이드 §11.3 — S3/CloudFront direct)
#   current 포인터를 지정한 releases/<sha>로 되돌리고 entry/config를 invalidate한다.
#
# 필요한 env: ARTIFACT_BUCKET (필수), SERVICE_NAME (기본 web)
# usage: rollback.sh <staging|production> <release_sha> [distribution_id]
#   ARTIFACT_BUCKET=my-bucket rollback.sh production 9f1a2b3 E3CCCCCCCCCCCC
set -euo pipefail

ENVIRONMENT="${1:?usage: rollback.sh <staging|production> <release_sha> [distribution_id]}"
SHA="${2:?usage: rollback.sh <staging|production> <release_sha> [distribution_id]}"
DIST="${3:-}"

: "${ARTIFACT_BUCKET:?set ARTIFACT_BUCKET}"
SERVICE_NAME="${SERVICE_NAME:-web}"

case "$ENVIRONMENT" in
  staging | production) ;;
  *) echo "environment must be staging|production" >&2; exit 1 ;;
esac

BASE="s3://${ARTIFACT_BUCKET}/${SERVICE_NAME}/${ENVIRONMENT}"

if ! aws s3 ls "${BASE}/releases/${SHA}/" >/dev/null 2>&1; then
  echo "release not found: ${BASE}/releases/${SHA}/" >&2
  echo "available releases:" >&2
  aws s3 ls "${BASE}/releases/" >&2 || true
  exit 1
fi

echo "==> rollback ${ENVIRONMENT} -> ${SHA}"
aws s3 sync "${BASE}/releases/${SHA}/" "${BASE}/current/" --delete

if [ -n "$DIST" ]; then
  aws cloudfront create-invalidation \
    --distribution-id "$DIST" \
    --paths "/index.html" "/env.json" "/deployment.json" \
    --query 'Invalidation.{Id:Id,Status:Status}' --output table
else
  echo "NOTE: distribution_id 미지정 — CloudFront invalidation을 수동으로 실행하세요." >&2
fi

echo "==> rolled back ${ENVIRONMENT} to ${SHA}. release note에 revision/checksum/사유를 남기세요."
