#!/usr/bin/env bash
# (팀/운영, 선택) 원격 Terraform state를 멱등적으로 준비한다.
#   - state용 S3 버킷(버전관리·암호화·public 차단) + DynamoDB 락 테이블 생성
#   - infra/terraform/backend.hcl 작성
# 기본 흐름(make bootstrap)은 로컬 state로도 동작하므로 이 단계는 선택이다.
#
# env(선택): AWS_REGION(기본 ap-northeast-2, tfvars의 aws_region과 일치시킬 것),
#            SERVICE_NAME(기본 web), TF_STATE_BUCKET, TF_LOCK_TABLE
set -euo pipefail

TF_DIR="${TF_DIR:-infra/terraform}"
REGION="${AWS_REGION:-ap-northeast-2}"
SERVICE="${SERVICE_NAME:-web}"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${TF_STATE_BUCKET:-${SERVICE}-tfstate-${ACCOUNT}-${REGION}}"
TABLE="${TF_LOCK_TABLE:-${SERVICE}-tflocks}"

echo "==> state 버킷: ${BUCKET} (region ${REGION})"
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "   이미 존재"
elif [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" >/dev/null
else
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
    --create-bucket-configuration "LocationConstraint=${REGION}" >/dev/null
fi
aws s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "==> 락 테이블: ${TABLE}"
if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" >/dev/null 2>&1; then
  echo "   이미 존재"
else
  aws dynamodb create-table --table-name "$TABLE" --region "$REGION" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST >/dev/null
  aws dynamodb wait table-exists --table-name "$TABLE" --region "$REGION"
fi

cat > "${TF_DIR}/backend.hcl" <<EOF
bucket         = "${BUCKET}"
key            = "${SERVICE}/terraform.tfstate"
region         = "${REGION}"
dynamodb_table = "${TABLE}"
encrypt        = true
EOF
echo "==> ${TF_DIR}/backend.hcl 작성됨"

cat <<NEXT

✓ 원격 state 준비 완료. 활성화:
  1) ${TF_DIR}/versions.tf 의 'backend "s3" {}' 주석 해제
  2) terraform -chdir=${TF_DIR} init -backend-config=backend.hcl -migrate-state
NEXT
