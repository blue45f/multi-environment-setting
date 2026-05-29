# 아래 출력값을 GitHub repository variables에 넣는다 (README §5 표 참고).
# 확인: terraform output  /  특정 값: terraform output -raw artifact_bucket

output "aws_region" {
  description = "GitHub var: AWS_REGION"
  value       = var.aws_region
}

output "artifact_bucket" {
  description = "GitHub var: ARTIFACT_BUCKET"
  value       = aws_s3_bucket.artifacts.bucket
}

output "preview_role_arn" {
  description = "GitHub var: AWS_PREVIEW_ROLE_ARN"
  value       = aws_iam_role.preview.arn
}

output "staging_role_arn" {
  description = "GitHub var: AWS_STAGING_ROLE_ARN"
  value       = aws_iam_role.staging.arn
}

output "production_role_arn" {
  description = "GitHub var: AWS_PRODUCTION_ROLE_ARN"
  value       = aws_iam_role.production.arn
}

output "cleanup_role_arn" {
  description = "GitHub var: AWS_CLEANUP_ROLE_ARN"
  value       = aws_iam_role.cleanup.arn
}

output "preview_distribution_id" {
  description = "GitHub var: PREVIEW_DISTRIBUTION_ID"
  value       = aws_cloudfront_distribution.preview.id
}

output "staging_distribution_id" {
  description = "GitHub var: STAGING_DISTRIBUTION_ID"
  value       = aws_cloudfront_distribution.staging.id
}

output "production_distribution_id" {
  description = "GitHub var: PRODUCTION_DISTRIBUTION_ID"
  value       = aws_cloudfront_distribution.production.id
}

# custom 도메인을 아직 안 쓸 때, 아래 CloudFront 도메인으로 바로 접근/테스트할 수 있다.
output "preview_cloudfront_domain" {
  description = "preview 배포의 CloudFront 도메인 (path 기반 테스트: https://<도메인>/pr-<n>/)"
  value       = aws_cloudfront_distribution.preview.domain_name
}

output "staging_cloudfront_domain" {
  description = "staging 배포의 CloudFront 도메인"
  value       = aws_cloudfront_distribution.staging.domain_name
}

output "production_cloudfront_domain" {
  description = "production 배포의 CloudFront 도메인"
  value       = aws_cloudfront_distribution.production.domain_name
}

# 복사-붙여넣기용: GitHub variables 설정을 gh CLI로 한 번에
output "gh_variable_commands" {
  description = "gh CLI로 repo variables를 설정하는 명령 모음 (OWNER/REPO는 본인 값으로)"
  value       = <<-EOT
    gh variable set AWS_REGION --body "${var.aws_region}"
    gh variable set ARTIFACT_BUCKET --body "${aws_s3_bucket.artifacts.bucket}"
    gh variable set AWS_PREVIEW_ROLE_ARN --body "${aws_iam_role.preview.arn}"
    gh variable set AWS_STAGING_ROLE_ARN --body "${aws_iam_role.staging.arn}"
    gh variable set AWS_PRODUCTION_ROLE_ARN --body "${aws_iam_role.production.arn}"
    gh variable set AWS_CLEANUP_ROLE_ARN --body "${aws_iam_role.cleanup.arn}"
    gh variable set PREVIEW_DISTRIBUTION_ID --body "${aws_cloudfront_distribution.preview.id}"
    gh variable set STAGING_DISTRIBUTION_ID --body "${aws_cloudfront_distribution.staging.id}"
    gh variable set PRODUCTION_DISTRIBUTION_ID --body "${aws_cloudfront_distribution.production.id}"
    gh variable set PREVIEW_BASE_DOMAIN --body "${var.preview_subdomain}.${var.apex_domain}"
    gh variable set PRODUCTION_DOMAIN --body "${var.production_host}"
  EOT
}
