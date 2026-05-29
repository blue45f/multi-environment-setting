# Terraform

This module provisions the AWS baseline for static frontend environments:

- one encrypted S3 artifact bucket
- preview, staging, and production CloudFront distributions
- Route53 aliases and ACM validation when `enable_custom_domain = true`
- GitHub OIDC provider and scoped deploy roles
- lifecycle expiration for abandoned preview prefixes

## Usage

```bash
terraform init
terraform plan -out tfplan
terraform apply tfplan
terraform output
```

Keep real values in `terraform.tfvars`; commit only `terraform.tfvars.example`.

## Domain Modes

When `enable_custom_domain = false`, CloudFront default domains are still output
for testing. When it is `true`, provide `hosted_zone_id`, `apex_domain`,
`preview_subdomain`, `staging_host`, and `production_host`.
