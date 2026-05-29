#!/usr/bin/env bash
# 원커맨드 구축: 사전점검 → terraform apply → GitHub 변수/환경 설정.
# AWS 리소스를 실제로 생성하므로 terraform apply에서 한 번 확인(yes)을 받는다.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
TF_DIR="${TF_DIR:-infra/terraform}"

echo "════════ 1/3 preflight ════════"
./scripts/preflight.sh

echo "════════ 2/3 terraform apply ════════"
terraform -chdir="$TF_DIR" init -input=false
terraform -chdir="$TF_DIR" apply   # 계획 검토 후 yes 입력

echo "════════ 3/3 GitHub 설정 ════════"
./scripts/gh-setup.sh

cat <<'NEXT'

✓ 부트스트랩 완료.

다음 단계:
  - production 리뷰어가 미설정이면: PROD_REVIEWER=<github-login> ./scripts/gh-setup.sh
  - 커스텀 도메인을 쓰려면 terraform.tfvars에서 enable_custom_domain=true 후 make tf-apply
  - PR을 열면 preview가 자동 배포되고 PR에 URL이 코멘트됩니다.
  - main에 merge하면 staging 배포 → production 승인 대기.
NEXT
