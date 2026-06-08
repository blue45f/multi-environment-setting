data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  normalized_region = replace(var.aws_region, "_", "-")
  derived_bucket    = "${var.project_name}-${data.aws_caller_identity.current.account_id}-${local.normalized_region}"
  bucket_name       = var.bucket_name != "" ? var.bucket_name : local.derived_bucket

  sample_index_html = <<-HTML
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Free sample deployment</title>
        <style>
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: ui-sans-serif, system-ui, sans-serif; background: #f7f2e8; color: #1d1a16; }
          main { max-width: 680px; margin: 24px; padding: 32px; border: 1px solid #d8cdb9; border-radius: 24px; background: #fffaf0; box-shadow: 0 20px 60px rgba(43, 31, 15, 0.08); }
          h1 { margin: 0 0 12px; font-size: clamp(28px, 5vw, 48px); letter-spacing: -0.04em; }
          p { margin: 0; font-size: 18px; line-height: 1.65; }
          code { background: #eee2cc; padding: 2px 6px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <main>
          <h1>AWS free-sample bucket is ready.</h1>
          <p>This tiny static page is stored in <code>${local.bucket_name}</code> and lifecycle rules delete sample objects after ${var.sample_expiration_days} day(s).</p>
        </main>
      </body>
    </html>
  HTML
}

resource "aws_s3_bucket" "sample" {
  bucket        = local.bucket_name
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "sample" {
  bucket = aws_s3_bucket.sample.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = !var.enable_public_website
  restrict_public_buckets = !var.enable_public_website
}

resource "aws_s3_bucket_ownership_controls" "sample" {
  bucket = aws_s3_bucket.sample.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sample" {
  bucket = aws_s3_bucket.sample.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "sample" {
  bucket = aws_s3_bucket.sample.id

  rule {
    id     = "expire-sample-objects"
    status = "Enabled"

    filter {}

    expiration {
      days = var.sample_expiration_days
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

resource "aws_s3_bucket_website_configuration" "sample" {
  count  = var.enable_public_website ? 1 : 0
  bucket = aws_s3_bucket.sample.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

data "aws_iam_policy_document" "public_read" {
  count = var.enable_public_website ? 1 : 0

  statement {
    sid     = "PublicReadSampleWebsite"
    effect  = "Allow"
    actions = ["s3:GetObject"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    resources = ["${aws_s3_bucket.sample.arn}/*"]
  }
}

resource "aws_s3_bucket_policy" "public_read" {
  count  = var.enable_public_website ? 1 : 0
  bucket = aws_s3_bucket.sample.id
  policy = data.aws_iam_policy_document.public_read[0].json

  depends_on = [aws_s3_bucket_public_access_block.sample]
}

resource "aws_s3_object" "index" {
  count = var.create_sample_index ? 1 : 0

  bucket        = aws_s3_bucket.sample.id
  key           = "index.html"
  content       = local.sample_index_html
  content_type  = "text/html; charset=utf-8"
  cache_control = "no-cache, no-store, must-revalidate"
}
