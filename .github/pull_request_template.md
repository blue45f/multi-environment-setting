<!-- 다중 개발 서버 PR 템플릿. 가이드 §14 "PR 완료 기준"을 운영에 강제한다. -->

## 변경 요약

<!-- 무엇을 왜 바꿨는지 1~3줄 -->

## 영향 범위

- 대상 서비스: <!-- web / admin / … (var.services) -->
- 대상 환경: <!-- preview / staging / production -->
- 인프라 변경: <!-- 없음 / Terraform(cloudfront·oidc·s3·route53) / 워크플로 / 스크립트 -->

## Preview

- PR을 열면 `preview.yml`이 서비스마다 배포하고 **PR 코멘트에 preview URL**을 답니다.
- URL이 200으로 열리는지, 의도한 화면/환경(stage)이 맞는지 확인했나요?

## 완료 기준 (가이드 §14)

- [ ] lint · typecheck · test · build 통과 (검증된 artifact만 배포)
- [ ] GitHub Actions가 **OIDC role**로 AWS 접근 — 장기 키 사용 안 함
- [ ] preview URL · source revision · smoke 결과가 PR에 남음
- [ ] HTML/`env.json`은 `no-cache`, 해시 자산은 `immutable` (cache-control 확인)
- [ ] secret이 client bundle · `public/env.*.json` · build log · source map에 **없음**
- [ ] (인프라 변경 시) `terraform validate`/`plan` 검토, 영향 환경 명시
- [ ] PR close 시 `cleanup-preview.yml`이 `<service>/pr-<n>` 정리함을 확인
- [ ] (production) rollback 경로 확인 — 이전 `releases/<sha>`로 복구 가능 (`scripts/rollback.sh`)

## 기타

<!-- 리뷰어가 알아야 할 점, 후속 작업, 롤백 메모 등 -->
