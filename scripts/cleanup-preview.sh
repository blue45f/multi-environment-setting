#!/usr/bin/env bash
# preview 리소스 정리. (가이드 §10.3 결정 트리)
#   delete <pr> : 그 PR의 S3 prefix + (선택)Amplify branch 삭제
#   sweep       : open PR이 아닌 pr-* prefix를 후보로 잡아 리포트/삭제
#
# 안전 가드:
#   - prefix는 정확히 "<service>/pr-<숫자>/" 형태만 허용 (상위 경로 보호)
#   - sweep는 open PR을 절대 삭제하지 않음
#   - closed 후 GRACE_DAYS가 지나야 삭제 (그 전엔 보존)
#   - 1회 실행당 MAX_DELETIONS 한도 (버그 시 폭발적 삭제 방지)
#   - DRY_RUN=true(기본)면 후보만 리포트
#
# env: ARTIFACT_BUCKET(필수), SERVICE_NAME(기본 web), AMPLIFY_APP_ID(선택)
#      sweep 추가: GH_TOKEN, GH_REPO(owner/repo), DRY_RUN, GRACE_DAYS, MAX_DELETIONS
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-web}"
: "${ARTIFACT_BUCKET:?set ARTIFACT_BUCKET}"
AMPLIFY_APP_ID="${AMPLIFY_APP_ID:-}"

REPORT_DIR="cleanup-report"
mkdir -p "$REPORT_DIR"

# "<service>/pr-<숫자>/" 패턴만 통과
assert_safe_prefix() {
  local prefix="$1"
  local label num
  case "$prefix" in
    "${SERVICE_NAME}/pr-"*/) ;;
    *) echo "refuse unsafe prefix: '$prefix'" >&2; return 1 ;;
  esac
  label="${prefix#"${SERVICE_NAME}"/}" # pr-123/
  label="${label%/}"                   # pr-123
  num="${label#pr-}"                   # 123
  case "$num" in
    '' | *[!0-9]*) echo "refuse non-numeric label: '$label'" >&2; return 1 ;;
  esac
}

epoch_of() { # ISO8601 -> epoch (GNU/BSD 모두 대응)
  local iso="$1"
  date -u -d "$iso" +%s 2>/dev/null || date -u -jf "%Y-%m-%dT%H:%M:%SZ" "$iso" +%s 2>/dev/null || echo ""
}

delete_pr() {
  local pr="$1"
  case "$pr" in '' | *[!0-9]*) echo "PR number must be numeric: '$pr'" >&2; exit 1 ;; esac
  local prefix="${SERVICE_NAME}/pr-${pr}/"
  assert_safe_prefix "$prefix"
  echo "==> delete s3://${ARTIFACT_BUCKET}/${prefix}"
  aws s3 rm "s3://${ARTIFACT_BUCKET}/${prefix}" --recursive
  if [ -n "$AMPLIFY_APP_ID" ]; then
    echo "==> delete amplify branch ${SERVICE_NAME}-pr-${pr} (app ${AMPLIFY_APP_ID})"
    aws amplify delete-branch --app-id "$AMPLIFY_APP_ID" --branch-name "${SERVICE_NAME}-pr-${pr}" || true
  fi
}

sweep() {
  local dry_run="${DRY_RUN:-true}"
  local grace_days="${GRACE_DAYS:-3}"
  local max_del="${MAX_DELETIONS:-20}"
  : "${GH_TOKEN:?sweep는 GH_TOKEN 필요}"
  : "${GH_REPO:?sweep는 GH_REPO 필요 (owner/repo)}"
  local now deleted=0
  now="$(date -u +%s)"

  aws s3 ls "s3://${ARTIFACT_BUCKET}/${SERVICE_NAME}/" \
    | awk '{print $2}' | grep -E '^pr-[0-9]+/$' > "$REPORT_DIR/s3-prefixes.txt" || true
  if ! gh api "repos/${GH_REPO}/pulls?state=open&per_page=100" --paginate --jq '.[].number' \
    > "$REPORT_DIR/open-prs.txt" 2> "$REPORT_DIR/github-open-prs-error.log"; then
    echo "GitHub open PR 목록 조회 실패 — 안전을 위해 sweep 삭제를 중단합니다." >&2
    exit 1
  fi
  : > "$REPORT_DIR/candidates.txt"

  echo "==> sweep (dry_run=${dry_run}, grace_days=${grace_days}, max_deletions=${max_del})"
  while IFS= read -r label_slash; do
    [ -z "$label_slash" ] && continue
    local label num closed_at closed_epoch age_days
    label="${label_slash%/}"   # pr-123
    num="${label#pr-}"         # 123

    if grep -qx "$num" "$REPORT_DIR/open-prs.txt"; then
      continue # open PR → 보존
    fi

    # closed 후 경과일 확인 (grace period)
    if ! closed_at="$(gh api "repos/${GH_REPO}/pulls/${num}" --jq '.closed_at // empty' 2> "$REPORT_DIR/github-pr-${num}-error.log")"; then
      echo "skip pr-${num}: GitHub PR 상태 조회 실패" >&2
      continue
    fi
    if [ -z "$closed_at" ]; then
      echo "skip pr-${num}: closed_at 없음 (상태 불명)"
      continue
    fi
    if [ -n "$closed_at" ]; then
      closed_epoch="$(epoch_of "$closed_at")"
      if [ -n "$closed_epoch" ]; then
        age_days=$(((now - closed_epoch) / 86400))
        if [ "$age_days" -lt "$grace_days" ]; then
          echo "skip pr-${num}: closed ${age_days}d ago (< grace ${grace_days}d)"
          continue
        fi
      fi
    fi

    echo "$label" >> "$REPORT_DIR/candidates.txt"
    if [ "$dry_run" = "true" ]; then
      echo "[dry-run] candidate: pr-${num}"
      continue
    fi
    if [ "$deleted" -ge "$max_del" ]; then
      echo "max deletions (${max_del}) reached — stop"; break
    fi
    delete_pr "$num"
    deleted=$((deleted + 1))
  done < "$REPORT_DIR/s3-prefixes.txt"

  echo "==> sweep done. candidates=$(wc -l < "$REPORT_DIR/candidates.txt" | tr -d ' ') deleted=${deleted}"
}

cmd="${1:-}"
case "$cmd" in
  delete) shift; delete_pr "${1:?usage: cleanup-preview.sh delete <pr_number>}" ;;
  sweep) sweep ;;
  *) echo "usage: cleanup-preview.sh {delete <pr_number>|sweep}" >&2; exit 1 ;;
esac
