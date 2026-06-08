variable "service_name" {
  description = "프로젝트 이름. 공유 artifact 버킷 이름 등 서비스 공통 리소스의 접두사."
  type        = string
  default     = "web"

  validation {
    condition     = can(regex("^[a-z]([a-z0-9-]*[a-z0-9])?$", var.service_name))
    error_message = "service_name은 소문자로 시작하고 소문자/숫자/하이픈만 포함하며 하이픈으로 끝날 수 없습니다."
  }
}

variable "services" {
  description = <<-EOT
    이 저장소가 배포하는 프론트엔드 서비스 목록. 각 서비스는 자체 배포 3종(preview/staging/production)
    + OIDC 역할 4종 + preview 라우팅 Function + S3 prefix(<service>/...)를 가진다.
    앱 추가는 scripts/new-service.sh. 첫 번째 서비스가 'primary'로, custom 도메인이 적용된다(아래 참고).
  EOT
  type        = list(string)
  default     = ["web"]

  validation {
    condition     = length(var.services) > 0
    error_message = "services는 최소 1개여야 합니다."
  }

  validation {
    condition     = alltrue([for s in var.services : can(regex("^[a-z]([a-z0-9-]*[a-z0-9])?$", s))])
    error_message = "services의 각 항목은 소문자로 시작하고 소문자/숫자/하이픈만 포함하며 하이픈으로 끝날 수 없습니다."
  }

  validation {
    condition     = length(distinct(var.services)) == length(var.services)
    error_message = "services에는 중복 서비스명을 넣을 수 없습니다."
  }
}

variable "aws_region" {
  description = "배포 리전. CloudFront/ACM 외의 리소스(S3 등)가 생성되는 리전."
  type        = string
  default     = "ap-northeast-2"
}

# ──────────────────────────────────────────────────────────────────────────
# GitHub OIDC
# ──────────────────────────────────────────────────────────────────────────

variable "github_owner" {
  description = "GitHub 조직/사용자 (예: blue45f)."
  type        = string
}

variable "github_repo" {
  description = "GitHub 저장소 이름 (예: heejun). owner는 github_owner로 분리해서 받는다."
  type        = string
}

variable "create_oidc_provider" {
  description = "계정에 GitHub OIDC provider가 아직 없으면 true. 이미 있으면 false로 두고 import 한다(계정당 1개만 존재 가능)."
  type        = bool
  default     = true
}

variable "github_oidc_thumbprints" {
  description = "GitHub Actions OIDC 루트 CA thumbprint 목록. 최신 IAM OIDC는 이 값을 검증에 사용하지 않지만 리소스 생성에는 필요하다."
  type        = list(string)
  default = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fca"
  ]
}

# ──────────────────────────────────────────────────────────────────────────
# 도메인 / 인증서 (선택)
# ──────────────────────────────────────────────────────────────────────────

variable "enable_custom_domain" {
  description = <<-EOT
    custom 도메인 + ACM 인증서 + Route53 레코드를 생성할지 여부.
    false(기본): CloudFront 기본 도메인(*.cloudfront.net)만 사용. 도메인 없이 바로 테스트 가능.
                 preview는 path 기반(d123.cloudfront.net/pr-123/)으로 접근한다.
    true:        아래 도메인 변수와 hosted_zone_id가 필요하다. preview는 host 기반(pr-123.preview.example.com).
  EOT
  type        = bool
  default     = false
}

variable "apex_domain" {
  description = "루트 도메인 (예: example.com). enable_custom_domain=true일 때만 사용."
  type        = string
  default     = "example.com"
}

variable "preview_subdomain" {
  description = "preview 와일드카드 서브도메인 라벨. 최종 호스트: *.<preview_subdomain>.<apex_domain>"
  type        = string
  default     = "preview"
}

variable "staging_host" {
  description = "staging 호스트명 (예: staging.example.com)."
  type        = string
  default     = "staging.example.com"
}

variable "production_host" {
  description = "production 호스트명 (예: www.example.com)."
  type        = string
  default     = "www.example.com"
}

variable "hosted_zone_id" {
  description = "apex_domain의 Route53 hosted zone ID. enable_custom_domain=true일 때 필수."
  type        = string
  default     = ""
}

# ──────────────────────────────────────────────────────────────────────────
# S3 / 수명주기
# ──────────────────────────────────────────────────────────────────────────

variable "artifact_bucket_name" {
  description = "artifact 버킷 이름. 비우면 '<service>-frontend-artifacts-<account_id>-<region>'로 자동 생성. S3 버킷명은 전역 유일해야 한다."
  type        = string
  default     = ""
}

variable "preview_expiration_days" {
  description = "web/pr-* preview 객체 자동 만료 일수 (cleanup 누락 대비 안전망)."
  type        = number
  default     = 14
}

variable "release_expiration_days" {
  description = "web/*/releases/* 불변 릴리스 객체 보관 일수."
  type        = number
  default     = 90
}

variable "tags" {
  description = "모든 리소스에 붙일 공통 태그."
  type        = map(string)
  default = {
    Project   = "multi-environment-setting"
    ManagedBy = "terraform"
  }
}
