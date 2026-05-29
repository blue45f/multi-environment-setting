terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40.0"
    }
  }

  # 팀/운영: 원격 state(S3 + DynamoDB lock)를 권장한다(기본은 로컬 state).
  # 활성화: `make tf-backend` 로 버킷/락 테이블 생성 + backend.hcl 작성 후,
  #         아래 빈 블록 주석을 해제하고
  #         `terraform init -backend-config=backend.hcl -migrate-state` 실행.
  # backend "s3" {}
}
