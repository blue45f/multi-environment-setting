# Setup

## 1. Provision AWS

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
terraform output
```

Fill `terraform.tfvars` with your hosted zone, domain names, GitHub owner, and
repository name. The file is gitignored because it can contain account-specific
values.

## 2. Configure GitHub

Copy the Terraform outputs into repository variables:

- `AWS_REGION`
- `ARTIFACT_BUCKET`
- `AWS_PREVIEW_ROLE_ARN`
- `AWS_STAGING_ROLE_ARN`
- `AWS_PRODUCTION_ROLE_ARN`
- `AWS_CLEANUP_ROLE_ARN`
- `PREVIEW_DISTRIBUTION_ID`
- `STAGING_DISTRIBUTION_ID`
- `PRODUCTION_DISTRIBUTION_ID`
- `PREVIEW_BASE_DOMAIN`
- `PRODUCTION_DOMAIN`

Create `preview`, `staging`, and `production` GitHub environments. Production
should require a reviewer and should be limited to the `main` branch.

## 3. Validate The Example App

```bash
cd apps/web
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The build writes a static export to `apps/web/out`, which is the directory
uploaded by `preview.yml` and `deploy.yml`.

## 4. Open A Pull Request

When a PR opens, `.github/workflows/preview.yml` builds and publishes the app to
`web/pr-<number>/`, invalidates that prefix, and comments the preview URL back on
the PR.
