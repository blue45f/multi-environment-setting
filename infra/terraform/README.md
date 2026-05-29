# Terraform — AWS 인프라 (주 IaC)

정적 프론트엔드 다중 환경의 AWS 베이스라인을 프로비저닝합니다.

## 생성되는 리소스

- **S3 artifact 버킷** 1개 — 암호화·버전관리·수명주기(preview/release 만료), public access 차단, CloudFront OAC로만 읽기 허용 (`s3.tf`).
- **CloudFront 배포 3개** — preview/staging/production (`cloudfront.tf`).
  - preview: 와일드카드(`*.preview.example.com`) + **CloudFront Function**(`functions/preview-router.js`)으로 `pr-<n>` → S3 prefix 라우팅.
  - staging/production: origin path `/web/<env>/current` 고정 + SPA fallback(403/404 → `/index.html`).
- **GitHub OIDC provider + 역할 4개** — preview/staging/production/cleanup. 장기 키 없이 environment claim으로 AssumeRole 제한 (`github-oidc.tf`).
- **ACM 인증서 + Route53 레코드** — `enable_custom_domain = true`일 때만. 인증서는 CloudFront 요구사항에 따라 **us-east-1**(provider alias `aws.us_east_1`)에 생성 (`route53.tf`).

## 사용법

```bash
cp terraform.tfvars.example terraform.tfvars   # 값 채우기 (gitignore됨)
terraform init
terraform plan -out tfplan
terraform apply tfplan
terraform output                                # GitHub 변수에 넣을 값
terraform output -raw gh_variable_commands      # gh CLI 명령 모음
```

실제 값은 `terraform.tfvars`에 두고, `terraform.tfvars.example`만 커밋합니다.

## 파일 구성

| 파일 | 역할 |
| :--- | :--- |
| `versions.tf` | Terraform/Provider 버전 + (주석) 원격 state backend 예시 |
| `variables.tf` | 입력 변수 (여기 + tfvars가 거의 모든 수정 지점) |
| `main.tf` | provider(서울 + us-east-1), locals(버킷명·OIDC sub 등) |
| `github-oidc.tf` | OIDC provider + 역할/정책 4종 |
| `s3.tf` | artifact 버킷 + lifecycle + OAC 버킷 정책 |
| `cloudfront.tf` | OAC, CloudFront Function, 배포 3개, 관리형 cache/보안헤더 정책 |
| `route53.tf` | ACM(us-east-1) + DNS (custom 도메인일 때만) |
| `outputs.tf` | GitHub 변수용 출력값 |
| `functions/preview-router.js` | preview host/path → S3 prefix 라우팅 (CloudFront Function) |

## 도메인 모드

- `enable_custom_domain = false` (기본): CloudFront 기본 도메인(`*.cloudfront.net`)만 출력. 도메인 없이 바로 테스트. preview는 `<cf-domain>/pr-<n>/` (path 기반).
- `enable_custom_domain = true`: `hosted_zone_id`·`apex_domain`·`preview_subdomain`·`staging_host`·`production_host` 필요. preview는 `pr-<n>.preview.example.com` (host 기반).

## 주의

- **OIDC provider는 계정당 1개**만 존재할 수 있습니다. 이미 있으면 `create_oidc_provider = false` 후 한 번 import (자세히는 [SETUP §2.1](../../docs/SETUP.md#21-tfvars-작성--infraterraformterraformtfvars)).
- CloudFront/ACM 변경은 전파에 수 분이 걸릴 수 있습니다.
- state에는 민감 정보가 포함될 수 있으니 팀/운영에서는 원격 backend를 사용하세요: `make tf-backend` → `versions.tf`의 `backend "s3" {}` 주석 해제 → `terraform init -backend-config=backend.hcl -migrate-state` (SETUP §2.5).

자세한 구축 순서와 "어디를 수정하나"는 [docs/SETUP.md](../../docs/SETUP.md)를 보세요.
