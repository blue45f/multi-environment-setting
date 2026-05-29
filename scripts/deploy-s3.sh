#!/usr/bin/env bash
# 정적 산출물을 S3에 업로드한다. cache-control을 파일 종류별로 분리한다. (가이드 §7.2)
#   - HTML            : no-cache (release entry가 자주 바뀜)
#   - env.json / deployment.json : no-cache (runtime config / 메타)
#   - env.<stage>.json 템플릿 : 업로드하지 않음 (preview/staging/production 값 분리)
#   - *.map           : 업로드하지 않음 (source map 노출 금지)
#   - 그 외(해시 자산): immutable, 1년 캐시
#
# usage: deploy-s3.sh <local_dir> <s3_uri>
#   deploy-s3.sh apps/web/out s3://my-bucket/web/pr-123
set -euo pipefail

SRC="${1:?usage: deploy-s3.sh <local_dir> <s3_uri>}"
DEST="${2:?usage: deploy-s3.sh <local_dir> <s3_uri>}"
DEST="${DEST%/}" # trailing slash 제거

if [ ! -d "$SRC" ]; then
  echo "source dir not found: $SRC" >&2
  exit 1
fi

echo "==> sync immutable assets: $SRC -> $DEST/"
# 해시가 박힌 자산만 길게 캐시한다. 해시가 없는 entry/RSC 페이로드/config는 제외하고 아래에서 no-cache로 올린다.
aws s3 sync "$SRC" "$DEST/" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "*.html" \
  --exclude "*.txt" \
  --exclude "env.json" \
  --exclude "env.*.json" \
  --exclude "deployment.json" \
  --exclude "*.map"

echo "==> upload HTML / RSC payloads(*.txt) as no-cache"
# Next App Router static export는 라우트별 RSC 페이로드를 *.txt로 내보낸다(해시 없음).
# index.html과 함께 항상 재검증해야 클라이언트 네비게이션에서 stale이 발생하지 않는다.
while IFS= read -r -d '' f; do
  rel="${f#"$SRC"/}"
  case "$f" in
    *.html) ctype="text/html; charset=utf-8" ;;
    *) ctype="text/plain; charset=utf-8" ;;
  esac
  aws s3 cp "$f" "$DEST/$rel" \
    --cache-control "no-cache,max-age=0" \
    --content-type "$ctype"
done < <(find "$SRC" -type f \( -name '*.html' -o -name '*.txt' \) -print0)

echo "==> upload runtime config / metadata as no-cache"
for special in env.json deployment.json; do
  if [ -f "$SRC/$special" ]; then
    aws s3 cp "$SRC/$special" "$DEST/$special" \
      --cache-control "no-cache,max-age=0" \
      --content-type "application/json"
  fi
done

echo "==> done: $DEST/"
