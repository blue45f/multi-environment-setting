#!/usr/bin/env bash
# CloudFront invalidation. (가이드 §7.3)
#   - path는 leading slash가 필요하다.
#   - 기본은 entry/config만. 전체("/*")는 비용/전파시간 때문에 사유가 있을 때만.
#
# usage: invalidate.sh <distribution_id> [path ...]
#   invalidate.sh E123ABC /index.html /env.json
#   invalidate.sh E123ABC "/web/pr-123/*"      # preview: 재작성된 origin-style 경로
set -euo pipefail

DIST="${1:?usage: invalidate.sh <distribution_id> [path ...]}"
shift || true

if [ "$#" -eq 0 ]; then
  set -- "/index.html" "/env.json" "/deployment.json"
fi

echo "==> invalidate $DIST: $*"
aws cloudfront create-invalidation \
  --distribution-id "$DIST" \
  --paths "$@" \
  --query 'Invalidation.{Id:Id,Status:Status}' \
  --output table
