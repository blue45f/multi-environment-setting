variable "aws_region" {
  description = "AWS region for the low-cost sample bucket."
  type        = string
  default     = "ap-northeast-2"
}

variable "project_name" {
  description = "Project tag and bucket-name prefix."
  type        = string
  default     = "multi-env-free-sample"

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,40}[a-z0-9]$", var.project_name))
    error_message = "project_name must be 3-42 chars using lowercase letters, numbers, and hyphens."
  }
}

variable "bucket_name" {
  description = "Optional globally unique bucket name. Leave empty to derive one from account and region."
  type        = string
  default     = ""

  validation {
    condition     = var.bucket_name == "" || can(regex("^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$", var.bucket_name))
    error_message = "bucket_name must be a valid S3 bucket name, or empty."
  }
}

variable "enable_public_website" {
  description = "Expose the sample index.html through the S3 static website endpoint. Disabled by default to avoid public access."
  type        = bool
  default     = false
}

variable "create_sample_index" {
  description = "Upload a tiny sample index.html object."
  type        = bool
  default     = true
}

variable "sample_expiration_days" {
  description = "Delete sample objects after this many days to keep storage costs minimal."
  type        = number
  default     = 1

  validation {
    condition     = var.sample_expiration_days >= 1 && var.sample_expiration_days <= 7
    error_message = "sample_expiration_days must be between 1 and 7 for this low-cost sample."
  }
}
