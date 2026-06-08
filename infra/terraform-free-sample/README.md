# Terraform free sample

This directory contains the smallest browser-accessible AWS sample in this repository. It is intended for hands-on testing while staying as close as possible to a free-tier style setup.

## Current status

The sample is currently deployed as the browser-accessible AWS fallback for the demo app.

```hcl
aws_region = "ap-northeast-2"
project_name = "multi-env-free-sample"
enable_public_website = true
create_sample_index = false
sample_expiration_days = 1
```

Live sample URL:

```text
http://multi-env-free-sample-945203151945-ap-northeast-2.s3-website.ap-northeast-2.amazonaws.com
```

Additional demo page:

```text
http://multi-env-free-sample-945203151945-ap-northeast-2.s3-website.ap-northeast-2.amazonaws.com/intro/
```

The deployed content is the static export from `apps/web/out`, generated with:

```sh
pnpm --dir apps/web build
AWS_PROFILE=multi-env-free-sample aws s3 sync apps/web/out s3://multi-env-free-sample-945203151945-ap-northeast-2/ --delete --cache-control "no-cache, no-store, must-revalidate"
```

Deployment check on 2026-06-08:

```text
/       -> HTTP 200
/intro/ -> HTTP 200
```

Vercel was attempted first, but the available URL was not usable:

```text
https://web-blond-nine-45.vercel.app/ -> 404 DEPLOYMENT_NOT_FOUND
https://web-qa27gjx7p-blue45fs-projects.vercel.app -> 401 / deployment status Error
Preview redeploy blocked by Vercel free-plan API deployment limit: api-deployments-free-per-day
```

Because of that limit, the AWS S3 website endpoint is the active low-cost sample URL for now.

A previous apply with `termsdesk-deploy` failed because that user is for another service and does not have S3/IAM permissions for this sample.

```text
AWS principal: arn:aws:iam::945203151945:user/termsdesk-deploy
Missing permission: s3:CreateBucket
Blocked bucket: multi-env-free-sample-945203151945-ap-northeast-2
```

`termsdesk-deploy` also cannot attach policies or create users.

```text
Missing permissions: iam:PutUserPolicy, iam:AttachUserPolicy
Available local AWS profiles: default
```

No resource reported `Creation complete` before the failure, so there should be no Terraform-managed resource left running from this sample attempt.

The dedicated IAM user path has since been applied successfully.

```text
IAM user: multi-env-free-sample-deploy
Terraform profile: multi-env-free-sample
Apply result: Resources: 8 added, 0 changed, 1 destroyed
Bucket: multi-env-free-sample-945203151945-ap-northeast-2
Website URL: http://multi-env-free-sample-945203151945-ap-northeast-2.s3-website.ap-northeast-2.amazonaws.com
```

Root credentials were used only to bootstrap the dedicated IAM user/profile. Terraform apply used the dedicated `multi-env-free-sample` profile.

## Recommended dedicated user

Use a separate IAM user for this sample:

```text
multi-env-free-sample-deploy
```

The local AWS profile created for Terraform is:

```text
multi-env-free-sample
```

Generated helper scripts:

```text
infra/terraform-free-sample/create-sample-user.sh
infra/terraform-free-sample/delete-sample-user.sh
```

Generated least-scope S3 policy:

```text
infra/terraform-free-sample/free-sample-s3-policy.json
```

## Minimum manual step

You need one administrator AWS session/profile once. With that admin profile, run:

```sh
infra/terraform-free-sample/create-sample-user.sh <admin-profile>
```

If the current AWS CLI session is already administrator, run:

```sh
infra/terraform-free-sample/create-sample-user.sh
```

The script will:

- Create IAM user `multi-env-free-sample-deploy`
- Attach only the sample S3 policy from `free-sample-s3-policy.json`
- Create one access key for that user
- Configure local AWS profile `multi-env-free-sample`

It does not print the secret access key. It writes the key to the local AWS credentials file under the `multi-env-free-sample` profile.

## Apply the sample

After the dedicated user profile exists:

```sh
AWS_PROFILE=multi-env-free-sample terraform -chdir=infra/terraform-free-sample plan
AWS_PROFILE=multi-env-free-sample terraform -chdir=infra/terraform-free-sample apply
```

Terraform will output `website_url` after a successful apply.

## What this creates

This sample creates only:

- One S3 bucket
- Static demo objects uploaded from `apps/web/out`
- S3 static website configuration
- Public-read bucket policy for sample objects
- S3 public access block adjusted to allow that bucket policy
- S3 bucket ownership controls
- S3 server-side encryption with `AES256`
- S3 lifecycle policy that expires sample objects after 1 day

It intentionally does not create:

- CloudFront distributions
- CloudFront functions
- GitHub OIDC provider
- Route53 records
- ACM certificates
- NAT gateways
- VPC resources
- Databases

## Cost controls

Cost-control choices:

- `sample_expiration_days = 1` removes objects quickly.
- `force_destroy = true` allows `terraform destroy` to delete the bucket even when it contains sample objects.
- No CloudFront resources are created, so there is no CDN request/data-transfer surface from this sample.
- The uploaded static export is about 1 MiB, so storage cost is negligible for this short-lived sample.

## Public website note

Because `enable_public_website = true`, the sample bucket intentionally allows public `s3:GetObject` for objects in this bucket. This is required for the S3 website URL to work.

If the AWS account has account-level S3 Block Public Access enabled, apply may fail when Terraform tries to attach the public-read bucket policy. In that case, an AWS administrator must allow public bucket policies for this sample, or set `enable_public_website = false` and keep the bucket private.

## Cleanup

Destroy sample AWS resources:

```sh
AWS_PROFILE=multi-env-free-sample terraform -chdir=infra/terraform-free-sample destroy
```

Delete the dedicated IAM user and local profile values with an administrator profile:

```sh
infra/terraform-free-sample/delete-sample-user.sh <admin-profile>
```

If the current AWS CLI session is administrator:

```sh
infra/terraform-free-sample/delete-sample-user.sh
```

Security cleanup:

- Delete or securely archive `rootkey.csv`; do not keep root access keys in the project directory.
- Rotate/delete the AWS root access key in the AWS Console after bootstrap.
- Keep follow-up work on the scoped `multi-env-free-sample` profile.

## Relationship to the production Terraform

This directory is separate from `infra/terraform`.

Use `infra/terraform-free-sample` when the goal is minimal AWS cost and browser-accessible S3 validation.

Use `infra/terraform` when the goal is the full architecture with CloudFront preview/staging/production distributions and GitHub Actions roles.

## Previous cleanup record

The temporary sample has been destroyed after validation.

```text
Terraform destroy result: Resources: 8 destroyed
Destroyed bucket: multi-env-free-sample-945203151945-ap-northeast-2
Deleted IAM user: multi-env-free-sample-deploy
Deleted inline policy: MultiEnvFreeSampleS3Access
Cleared local AWS profile values: multi-env-free-sample
```

That cleanup record is historical. The sample was recreated on 2026-06-08 for the current live demo URL above.

Delete or rotate the root access key used for bootstrap/cleanup in the AWS Console when the sample is no longer needed.
