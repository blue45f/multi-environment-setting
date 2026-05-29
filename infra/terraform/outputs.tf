# 출력값은 서비스별 맵이다. gh-setup.sh가 deploy_config를 읽어 GitHub 변수를 설정한다.
#   확인: terraform output  /  통합: terraform output -json deploy_config

output "aws_region" {
  description = "GitHub var: AWS_REGION"
  value       = var.aws_region
}

output "artifact_bucket" {
  description = "GitHub var: ARTIFACT_BUCKET (모든 서비스 공유)"
  value       = aws_s3_bucket.artifacts.bucket
}

output "services" {
  description = "GitHub var: SERVICES (배포 대상 서비스 목록)"
  value       = var.services
}

output "preview_distribution_ids" {
  description = "서비스 → preview CloudFront distribution id"
  value       = { for s, d in aws_cloudfront_distribution.preview : s => d.id }
}

output "staging_distribution_ids" {
  description = "서비스 → staging CloudFront distribution id"
  value       = { for s, d in aws_cloudfront_distribution.staging : s => d.id }
}

output "production_distribution_ids" {
  description = "서비스 → production CloudFront distribution id"
  value       = { for s, d in aws_cloudfront_distribution.production : s => d.id }
}

output "preview_cloudfront_domains" {
  description = "서비스 → preview CloudFront 도메인 (도메인 없이 테스트: https://<도메인>/pr-<n>/)"
  value       = { for s, d in aws_cloudfront_distribution.preview : s => d.domain_name }
}

output "staging_cloudfront_domains" {
  description = "서비스 → staging CloudFront 도메인"
  value       = { for s, d in aws_cloudfront_distribution.staging : s => d.domain_name }
}

output "production_cloudfront_domains" {
  description = "서비스 → production CloudFront 도메인"
  value       = { for s, d in aws_cloudfront_distribution.production : s => d.domain_name }
}

output "preview_role_arns" {
  description = "서비스 → preview 배포 역할 ARN"
  value       = { for s, r in aws_iam_role.preview : s => r.arn }
}

output "staging_role_arns" {
  description = "서비스 → staging 배포 역할 ARN"
  value       = { for s, r in aws_iam_role.staging : s => r.arn }
}

output "production_role_arns" {
  description = "서비스 → production 배포 역할 ARN"
  value       = { for s, r in aws_iam_role.production : s => r.arn }
}

output "cleanup_role_arns" {
  description = "서비스 → cleanup 역할 ARN"
  value       = { for s, r in aws_iam_role.cleanup : s => r.arn }
}

# gh-setup.sh가 소비하는 통합 배포 설정 (service → 값들)
output "deploy_config" {
  description = "서비스별 배포 설정 (gh-setup.sh가 GitHub 변수로 변환)"
  value = {
    for s in var.services : s => {
      preview_role_arn           = aws_iam_role.preview[s].arn
      staging_role_arn           = aws_iam_role.staging[s].arn
      production_role_arn        = aws_iam_role.production[s].arn
      cleanup_role_arn           = aws_iam_role.cleanup[s].arn
      preview_distribution_id    = aws_cloudfront_distribution.preview[s].id
      staging_distribution_id    = aws_cloudfront_distribution.staging[s].id
      production_distribution_id = aws_cloudfront_distribution.production[s].id
      preview_cloudfront_domain  = aws_cloudfront_distribution.preview[s].domain_name
    }
  }
}
