output "bucket_name" {
  description = "Created S3 bucket name."
  value       = aws_s3_bucket.sample.bucket
}

output "bucket_arn" {
  description = "Created S3 bucket ARN."
  value       = aws_s3_bucket.sample.arn
}

output "sample_object_s3_uri" {
  description = "S3 URI for the sample object."
  value       = var.create_sample_index ? "s3://${aws_s3_bucket.sample.bucket}/index.html" : null
}

output "website_endpoint" {
  description = "S3 website endpoint, only when enable_public_website=true."
  value       = var.enable_public_website ? aws_s3_bucket_website_configuration.sample[0].website_endpoint : null
}

output "website_url" {
  description = "Public website URL, only when enable_public_website=true."
  value       = var.enable_public_website ? "http://${aws_s3_bucket_website_configuration.sample[0].website_endpoint}" : null
}

output "cost_controls" {
  description = "Cost-control summary for this sample."
  value = {
    cloudfront_created       = false
    iam_roles_created        = false
    oidc_provider_created    = false
    public_website_enabled   = var.enable_public_website
    sample_expiration_days   = var.sample_expiration_days
    force_destroy_on_destroy = true
  }
}
