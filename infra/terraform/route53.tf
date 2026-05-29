# ──────────────────────────────────────────────────────────────────────────
# ACM 인증서(us-east-1) + Route53 레코드
#   enable_custom_domain = true 일 때만 생성된다.
#   false면 CloudFront 기본 도메인(*.cloudfront.net)만 쓰고 이 파일은 아무 리소스도 만들지 않는다.
# ──────────────────────────────────────────────────────────────────────────

resource "aws_acm_certificate" "main" {
  count    = local.use_custom_domain ? 1 : 0
  provider = aws.us_east_1

  domain_name = var.production_host
  subject_alternative_names = [
    var.staging_host,
    local.preview_wildcard_host, # *.preview.example.com
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# DNS 검증 레코드
resource "aws_route53_record" "cert_validation" {
  for_each = local.use_custom_domain ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  } : {}

  zone_id         = var.hosted_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "main" {
  count    = local.use_custom_domain ? 1 : 0
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# ── alias 레코드 ────────────────────────────────────────────────────────────
resource "aws_route53_record" "preview_a" {
  count   = local.use_custom_domain ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = local.preview_wildcard_host
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.preview[local.primary_service].domain_name
    zone_id                = aws_cloudfront_distribution.preview[local.primary_service].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "preview_aaaa" {
  count   = local.use_custom_domain ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = local.preview_wildcard_host
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.preview[local.primary_service].domain_name
    zone_id                = aws_cloudfront_distribution.preview[local.primary_service].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "staging_a" {
  count   = local.use_custom_domain ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.staging_host
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.staging[local.primary_service].domain_name
    zone_id                = aws_cloudfront_distribution.staging[local.primary_service].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "staging_aaaa" {
  count   = local.use_custom_domain ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.staging_host
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.staging[local.primary_service].domain_name
    zone_id                = aws_cloudfront_distribution.staging[local.primary_service].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "production_a" {
  count   = local.use_custom_domain ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.production_host
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.production[local.primary_service].domain_name
    zone_id                = aws_cloudfront_distribution.production[local.primary_service].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "production_aaaa" {
  count   = local.use_custom_domain ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.production_host
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.production[local.primary_service].domain_name
    zone_id                = aws_cloudfront_distribution.production[local.primary_service].hosted_zone_id
    evaluate_target_health = false
  }
}
