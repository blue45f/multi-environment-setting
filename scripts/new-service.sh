#!/usr/bin/env bash
# 새 프론트엔드 서비스(앱)를 apps/web 템플릿에서 스캐폴드한다.
#   ./scripts/new-service.sh admin
# 생성 후 terraform.tfvars의 services에 이름을 추가하고 make tf-apply && make gh-setup 하면
# 그 서비스의 배포 3종 + 역할 + GitHub 설정이 자동 생성되고, 워크플로 매트릭스가 자동으로 포함한다.
set -euo pipefail

NAME="${1:?usage: new-service.sh <service-name> (소문자/숫자/하이픈)}"
if ! [[ "$NAME" =~ ^[a-z]([a-z0-9-]*[a-z0-9])?$ ]]; then
  echo "서비스명은 소문자로 시작하고 [a-z0-9-]만 허용하며 하이픈으로 끝날 수 없습니다: '$NAME'" >&2
  exit 1
fi

SRC="apps/web"
DEST="apps/${NAME}"
[ -d "$SRC" ] || { echo "원본 없음: $SRC" >&2; exit 1; }
[ -e "$DEST" ] && { echo "이미 존재: $DEST" >&2; exit 1; }

echo "==> ${SRC} → ${DEST} (빌드/의존성 산출물 제외)"
mkdir -p "$DEST"
tar -C "$SRC" \
  --exclude=node_modules --exclude=.next --exclude=out \
  --exclude=test-results --exclude=playwright-report \
  --exclude='*.tsbuildinfo' --exclude='public/env.json' \
  -cf - . | tar -C "$DEST" -xf -

# package.json name → 서비스명
DEST="$DEST" NAME="$NAME" node -e '
  const fs = require("fs");
  const p = process.env.DEST + "/package.json";
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  j.name = process.env.NAME;
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
'

echo "✓ 생성됨: ${DEST}"
cat <<NEXT

다음 단계:
  1) infra/terraform/terraform.tfvars 의 services 에 추가:
       services = ["web", "${NAME}"]
  2) make tf-apply && make gh-setup
     → ${NAME}의 preview/staging/production 배포 + OIDC 역할 + GitHub 설정 자동 생성
  3) PR을 열면 워크플로 매트릭스가 ${NAME}도 자동으로 빌드·배포합니다.
  4) 로컬 확인:  cd ${DEST} && corepack pnpm install && corepack pnpm build
NEXT
