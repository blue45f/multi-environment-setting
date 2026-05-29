terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
  }

  # 운영 환경에서는 원격 state backend를 권장한다. 예시:
  # backend "s3" {
  #   bucket         = "web-terraform-state-123456789012"
  #   key            = "multi-environment/terraform.tfstate"
  #   region         = "ap-northeast-2"
  #   dynamodb_table = "terraform-locks"
  #   encrypt        = true
  # }
}
