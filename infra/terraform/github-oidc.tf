# ──────────────────────────────────────────────────────────────────────────
# GitHub Actions OIDC provider + 서비스별 역할 (var.services 마다 4종)
#   - 장기 AWS access key 없음.
#   - GitHub environment claim(environment:<env>)으로 AssumeRole 제한.
#   - 권한은 서비스 prefix(<service>/...)와 그 서비스의 distribution으로 좁힌다.
# environment 이름(preview/staging/production)은 서비스 공통이므로 trust 문서는 서비스 무관(공유),
# 권한 정책만 서비스별로 만든다.
# ──────────────────────────────────────────────────────────────────────────

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = var.github_oidc_thumbprints
}

# ── 공유 trust 문서 (environment claim 기준) ────────────────────────────────
data "aws_iam_policy_document" "trust_preview" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${local.github_sub_prefix}:environment:preview"]
    }
  }
}

data "aws_iam_policy_document" "trust_staging" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${local.github_sub_prefix}:environment:staging"]
    }
  }
}

data "aws_iam_policy_document" "trust_production" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${local.github_sub_prefix}:environment:production"]
    }
  }
}

# ── preview deploy role (서비스별) ──────────────────────────────────────────
resource "aws_iam_role" "preview" {
  for_each           = local.services
  name               = "${each.key}-gha-preview"
  assume_role_policy = data.aws_iam_policy_document.trust_preview.json
  description        = "GitHub Actions preview 배포용 (${each.key}/pr-* + preview distribution invalidation)"
}

data "aws_iam_policy_document" "preview" {
  for_each = local.services
  statement {
    sid       = "WritePreviewArtifacts"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}/${each.key}/pr-*"]
  }
  statement {
    sid       = "ListPreviewPrefixes"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}"]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${each.key}/pr-*"]
    }
  }
  statement {
    sid       = "InvalidatePreview"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.preview[each.key].arn]
  }
  statement {
    sid       = "AmplifyPreviewBranch"
    effect    = "Allow"
    actions   = ["amplify:StartDeployment", "amplify:GetJob", "amplify:CreateBranch", "amplify:DeleteBranch"]
    resources = ["arn:${local.partition}:amplify:${var.aws_region}:${local.account_id}:apps/*/branches/pr-*"]
  }
}

resource "aws_iam_role_policy" "preview" {
  for_each = local.services
  name     = "preview-deploy"
  role     = aws_iam_role.preview[each.key].id
  policy   = data.aws_iam_policy_document.preview[each.key].json
}

# ── staging deploy role (서비스별) ──────────────────────────────────────────
resource "aws_iam_role" "staging" {
  for_each           = local.services
  name               = "${each.key}-gha-staging"
  assume_role_policy = data.aws_iam_policy_document.trust_staging.json
  description        = "GitHub Actions staging 배포용 (${each.key}/staging/* + staging distribution invalidation)"
}

data "aws_iam_policy_document" "staging" {
  for_each = local.services
  statement {
    sid       = "WriteStagingArtifacts"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}/${each.key}/staging/*"]
  }
  statement {
    sid       = "ListStagingPrefixes"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}"]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${each.key}/staging/*"]
    }
  }
  statement {
    sid       = "InvalidateStaging"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.staging[each.key].arn]
  }
}

resource "aws_iam_role_policy" "staging" {
  for_each = local.services
  name     = "staging-deploy"
  role     = aws_iam_role.staging[each.key].id
  policy   = data.aws_iam_policy_document.staging[each.key].json
}

# ── production deploy role (서비스별, environment reviewer 승인 후) ──────────
resource "aws_iam_role" "production" {
  for_each           = local.services
  name               = "${each.key}-gha-production"
  assume_role_policy = data.aws_iam_policy_document.trust_production.json
  description        = "GitHub Actions production 배포용 (${each.key}/production/* + production distribution invalidation)"
}

data "aws_iam_policy_document" "production" {
  for_each = local.services
  statement {
    sid       = "WriteProductionArtifacts"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}/${each.key}/production/*"]
  }
  statement {
    sid       = "ListProductionPrefixes"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}"]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${each.key}/production/*"]
    }
  }
  statement {
    sid       = "InvalidateProduction"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.production[each.key].arn]
  }
}

resource "aws_iam_role_policy" "production" {
  for_each = local.services
  name     = "production-deploy"
  role     = aws_iam_role.production[each.key].id
  policy   = data.aws_iam_policy_document.production[each.key].json
}

# ── cleanup role (서비스별; preview 환경에서 동작, 삭제/목록만) ──────────────
resource "aws_iam_role" "cleanup" {
  for_each           = local.services
  name               = "${each.key}-gha-cleanup"
  assume_role_policy = data.aws_iam_policy_document.trust_preview.json
  description        = "GitHub Actions cleanup용 (${each.key}/pr-* 삭제 + Amplify pr-* branch 삭제)"
}

data "aws_iam_policy_document" "cleanup" {
  for_each = local.services
  statement {
    sid       = "DeletePreviewArtifacts"
    effect    = "Allow"
    actions   = ["s3:DeleteObject", "s3:GetObject"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}/${each.key}/pr-*"]
  }
  statement {
    sid       = "ListForCleanup"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}"]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${each.key}/pr-*"]
    }
  }
  statement {
    sid       = "AmplifyDeletePreviewBranch"
    effect    = "Allow"
    actions   = ["amplify:DeleteBranch", "amplify:ListBranches"]
    resources = ["arn:${local.partition}:amplify:${var.aws_region}:${local.account_id}:apps/*/branches/pr-*"]
  }
}

resource "aws_iam_role_policy" "cleanup" {
  for_each = local.services
  name     = "preview-cleanup"
  role     = aws_iam_role.cleanup[each.key].id
  policy   = data.aws_iam_policy_document.cleanup[each.key].json
}
