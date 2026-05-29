# ──────────────────────────────────────────────────────────────────────────
# GitHub Actions OIDC provider + 환경별 역할
#   - 장기 AWS access key를 저장하지 않는다.
#   - 각 역할은 GitHub environment claim(environment:<env>)으로 AssumeRole을 제한한다.
# ──────────────────────────────────────────────────────────────────────────

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = var.github_oidc_thumbprints
}

# 공통 trust policy 생성기 (environment claim 기준)
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

    # preview 역할: PR 워크플로(environment: preview)와 cleanup 워크플로(environment: preview)가 사용
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

# ── preview deploy role ─────────────────────────────────────────────────────
resource "aws_iam_role" "preview" {
  name               = "${var.service_name}-gha-preview"
  assume_role_policy = data.aws_iam_policy_document.trust_preview.json
  description        = "GitHub Actions preview 배포용 (web/pr-* prefix + preview distribution invalidation)"
}

data "aws_iam_policy_document" "preview" {
  statement {
    sid       = "WritePreviewArtifacts"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}/${var.service_name}/pr-*"]
  }
  statement {
    sid       = "ListPreviewPrefixes"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}"]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${var.service_name}/pr-*"]
    }
  }
  statement {
    sid       = "InvalidatePreview"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.preview.arn]
  }
  # (선택) Pattern B: Amplify manual deploy를 쓸 경우에만 의미가 있다.
  statement {
    sid       = "AmplifyPreviewBranch"
    effect    = "Allow"
    actions   = ["amplify:StartDeployment", "amplify:GetJob", "amplify:CreateBranch", "amplify:DeleteBranch"]
    resources = ["arn:${local.partition}:amplify:${var.aws_region}:${local.account_id}:apps/*/branches/pr-*"]
  }
}

resource "aws_iam_role_policy" "preview" {
  name   = "preview-deploy"
  role   = aws_iam_role.preview.id
  policy = data.aws_iam_policy_document.preview.json
}

# ── staging deploy role ─────────────────────────────────────────────────────
resource "aws_iam_role" "staging" {
  name               = "${var.service_name}-gha-staging"
  assume_role_policy = data.aws_iam_policy_document.trust_staging.json
  description        = "GitHub Actions staging 배포용 (web/staging/* prefix + staging distribution invalidation)"
}

data "aws_iam_policy_document" "staging" {
  statement {
    sid       = "WriteStagingArtifacts"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}/${var.service_name}/staging/*"]
  }
  statement {
    sid       = "ListStagingPrefixes"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}"]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${var.service_name}/staging/*"]
    }
  }
  statement {
    sid       = "InvalidateStaging"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.staging.arn]
  }
}

resource "aws_iam_role_policy" "staging" {
  name   = "staging-deploy"
  role   = aws_iam_role.staging.id
  policy = data.aws_iam_policy_document.staging.json
}

# ── production deploy role ──────────────────────────────────────────────────
# environment: production 의 reviewer 승인을 통과해야만 AssumeRole 된다.
resource "aws_iam_role" "production" {
  name               = "${var.service_name}-gha-production"
  assume_role_policy = data.aws_iam_policy_document.trust_production.json
  description        = "GitHub Actions production 배포용 (web/production/* prefix + production distribution invalidation)"
}

data "aws_iam_policy_document" "production" {
  statement {
    sid       = "WriteProductionArtifacts"
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}/${var.service_name}/production/*"]
  }
  statement {
    sid       = "ListProductionPrefixes"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}"]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${var.service_name}/production/*"]
    }
  }
  statement {
    sid       = "InvalidateProduction"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [aws_cloudfront_distribution.production.arn]
  }
}

resource "aws_iam_role_policy" "production" {
  name   = "production-deploy"
  role   = aws_iam_role.production.id
  policy = data.aws_iam_policy_document.production.json
}

# ── cleanup role ────────────────────────────────────────────────────────────
# preview 환경에서 동작하지만 권한은 "삭제/목록"으로만 좁힌다.
resource "aws_iam_role" "cleanup" {
  name               = "${var.service_name}-gha-cleanup"
  assume_role_policy = data.aws_iam_policy_document.trust_preview.json
  description        = "GitHub Actions cleanup용 (web/pr-* 삭제 + Amplify pr-* branch 삭제)"
}

data "aws_iam_policy_document" "cleanup" {
  statement {
    sid       = "DeletePreviewArtifacts"
    effect    = "Allow"
    actions   = ["s3:DeleteObject", "s3:GetObject"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}/${var.service_name}/pr-*"]
  }
  statement {
    sid       = "ListForCleanup"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = ["arn:${local.partition}:s3:::${local.artifact_bucket}"]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${var.service_name}/pr-*"]
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
  name   = "preview-cleanup"
  role   = aws_iam_role.cleanup.id
  policy = data.aws_iam_policy_document.cleanup.json
}
