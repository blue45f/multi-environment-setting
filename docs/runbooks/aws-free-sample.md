# AWS free-sample runbook

This runbook records the low-cost AWS sample path used for this repository.

## Decision

The full Terraform stack under `infra/terraform` is production-shaped and creates multiple CloudFront distributions plus GitHub Actions IAM/OIDC resources. That is useful for the real multi-environment architecture, but it is not the safest first step when the goal is to stay inside a free-tier style budget.

For the first AWS sample, use `infra/terraform-free-sample` instead.

## Dedicated IAM user

Do not reuse `termsdesk-deploy`; it belongs to another service.

Use this sample-specific IAM user instead:

```text
multi-env-free-sample-deploy
```

Use this local AWS profile for Terraform:

```text
multi-env-free-sample
```

Automation files:

- `infra/terraform-free-sample/create-sample-user.sh`: creates the dedicated IAM user, attaches the sample S3 policy, creates an access key, and configures the local AWS profile
- `infra/terraform-free-sample/delete-sample-user.sh`: deletes the dedicated IAM user's access keys, inline policy, user, and local profile values
- `infra/terraform-free-sample/free-sample-s3-policy.json`: least-scope S3 policy for this sample bucket

## Current sample mode

The sample is currently configured for browser access through S3 static website hosting.

```hcl
enable_public_website = true
sample_expiration_days = 1
```

This means Terraform will create a public-read bucket policy for objects in the sample bucket. Destroy the sample after testing.

## Current outcome

Terraform was installed through Homebrew using HashiCorp's tap.

```sh
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

The full stack was planned successfully after reducing CloudFront cost settings, but apply was blocked by missing CloudFront, IAM, and S3 permissions.

The free-sample stack was planned successfully. With public website mode enabled, the expected plan is:

```text
Plan: 8 to add, 0 to change, 0 to destroy
```

A previous free-sample apply using `termsdesk-deploy` was blocked by S3 bucket creation permission.

```text
AWS principal: arn:aws:iam::945203151945:user/termsdesk-deploy
Missing permission: s3:CreateBucket
Bucket: multi-env-free-sample-945203151945-ap-northeast-2
```

Attempts to grant permissions to `termsdesk-deploy` through the AWS CLI failed because it cannot manage IAM.

```text
Missing permissions: iam:PutUserPolicy, iam:AttachUserPolicy
Available local AWS profiles: default
```

No Terraform-managed AWS resource reported `Creation complete` in either apply attempt.

The dedicated IAM user flow was then completed successfully.

```text
IAM user: multi-env-free-sample-deploy
Local AWS profile: multi-env-free-sample
Terraform apply result: Resources: 8 added, 0 changed, 1 destroyed
Bucket: multi-env-free-sample-945203151945-ap-northeast-2
Website endpoint: multi-env-free-sample-945203151945-ap-northeast-2.s3-website.ap-northeast-2.amazonaws.com
Website URL: http://multi-env-free-sample-945203151945-ap-northeast-2.s3-website.ap-northeast-2.amazonaws.com
```

Root credentials were used only to bootstrap the dedicated IAM user/profile. Terraform apply used `AWS_PROFILE=multi-env-free-sample`.

## Free-sample architecture

The free sample creates only S3 resources:

- One S3 bucket
- One tiny `index.html` object
- S3 static website configuration
- Public-read bucket policy for sample objects
- Public access block adjusted to allow that bucket policy
- Ownership controls
- SSE-S3 encryption with `AES256`
- Lifecycle expiration after 1 day

It does not create:

- CloudFront
- GitHub OIDC provider
- Route53
- ACM
- NAT gateway
- VPC
- Database

## Commands

Create the dedicated sample IAM user with an administrator profile:

```sh
infra/terraform-free-sample/create-sample-user.sh <admin-profile>
```

If the current CLI session is administrator:

```sh
infra/terraform-free-sample/create-sample-user.sh
```

Plan and apply with the dedicated profile:

```sh
AWS_PROFILE=multi-env-free-sample terraform -chdir=infra/terraform-free-sample plan
AWS_PROFILE=multi-env-free-sample terraform -chdir=infra/terraform-free-sample apply
```

Destroy sample resources:

```sh
AWS_PROFILE=multi-env-free-sample terraform -chdir=infra/terraform-free-sample destroy
```

Delete the dedicated sample IAM user when finished:

```sh
infra/terraform-free-sample/delete-sample-user.sh <admin-profile>
```

## Cost posture

The free sample is intentionally tiny and short-lived.

```hcl
sample_expiration_days = 1
```

It creates a public S3 website endpoint because browser access was requested. It still avoids CloudFront, GitHub OIDC, Route53, ACM, NAT gateways, VPC resources, and databases.

## Required next action

Use a root/admin AWS session once to create the dedicated sample IAM user.

Preferred command if an admin profile exists:

```sh
infra/terraform-free-sample/create-sample-user.sh <admin-profile>
```

If no admin CLI profile exists, create the IAM user in AWS Console:

```text
User name: multi-env-free-sample-deploy
Policy: contents of infra/terraform-free-sample/free-sample-s3-policy.json
Access key use case: Command Line Interface (CLI)
Local AWS profile name: multi-env-free-sample
```

## Account-level public access block note

If the AWS account has account-level S3 Block Public Access enabled, Terraform may still fail while attaching the public-read bucket policy required by S3 website hosting.

If that happens, use one of these options:

1. Temporarily allow public bucket policies for this sample bucket/account while testing.
2. Set `enable_public_website = false` and keep the sample private.

## Cleanup rule

If apply succeeds later, destroy the sample when finished.

```sh
AWS_PROFILE=multi-env-free-sample terraform -chdir=infra/terraform-free-sample destroy
```

The sample bucket uses `force_destroy = true`, so Terraform can remove the sample object and bucket during cleanup.

Security cleanup:

- Delete or securely archive `rootkey.csv`; do not keep root access keys in the project directory.
- Rotate/delete the AWS root access key in the AWS Console after bootstrap.
- Keep using `multi-env-free-sample-deploy` or another scoped IAM user for follow-up work.
- Delete `multi-env-free-sample-deploy` with `delete-sample-user.sh` after the sample is no longer needed.

## Cleanup completed

The temporary browser-accessible sample was destroyed after validation.

```text
Terraform destroy result: Resources: 8 destroyed
Destroyed bucket: multi-env-free-sample-945203151945-ap-northeast-2
Deleted IAM user: multi-env-free-sample-deploy
Deleted inline policy: MultiEnvFreeSampleS3Access
Cleared local AWS profile values: multi-env-free-sample
```

The S3 website URL is no longer expected to serve the sample page after destroy.

Root credentials were used again only for cleanup of the dedicated IAM user. The root access key should still be deleted or rotated in the AWS Console.
