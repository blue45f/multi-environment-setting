#!/usr/bin/env bash
set -euo pipefail

ADMIN_PROFILE="${1:-}"
SAMPLE_USER="${SAMPLE_USER:-multi-env-free-sample-deploy}"
SAMPLE_PROFILE="${SAMPLE_PROFILE:-multi-env-free-sample}"
POLICY_NAME="${POLICY_NAME:-MultiEnvFreeSampleS3Access}"
POLICY_DOCUMENT="${POLICY_DOCUMENT:-infra/terraform-free-sample/free-sample-s3-policy.json}"
REGION="${AWS_REGION:-ap-northeast-2}"

aws_admin() {
  if [[ -n "$ADMIN_PROFILE" ]]; then
    aws --profile "$ADMIN_PROFILE" "$@"
  else
    aws "$@"
  fi
}

if ! aws_admin iam get-user --user-name "$SAMPLE_USER" >/dev/null 2>&1; then
  aws_admin iam create-user --user-name "$SAMPLE_USER" >/dev/null
  echo "Created IAM user: $SAMPLE_USER"
else
  echo "IAM user already exists: $SAMPLE_USER"
fi

aws_admin iam put-user-policy \
  --user-name "$SAMPLE_USER" \
  --policy-name "$POLICY_NAME" \
  --policy-document "file://$POLICY_DOCUMENT" >/dev/null

echo "Attached inline policy: $POLICY_NAME"

key_count="$(aws_admin iam list-access-keys \
  --user-name "$SAMPLE_USER" \
  --query 'length(AccessKeyMetadata)' \
  --output text)"

if [[ "$key_count" -ge 2 ]]; then
  cat >&2 <<MSG
$SAMPLE_USER already has 2 access keys. Delete one old key first, then rerun this script.
MSG
  exit 1
fi

read -r access_key_id secret_access_key < <(
  aws_admin iam create-access-key \
    --user-name "$SAMPLE_USER" \
    --query 'AccessKey.[AccessKeyId,SecretAccessKey]' \
    --output text
)

aws configure set aws_access_key_id "$access_key_id" --profile "$SAMPLE_PROFILE"
aws configure set aws_secret_access_key "$secret_access_key" --profile "$SAMPLE_PROFILE"
aws configure set region "$REGION" --profile "$SAMPLE_PROFILE"
aws configure set output json --profile "$SAMPLE_PROFILE"

cat <<MSG
Configured local AWS profile: $SAMPLE_PROFILE

Next commands:
  AWS_PROFILE=$SAMPLE_PROFILE terraform -chdir=infra/terraform-free-sample plan
  AWS_PROFILE=$SAMPLE_PROFILE terraform -chdir=infra/terraform-free-sample apply

Security note:
  The access key was written to your local AWS credentials file for profile '$SAMPLE_PROFILE'.
  Delete it after the sample if this is temporary.
MSG
