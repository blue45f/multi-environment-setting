# ──────────────────────────────────────────────────────────────────────────
# CloudFront — 서비스(var.services)마다 배포 3개(preview/staging/production)를 만든다.
#   모든 배포가 같은 S3 버킷을 origin으로 공유하고, S3 prefix(<service>/...)로 분리된다.
#   preview      : 서비스별 CloudFront Function이 pr-<n> → /<service>/pr-<n>/ 라우팅
#   staging      : origin path /<service>/staging/current 고정
#   production   : origin path /<service>/production/current 고정
#   custom 도메인(alias/인증서)은 primary 서비스(var.services[0])에만 적용된다.
# ──────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.service_name}-s3-oac"
  description                       = "OAC for ${local.artifact_bucket}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# 서비스별 preview 라우팅 Function (서비스명이 템플릿으로 주입됨)
resource "aws_cloudfront_function" "preview_router" {
  for_each = local.services

  name    = "${each.key}-preview-router"
  runtime = "cloudfront-js-2.0"
  comment = "Route pr-<n> to S3 prefix ${each.key}/pr-<n>/ with SPA fallback"
  publish = true
  code    = templatefile("${path.module}/functions/preview-router.js.tftpl", { service = each.key })
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

locals {
  s3_origin_id = "s3-origin"
}

# ── preview distributions (서비스별, 멀티테넌트 pr-*) ───────────────────────
resource "aws_cloudfront_distribution" "preview" {
  for_each = local.services

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${each.key} preview (multi-tenant pr-*)"
  default_root_object = "index.html"
  price_class         = "PriceClass_200"
  aliases             = local.preview_aliases[each.key]

  origin {
    domain_name              = aws_s3_bucket.artifacts.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  default_cache_behavior {
    target_origin_id           = local.s3_origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.preview_router[each.key].arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = length(local.preview_aliases[each.key]) == 0 ? true : null
    acm_certificate_arn            = length(local.preview_aliases[each.key]) == 0 ? null : one(aws_acm_certificate_validation.main[*].certificate_arn)
    ssl_support_method             = length(local.preview_aliases[each.key]) == 0 ? null : "sni-only"
    minimum_protocol_version       = length(local.preview_aliases[each.key]) == 0 ? null : "TLSv1.2_2021"
  }
}

# ── staging distributions (서비스별, 단일 테넌트) ───────────────────────────
resource "aws_cloudfront_distribution" "staging" {
  for_each = local.services

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${each.key} staging"
  default_root_object = "index.html"
  price_class         = "PriceClass_200"
  aliases             = local.staging_aliases[each.key]

  origin {
    domain_name              = aws_s3_bucket.artifacts.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
    origin_path              = "/${each.key}/staging/current"
  }

  default_cache_behavior {
    target_origin_id           = local.s3_origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = length(local.staging_aliases[each.key]) == 0 ? true : null
    acm_certificate_arn            = length(local.staging_aliases[each.key]) == 0 ? null : one(aws_acm_certificate_validation.main[*].certificate_arn)
    ssl_support_method             = length(local.staging_aliases[each.key]) == 0 ? null : "sni-only"
    minimum_protocol_version       = length(local.staging_aliases[each.key]) == 0 ? null : "TLSv1.2_2021"
  }
}

# ── production distributions (서비스별, 단일 테넌트) ────────────────────────
resource "aws_cloudfront_distribution" "production" {
  for_each = local.services

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${each.key} production"
  default_root_object = "index.html"
  price_class         = "PriceClass_All"
  aliases             = local.production_aliases[each.key]

  origin {
    domain_name              = aws_s3_bucket.artifacts.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
    origin_path              = "/${each.key}/production/current"
  }

  default_cache_behavior {
    target_origin_id           = local.s3_origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = length(local.production_aliases[each.key]) == 0 ? true : null
    acm_certificate_arn            = length(local.production_aliases[each.key]) == 0 ? null : one(aws_acm_certificate_validation.main[*].certificate_arn)
    ssl_support_method             = length(local.production_aliases[each.key]) == 0 ? null : "sni-only"
    minimum_protocol_version       = length(local.production_aliases[each.key]) == 0 ? null : "TLSv1.2_2021"
  }
}
