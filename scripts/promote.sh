#!/usr/bin/env bash
# 불변 릴리스를 current 포인터로 승격한다. (build once, deploy many)
#   S3 → S3 sync는 객체 메타데이터(cache-control, content-type)를 보존하므로
#   deploy-s3.sh가 releases/<sha>에 설정한 cache 정책이 current에도 그대로 유지된다.
#
# usage: promote.sh <s3_release_uri> <s3_current_uri>
#   promote.sh s3://bucket/web/staging/releases/9f1a2b3 s3://bucket/web/staging/current
set -euo pipefail

SRC="${1:?usage: promote.sh <s3_release_uri> <s3_current_uri>}"
DEST="${2:?usage: promote.sh <s3_release_uri> <s3_current_uri>}"

if ! aws s3 ls "${SRC%/}/" >/dev/null 2>&1; then
  echo "release not found: ${SRC%/}/" >&2
  exit 1
fi

echo "==> promote ${SRC%/}/ -> ${DEST%/}/"
aws s3 sync "${SRC%/}/" "${DEST%/}/" --delete
echo "==> promoted"
