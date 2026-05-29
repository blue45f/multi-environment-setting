# ──────────────────────────────────────────────────────────────────────────
# Artifact / origin 버킷
#   - 모든 환경(preview/staging/production)의 정적 산출물을 하나의 버킷에 prefix로 보관
#   - public access 차단, CloudFront OAC로만 읽기 허용
#   - 버전 관리 + 수명주기로 비용/orphan 관리
# ──────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "artifacts" {
  bucket = local.artifact_bucket
}

resource "aws_s3_bucket_public_access_block" "artifacts" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id

  # preview(web/pr-*)는 cleanup이 누락돼도 자동 만료 — 비용/orphan 안전망
  rule {
    id     = "expire-preview"
    status = "Enabled"
    filter {
      prefix = "${var.service_name}/pr-"
    }
    expiration {
      days = var.preview_expiration_days
    }
    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }

  # 불변 릴리스(web/*/releases/*)는 더 길게 보관 후 만료 (rollback 소스)
  rule {
    id     = "expire-staging-releases"
    status = "Enabled"
    filter {
      prefix = "${var.service_name}/staging/releases/"
    }
    expiration {
      days = var.release_expiration_days
    }
  }
  rule {
    id     = "expire-production-releases"
    status = "Enabled"
    filter {
      prefix = "${var.service_name}/production/releases/"
    }
    expiration {
      days = var.release_expiration_days
    }
  }

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# OAC를 통해 들어오는 CloudFront(이 계정의 3개 배포)만 GetObject 허용
data "aws_iam_policy_document" "artifacts_bucket" {
  statement {
    sid     = "AllowCloudFrontReadViaOAC"
    effect  = "Allow"
    actions = ["s3:GetObject"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    resources = ["${aws_s3_bucket.artifacts.arn}/*"]
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values = [
        aws_cloudfront_distribution.preview.arn,
        aws_cloudfront_distribution.staging.arn,
        aws_cloudfront_distribution.production.arn,
      ]
    }
  }
}

resource "aws_s3_bucket_policy" "artifacts" {
  bucket = aws_s3_bucket.artifacts.id
  policy = data.aws_iam_policy_document.artifacts_bucket.json

  # 버킷 정책이 public access block보다 먼저 평가되지 않도록 의존성 명시
  depends_on = [aws_s3_bucket_public_access_block.artifacts]
}
