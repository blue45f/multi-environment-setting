provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.tags
  }
}

# CloudFront에 붙는 ACM 인증서는 반드시 us-east-1에 있어야 한다.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = var.tags
  }
}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  partition  = data.aws_partition.current.partition

  # artifact_bucket_name을 비우면 전역 유일 이름을 자동 생성
  artifact_bucket = (
    var.artifact_bucket_name != ""
    ? var.artifact_bucket_name
    : "${var.service_name}-frontend-artifacts-${local.account_id}-${var.aws_region}"
  )

  use_custom_domain = var.enable_custom_domain

  # 서비스 집합과 primary(첫 서비스 — custom 도메인이 적용되는 서비스)
  services        = toset(var.services)
  primary_service = var.services[0]

  # custom 도메인은 primary 서비스에만 적용한다(나머지는 CloudFront 기본 도메인).
  # 서비스별 alias 목록: primary면 해당 호스트, 아니면 빈 목록.
  preview_wildcard_host = "*.${var.preview_subdomain}.${var.apex_domain}"
  preview_aliases = {
    for s in local.services : s =>
    (local.use_custom_domain && s == local.primary_service) ? [local.preview_wildcard_host] : []
  }
  staging_aliases = {
    for s in local.services : s =>
    (local.use_custom_domain && s == local.primary_service) ? [var.staging_host] : []
  }
  production_aliases = {
    for s in local.services : s =>
    (local.use_custom_domain && s == local.primary_service) ? [var.production_host] : []
  }

  # OIDC subject claim 베이스: repo:OWNER/REPO:...
  github_sub_prefix = "repo:${var.github_owner}/${var.github_repo}"

  # 이미 OIDC provider가 있으면 그 ARN을, 없으면 새로 만든 것을 사용
  oidc_provider_arn = (
    var.create_oidc_provider
    ? aws_iam_openid_connect_provider.github[0].arn
    : "arn:${local.partition}:iam::${local.account_id}:oidc-provider/token.actions.githubusercontent.com"
  )
}
