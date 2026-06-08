#!/usr/bin/env bash
set -euo pipefail

ADMIN_PROFILE="${1:-}"
SAMPLE_USER="${SAMPLE_USER:-multi-env-free-sample-deploy}"
POLICY_NAME="${POLICY_NAME:-MultiEnvFreeSampleS3Access}"
SAMPLE_PROFILE="${SAMPLE_PROFILE:-multi-env-free-sample}"

aws_admin() {
  if [[ -n "$ADMIN_PROFILE" ]]; then
    aws --profile "$ADMIN_PROFILE" "$@"
  else
    aws "$@"
  fi
}

key_ids="$(aws_admin iam list-access-keys \
  --user-name "$SAMPLE_USER" \
  --query 'AccessKeyMetadata[].AccessKeyId' \
  --output text 2>/dev/null || true)"

for key_id in $key_ids; do
  aws_admin iam delete-access-key --user-name "$SAMPLE_USER" --access-key-id "$key_id"
  echo "Deleted access key: $key_id"
done

aws_admin iam delete-user-policy \
  --user-name "$SAMPLE_USER" \
  --policy-name "$POLICY_NAME" 2>/dev/null || true

echo "Deleted inline policy if present: $POLICY_NAME"

aws_admin iam delete-user --user-name "$SAMPLE_USER"
echo "Deleted IAM user: $SAMPLE_USER"

aws configure unset aws_access_key_id --profile "$SAMPLE_PROFILE" 2>/dev/null || true
aws configure unset aws_secret_access_key --profile "$SAMPLE_PROFILE" 2>/dev/null || true
aws configure unset region --profile "$SAMPLE_PROFILE" 2>/dev/null || true
aws configure unset output --profile "$SAMPLE_PROFILE" 2>/dev/null || true

echo "Cleared local AWS profile values: $SAMPLE_PROFILE"
