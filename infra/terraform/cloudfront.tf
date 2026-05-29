# ──────────────────────────────────────────────────────────────────────────
# CloudFront — 환경별 배포 3개가 같은 S3 버킷을 origin으로 공유한다.
#   preview      : *.preview.example.com  → CloudFront Function이 host로 prefix 라우팅
#   staging      : staging.example.com    → origin path /web/staging/current 고정
#   production   : www.example.com        → origin path /web/production/current 고정
# ──────────────────────────────────────────────────────────────────────────

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${var.service_name}-s3-oac"
  description                       = "OAC for ${local.artifact_bucket}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "preview_router" {
  name    = "${var.service_name}-preview-router"
  runtime = "cloudfront-js-2.0"
  comment = "Route pr-<n> host/path to S3 prefix web/pr-<n>/ with SPA fallback"
  publish = true
  code    = file("${path.module}/functions/preview-router.js")
}

# AWS 관리형 정책: 캐시는 origin Cache-Control 헤더를 존중(CachingOptimized),
# 보안 헤더는 SecurityHeadersPolicy 사용.
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

locals {
  s3_origin_id = "${var.service_name}-s3-origin"
}

# ── preview distribution (멀티테넌트) ───────────────────────────────────────
resource "aws_cloudfront_distribution" "preview" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.service_name} preview (multi-tenant pr-*)"
  default_root_object = "index.html"
  price_class         = "PriceClass_200"
  aliases             = local.use_custom_domain ? [local.preview_wildcard_host] : []

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
      function_arn = aws_cloudfront_function.preview_router.arn
    }
  }

  # preview의 SPA fallback은 CloudFront Function이 처리하므로 custom_error_response를 쓰지 않는다.
  # (custom_error_response의 /index.html은 테넌트 prefix를 반영하지 못함)

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = local.use_custom_domain ? null : true
    acm_certificate_arn            = local.use_custom_domain ? one(aws_acm_certificate_validation.main[*].certificate_arn) : null
    ssl_support_method             = local.use_custom_domain ? "sni-only" : null
    minimum_protocol_version       = local.use_custom_domain ? "TLSv1.2_2021" : null
  }
}

# ── staging distribution (단일 테넌트) ──────────────────────────────────────
resource "aws_cloudfront_distribution" "staging" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.service_name} staging"
  default_root_object = "index.html"
  price_class         = "PriceClass_200"
  aliases             = local.use_custom_domain ? [var.staging_host] : []

  origin {
    domain_name              = aws_s3_bucket.artifacts.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
    origin_path              = "/${var.service_name}/staging/current"
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
    cloudfront_default_certificate = local.use_custom_domain ? null : true
    acm_certificate_arn            = local.use_custom_domain ? one(aws_acm_certificate_validation.main[*].certificate_arn) : null
    ssl_support_method             = local.use_custom_domain ? "sni-only" : null
    minimum_protocol_version       = local.use_custom_domain ? "TLSv1.2_2021" : null
  }
}

# ── production distribution (단일 테넌트) ───────────────────────────────────
resource "aws_cloudfront_distribution" "production" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${var.service_name} production"
  default_root_object = "index.html"
  price_class         = "PriceClass_All"
  aliases             = local.use_custom_domain ? [var.production_host] : []

  origin {
    domain_name              = aws_s3_bucket.artifacts.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
    origin_path              = "/${var.service_name}/production/current"
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
    cloudfront_default_certificate = local.use_custom_domain ? null : true
    acm_certificate_arn            = local.use_custom_domain ? one(aws_acm_certificate_validation.main[*].certificate_arn) : null
    ssl_support_method             = local.use_custom_domain ? "sni-only" : null
    minimum_protocol_version       = local.use_custom_domain ? "TLSv1.2_2021" : null
  }
}
