'use client';

import { useState } from 'react';

export default function GeneratorPage() {
  // Developer inputs
  const [serviceName, setServiceName] = useState('web');
  const [awsRegion, setAwsRegion] = useState('ap-northeast-2');
  const [awsAccountId, setAwsAccountId] = useState('123456789012');
  const [githubOwner, setGithubOwner] = useState('your-github-username');
  const [githubRepo, setGithubRepo] = useState('your-repo-name');
  const [enableCustomDomain, setEnableCustomDomain] = useState(false);
  const [apexDomain, setApexDomain] = useState('example.com');
  const [previewSubdomain, setPreviewSubdomain] = useState('preview');
  const [stagingHost, setStagingHost] = useState('staging.example.com');
  const [productionHost, setProductionHost] = useState('www.example.com');
  const [hostedZoneId, setHostedZoneId] = useState('Z0123456789ABCDEFGHIJ');
  const [buildOutputDir, setBuildOutputDir] = useState('out');
  const [packageManager, setPackageManager] = useState('pnpm');

  // Interactive UI states
  const [activeTab, setActiveTab] = useState<'iac' | 'cicd' | 'app' | 'scripts'>('iac');
  const [activeSubTab, setActiveSubTab] = useState<string>('tfvars');
  const [copiedState, setCopiedState] = useState<Record<string, boolean>>({});

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedState((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // S3 Bucket Name
  const bucketName = `${serviceName}-frontend-artifacts-${awsAccountId}-${awsRegion}`;

  // Package manager commands
  const installCmd =
    packageManager === 'pnpm'
      ? 'pnpm install --frozen-lockfile'
      : packageManager === 'yarn'
        ? 'yarn install --frozen-lockfile'
        : 'npm ci';
  const runBuildCmd =
    packageManager === 'pnpm'
      ? 'pnpm build'
      : packageManager === 'yarn'
        ? 'yarn build'
        : 'npm run build';
  const runLintCmd =
    packageManager === 'pnpm'
      ? 'pnpm lint'
      : packageManager === 'yarn'
        ? 'yarn lint'
        : 'npm run lint';
  const runTypecheckCmd =
    packageManager === 'pnpm'
      ? 'pnpm typecheck'
      : packageManager === 'yarn'
        ? 'yarn typecheck'
        : 'npm run typecheck';
  const runTestCmd =
    packageManager === 'pnpm'
      ? 'pnpm test'
      : packageManager === 'yarn'
        ? 'yarn test'
        : 'npm run test';

  // 1. Terraform tfvars
  const tfvarsCode = `# infra/terraform/terraform.tfvars
# 이 파일은 로컬 및 CI 환경의 Terraform 실행 시 참조되는 변수 설정 파일입니다.
# .gitignore에 등록하여 계정 정보와 도메인 등의 민감한 값이 노출되지 않도록 보호하세요.

# OIDC 인증을 연동할 GitHub 정보
github_owner = "${githubOwner}"
github_repo  = "${githubRepo}"

# 서비스 식별명 및 AWS 리전
service_name = "${serviceName}"
aws_region   = "${awsRegion}"
services     = ["${serviceName}"]

# 계정에 이미 GitHub OIDC Provider가 등록되어 있다면 false로 설정한 뒤 import 하세요.
create_oidc_provider = true

# 커스텀 도메인 연동 여부
enable_custom_domain = ${enableCustomDomain}
${
  enableCustomDomain
    ? `
# Route53 및 DNS/ACM 설정 (enable_custom_domain = true 일 때만 활성화)
apex_domain       = "${apexDomain}"
preview_subdomain = "${previewSubdomain}"
staging_host      = "${stagingHost}"
production_host   = "${productionHost}"
hosted_zone_id    = "${hostedZoneId}"
`
    : `
# enable_custom_domain = true 로 전환 시 아래 주석을 해제하고 채우세요.
# apex_domain       = "example.com"
# preview_subdomain = "preview"
# staging_host      = "staging.example.com"
# production_host   = "www.example.com"
# hosted_zone_id    = "Z0123456789ABCDEFGHIJ"
`
}
# 수명주기 설정 (preview는 14일 후 자동 만료, release 이력은 90일 보관)
preview_expiration_days = 14
release_expiration_days = 90
`;

  // 2. CloudFront Function preview-router.js
  const previewRouterCode = `// infra/terraform/functions/preview-router.js
// CloudFront Function (runtime: cloudfront-js-2.0)
// 서비스 '${serviceName}' 의 PR preview 라우팅을 담당합니다.

function handler(event) {
  var SERVICE = "${serviceName}";
  var request = event.request;
  var host = (request.headers.host && request.headers.host.value) || '';
  var label = host.split('.')[0]; // custom 도메인 사용 시 예: "pr-123"

  if (label.indexOf('pr-') !== 0) {
    // 기본 도메인: 경로 첫 세그먼트에서 pr-<n> 추출 (예: /pr-123/about -> label = "pr-123")
    var seg = request.uri.split('/');
    if (seg.length > 1 && seg[1].indexOf('pr-') === 0) {
      label = seg[1];
      var rest = seg.slice(2).join('/');
      request.uri = rest === '' ? '/' : '/' + rest;
    }
  }

  if (label.indexOf('pr-') !== 0) {
    // Next.js static asset의 절대 경로(/_next/...) 처리용 Referer 기반 복원
    var refererLabel = prLabelFromReferer((request.headers.referer && request.headers.referer.value) || '', host);
    if (refererLabel.indexOf('pr-') === 0 && isAllDigits(refererLabel.substring(3))) {
      if (isDocumentRequest(request.uri)) {
        return redirectToPreviewPath(refererLabel, request.uri, request.querystring);
      }
      label = refererLabel;
    }
  }

  var number = label.indexOf('pr-') === 0 ? label.substring(3) : '';
  if (!isAllDigits(number)) {
    return {
      statusCode: 404,
      statusDescription: 'Not Found',
      headers: { 'content-type': { value: 'text/plain' } }
    };
  }

  var uri = request.uri;
  if (endsWithSlash(uri)) {
    uri += 'index.html';
  } else {
    var last = uri.substring(uri.lastIndexOf('/') + 1);
    if (last.indexOf('.') === -1) {
      uri = '/index.html'; // SPA 라우팅 지원을 위해 HTML 확장자가 없으면 index.html로 리다이렉트
    }
  }

  // S3 버킷 내부 실제 경로인 /web/pr-123/index.html 형태로 매핑
  request.uri = '/' + SERVICE + '/' + label + uri;
  return request;
}

function prLabelFromReferer(referer, currentHost) {
  var schemeIndex = referer.indexOf('://');
  if (schemeIndex !== -1) {
    var hostStart = schemeIndex + 3;
    var hostEnd = referer.indexOf('/', hostStart);
    var host = hostEnd === -1 ? referer.substring(hostStart) : referer.substring(hostStart, hostEnd);
    if (host !== currentHost) {
      return '';
    }
    var first = host.split('.')[0];
    if (first.indexOf('pr-') === 0) {
      return first;
    }
    if (hostEnd !== -1) {
      var path = referer.substring(hostEnd);
      if (path.indexOf('/pr-') === 0) {
        var end = path.indexOf('/', 1);
        return end === -1 ? path.substring(1) : path.substring(1, end);
      }
    }
  }
  return '';
}

function isDocumentRequest(uri) {
  if (uri.indexOf('/_next/') === 0) return false;
  if (endsWithSlash(uri)) return true;
  var last = uri.substring(uri.lastIndexOf('/') + 1);
  return last.indexOf('.') === -1;
}

function redirectToPreviewPath(label, uri, querystring) {
  var location = '/' + label + uri;
  if (location.charAt(location.length - 1) !== '/') {
    var last = location.substring(location.lastIndexOf('/') + 1);
    if (last.indexOf('.') === -1) location += '/';
  }
  location += serializeQuerystring(querystring);
  return {
    statusCode: 302,
    statusDescription: 'Found',
    headers: { location: { value: location } }
  };
}

function serializeQuerystring(querystring) {
  if (!querystring) return '';
  var parts = [];
  for (var name in querystring) {
    if (!Object.prototype.hasOwnProperty.call(querystring, name)) continue;
    var item = querystring[name];
    if (item.multiValue) {
      for (var i = 0; i < item.multiValue.length; i++) {
        parts.push(name + '=' + item.multiValue[i].value);
      }
    } else if (item.value === '') {
      parts.push(name);
    } else {
      parts.push(name + '=' + item.value);
    }
  }
  return parts.length === 0 ? '' : '?' + parts.join('&');
}

function endsWithSlash(s) {
  return s.length > 0 && s.charAt(s.length - 1) === '/';
}

function isAllDigits(s) {
  if (s.length === 0) return false;
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 48 || c > 57) return false;
  }
  return true;
}
`;

  // 3. Workflow preview.yml
  const previewWorkflowCode = `# .github/workflows/preview.yml
name: preview

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  id-token: write      # GitHub OIDC 인증 연동 필수 권한
  pull-requests: write # PR 댓글 작성 권한
  deployments: write   # GitHub Deployment 상태 기록 권한

concurrency:
  group: preview-\${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  deploy:
    if: vars.DEPLOY_CONFIG != ''
    strategy:
      fail-fast: false
      matrix:
        service: \${{ fromJSON(vars.SERVICES || '["${serviceName}"]') }}
    runs-on: ubuntu-latest
    environment:
      name: preview
      url: \${{ steps.url.outputs.url }}
    env:
      SERVICE: \${{ matrix.service }}
      APP_DIR: apps/\${{ matrix.service }}
      OUTPUT_DIR: apps/\${{ matrix.service }}/${buildOutputDir}
      PR: \${{ github.event.pull_request.number }}
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - run: corepack enable

      - name: Install dependencies
        working-directory: \${{ env.APP_DIR }}
        run: ${installCmd}

      - name: Code Verification
        working-directory: \${{ env.APP_DIR }}
        run: |
          ${runLintCmd}
          ${runTypecheckCmd}
          ${runTestCmd}

      - name: Build static resources
        working-directory: \${{ env.APP_DIR }}
        run: ${runBuildCmd}

      - name: Inject Preview Config & Metadata
        run: |
          # 빌드 완료 후 preview 전용 설정을 env.json에 덮어씌웁니다. (Build-Once 원칙)
          cp "\${{ env.APP_DIR }}/public/env.preview.json" "\${{ env.OUTPUT_DIR }}/env.json"
          cat > "\${{ env.OUTPUT_DIR }}/deployment.json" <<EOF
          {
            "service": "\${{ env.SERVICE }}",
            "environment": "preview",
            "pullRequest": \${{ env.PR }},
            "sourceRevision": "\${{ github.sha }}",
            "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
          }
          EOF

      - name: Configure AWS Credentials via OIDC
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: \${{ fromJSON(vars.DEPLOY_CONFIG)[\${{ matrix.service }}].preview_role_arn }}
          aws-region: \${{ vars.AWS_REGION }}

      - name: Deploy to S3 (cache-control 분리)
        run: ./scripts/deploy-s3.sh "\${{ env.OUTPUT_DIR }}" "s3://\${{ vars.ARTIFACT_BUCKET }}/\${{ env.SERVICE }}/pr-\${{ env.PR }}"

      - name: Invalidate CloudFront (이 서비스/PR prefix만)
        run: ./scripts/invalidate.sh "\${{ fromJSON(vars.DEPLOY_CONFIG)[\${{ matrix.service }}].preview_distribution_id }}" "/\${{ env.SERVICE }}/pr-\${{ env.PR }}/*"

      - name: Compute Preview URL
        id: url
        env:
          PREVIEW_URL_TEMPLATE: \${{ fromJSON(vars.DEPLOY_CONFIG)[\${{ matrix.service }}].preview_url_template }}
          PREVIEW_CLOUDFRONT_DOMAIN: \${{ fromJSON(vars.DEPLOY_CONFIG)[\${{ matrix.service }}].preview_cloudfront_domain }}
        run: |
          template="\${PREVIEW_URL_TEMPLATE}"
          if [ -z "\${template}" ]; then
            template="https://\${PREVIEW_CLOUDFRONT_DOMAIN}/pr-{pr}/"
          fi
          echo "url=\${template//{pr}/\${{ env.PR }}}" >> "\$GITHUB_OUTPUT"

      - name: Wait for URL
        run: |
          for i in \$(seq 1 30); do
            code=\$(curl -s -o /dev/null -w "%{http_code}" "\${{ steps.url.outputs.url }}" || true)
            if [ "\$code" = "200" ]; then echo "ready"; exit 0; fi
            echo "waiting (\$i): http=\$code"; sleep 5
          done
          echo "URL not ready in time"; exit 1

      - name: Install Playwright browser
        working-directory: \${{ env.APP_DIR }}
        run: pnpm exec playwright install --with-deps chromium

      - name: Deployed URL Smoke & Performance Budget Audit
        working-directory: \${{ env.APP_DIR }}
        run: pnpm exec playwright test tests/smoke --project=chromium
        env:
          BASE_URL: \${{ steps.url.outputs.url }}

      - name: Write PR Comment with Preview URL
        uses: actions/github-script@v9
        env:
          PREVIEW_URL: \${{ steps.url.outputs.url }}
          SERVICE: \${{ matrix.service }}
        with:
          script: |
            const service = process.env.SERVICE;
            const marker = \`<!-- preview-bot-\${service} -->\`;
            const sha = context.sha.slice(0, 7);
            const body = [
              marker,
              \`## 🚀 \\\`\${service}\\\` Preview Environment Deployed\`,
              '',
              '| Name | Target Value |',
              '| --- | --- |',
              \`| **URL** | \${process.env.PREVIEW_URL} |\`,
              \`| **Commit SHA** | \\\`\${sha}\\\` |\`,
              \`| **Lifecycle** | Auto-purged when PR is closed or daily at 3AM KST |\`,
            ].join('\\n');
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            const existing = comments.find((c) => c.body && c.body.includes(marker));
            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner, repo: context.repo.repo,
                comment_id: existing.id, body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner, repo: context.repo.repo,
                issue_number: context.issue.number, body,
              });
            }
`;

  // 4. Workflow deploy.yml
  const deployWorkflowCode = `# .github/workflows/deploy.yml
name: deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      target:
        description: 'Target deployment environment'
        type: choice
        options: [staging, production]
        default: staging

permissions:
  contents: read
  id-token: write
  deployments: write

concurrency:
  group: deploy-\${{ github.ref }}
  cancel-in-progress: false

jobs:
  # ── 1) Build once & Store as GitHub Artifact ──────────────────────────
  build:
    if: vars.DEPLOY_CONFIG != ''
    strategy:
      fail-fast: false
      matrix:
        service: \${{ fromJSON(vars.SERVICES || '["${serviceName}"]') }}
    runs-on: ubuntu-latest
    env:
      APP_DIR: apps/\${{ matrix.service }}
      OUTPUT_DIR: apps/\${{ matrix.service }}/${buildOutputDir}
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - run: corepack enable

      - name: Install dependencies
        working-directory: \${{ env.APP_DIR }}
        run: ${installCmd}

      - name: Verify code quality
        working-directory: \${{ env.APP_DIR }}
        run: |
          ${runLintCmd}
          ${runTypecheckCmd}
          ${runTestCmd}

      - name: Build static output
        working-directory: \${{ env.APP_DIR }}
        run: ${runBuildCmd}

      - name: Package build output & Generate checksum
        run: |
          tar -czf app.tar.gz -C "\${{ env.OUTPUT_DIR }}" .
          sha256sum app.tar.gz > app.tar.gz.sha256

      - uses: actions/upload-artifact@v7
        with:
          name: frontend-\${{ matrix.service }}-\${{ github.sha }}
          path: |
            app.tar.gz
            app.tar.gz.sha256
          retention-days: 14

  # ── 2) Deploy to Staging ──────────────────────────────────────────────
  deploy-staging:
    needs: build
    if: \${{ vars.DEPLOY_CONFIG != '' && (github.event_name == 'push' || inputs.target == 'staging' || inputs.target == 'production') }}
    strategy:
      fail-fast: false
      matrix:
        service: \${{ fromJSON(vars.SERVICES || '["${serviceName}"]') }}
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://\${{ fromJSON(vars.DEPLOY_CONFIG)[matrix.service].staging_cloudfront_domain }}/
    env:
      SERVICE: \${{ matrix.service }}
      APP_DIR: apps/\${{ matrix.service }}
      OUTPUT_DIR: apps/\${{ matrix.service }}/${buildOutputDir}
    steps:
      - uses: actions/checkout@v6
      - uses: actions/download-artifact@v8
        with:
          name: frontend-\${{ matrix.service }}-\${{ github.sha }}

      - name: Unpack build & Inject Staging runtime config
        run: |
          sha256sum -c app.tar.gz.sha256
          ARTIFACT_SHA256="\$(cut -d ' ' -f1 app.tar.gz.sha256)"
          mkdir -p "\${{ env.OUTPUT_DIR }}"
          tar -xzf app.tar.gz -C "\${{ env.OUTPUT_DIR }}"
          # Build-Once 원칙: 릴리스 전용 staging 설정을 복사
          cp "\${{ env.APP_DIR }}/public/env.staging.json" "\${{ env.OUTPUT_DIR }}/env.json"
          cat > "\${{ env.OUTPUT_DIR }}/deployment.json" <<EOF
          {
            "service": "\${{ env.SERVICE }}",
            "environment": "staging",
            "sourceRevision": "\${{ github.sha }}",
            "artifactSha256": "\${ARTIFACT_SHA256}",
            "deployedAt": "\$(date -u +%Y-%m-%dT%H:%M:%SZ)"
          }
          EOF

      - name: Configure AWS credentials via OIDC (Staging role)
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: \${{ fromJSON(vars.DEPLOY_CONFIG)[matrix.service].staging_role_arn }}
          aws-region: \${{ vars.AWS_REGION }}

      - name: Upload Release & Promote Staging current
        run: |
          BASE="s3://\${{ vars.ARTIFACT_BUCKET }}/\${{ env.SERVICE }}/staging"
          ./scripts/deploy-s3.sh "\${{ env.OUTPUT_DIR }}" "\${BASE}/releases/\${{ github.sha }}"
          ./scripts/promote.sh "\${BASE}/releases/\${{ github.sha }}" "\${BASE}/current"

      - name: CDN invalidation (entry/config files only)
        run: ./scripts/invalidate.sh "\${{ fromJSON(vars.DEPLOY_CONFIG)[matrix.service].staging_distribution_id }}" "/index.html" "/env.json" "/deployment.json"

      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - run: corepack enable

      - name: Install dependencies (Smoke check)
        working-directory: \${{ env.APP_DIR }}
        run: ${installCmd}

      - name: Install Playwright
        working-directory: \${{ env.APP_DIR }}
        run: pnpm exec playwright install --with-deps chromium

      - name: Execute Smoke tests on Staging URL
        working-directory: \${{ env.APP_DIR }}
        run: pnpm exec playwright test tests/smoke --project=chromium
        env:
          BASE_URL: https://\${{ fromJSON(vars.DEPLOY_CONFIG)[matrix.service].staging_cloudfront_domain }}/

  # ── 3) Deploy to Production (Waits for Environment Approval Gate) ─────
  deploy-production:
    needs: [build, deploy-staging]
    if: \${{ vars.DEPLOY_CONFIG != '' && (github.event_name == 'push' || inputs.target == 'production') }}
    strategy:
      fail-fast: false
      matrix:
        service: \${{ fromJSON(vars.SERVICES || '["${serviceName}"]') }}
    runs-on: ubuntu-latest
    environment:
      name: production # settings -> environments 에서 required reviewers를 매핑하면 승인 게이트로 작동합니다.
      url: https://\${{ fromJSON(vars.DEPLOY_CONFIG)[matrix.service].production_cloudfront_domain }}/
    env:
      SERVICE: \${{ matrix.service }}
      APP_DIR: apps/\${{ matrix.service }}
      OUTPUT_DIR: apps/\${{ matrix.service }}/${buildOutputDir}
    steps:
      - uses: actions/checkout@v6
      - uses: actions/download-artifact@v8
        with:
          name: frontend-\${{ matrix.service }}-\${{ github.sha }}

      - name: Unpack build & Inject Production runtime config
        run: |
          sha256sum -c app.tar.gz.sha256
          ARTIFACT_SHA256="\$(cut -d ' ' -f1 app.tar.gz.sha256)"
          mkdir -p "\${{ env.OUTPUT_DIR }}"
          tar -xzf app.tar.gz -C "\${{ env.OUTPUT_DIR }}"
          # Build-Once 원칙: 릴리스 전용 production 설정을 복사
          cp "\${{ env.APP_DIR }}/public/env.production.json" "\${{ env.OUTPUT_DIR }}/env.json"
          cat > "\${{ env.OUTPUT_DIR }}/deployment.json" <<EOF
          {
            "service": "\${{ env.SERVICE }}",
            "environment": "production",
            "sourceRevision": "\${{ github.sha }}",
            "artifactSha256": "\${ARTIFACT_SHA256}",
            "deployedAt": "\$(date -u +%Y-%m-%dT%H:%M:%SZ)"
          }
          EOF

      - name: Configure AWS credentials via OIDC (Production role)
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: \${{ fromJSON(vars.DEPLOY_CONFIG)[matrix.service].production_role_arn }}
          aws-region: \${{ vars.AWS_REGION }}

      - name: Upload Release & Promote Production current
        run: |
          BASE="s3://\${{ vars.ARTIFACT_BUCKET }}/\${{ env.SERVICE }}/production"
          ./scripts/deploy-s3.sh "\${{ env.OUTPUT_DIR }}" "\${BASE}/releases/\${{ github.sha }}"
          ./scripts/promote.sh "\${BASE}/releases/\${{ github.sha }}" "\${BASE}/current"

      - name: CDN invalidation (entry/config files only)
        run: ./scripts/invalidate.sh "\${{ fromJSON(vars.DEPLOY_CONFIG)[matrix.service].production_distribution_id }}" "/index.html" "/env.json" "/deployment.json"

      - uses: actions/setup-node@v6
        with:
          node-version-file: .nvmrc
      - run: corepack enable

      - name: Install dependencies (Smoke check)
        working-directory: \${{ env.APP_DIR }}
        run: ${installCmd}

      - name: Install Playwright
        working-directory: \${{ env.APP_DIR }}
        run: pnpm exec playwright install --with-deps chromium

      - name: Execute Smoke tests on Production URL
        working-directory: \${{ env.APP_DIR }}
        run: pnpm exec playwright test tests/smoke --project=chromium
        env:
          BASE_URL: https://\${{ fromJSON(vars.DEPLOY_CONFIG)[matrix.service].production_cloudfront_domain }}/
`;

  // 5. Workflow cleanup-preview.yml
  const cleanupWorkflowCode = `# .github/workflows/cleanup-preview.yml
name: cleanup-preview

on:
  pull_request:
    types: [closed]
  schedule:
    - cron: '0 18 * * *' # 매일 한국 시간 03:00 (18:00 UTC) 실행

permissions:
  contents: read
  id-token: write
  pull-requests: write

jobs:
  cleanup:
    if: vars.DEPLOY_CONFIG != ''
    strategy:
      fail-fast: false
      matrix:
        service: \${{ fromJSON(vars.SERVICES || '["${serviceName}"]') }}
    runs-on: ubuntu-latest
    env:
      SERVICE: \${{ matrix.service }}
    steps:
      - uses: actions/checkout@v6

      - name: Configure AWS Credentials (Cleanup role)
        uses: aws-actions/configure-aws-credentials@v6
        with:
          role-to-assume: \${{ fromJSON(vars.DEPLOY_CONFIG)[\${{ matrix.service }}].cleanup_role_arn }}
          aws-region: \${{ vars.AWS_REGION }}

      - name: PR Closed - Delete Specific Preview Prefix
        if: github.event_name == 'pull_request'
        run: |
          # 닫힌 특정 PR의 S3 prefix만 안전하게 즉시 영구 삭제합니다.
          ./scripts/cleanup-preview.sh delete "\${{ github.event.pull_request.number }}"

      - name: Nightly Sweeper - Clean Orphan Previews
        if: github.event_name == 'schedule'
        env:
          GH_TOKEN: \${{ github.token }}
          GH_REPO: \${{ github.repository }}
        run: |
          # schedule 실행 시 닫힌 PR 목록과 대조하여 orphan prefix 리소스를 일괄 자동 정리합니다.
          # Grace period는 2일(48시간)로 설정하여 방금 닫힌 리소스는 잠시 대기
          DRY_RUN=false GRACE_DAYS=2 ./scripts/cleanup-preview.sh sweep
`;

  // 6. env.schema.ts
  const envSchemaCode = `// apps/${serviceName}/env.schema.ts
import { z } from 'zod';

// 브라우저 런타임에 동적으로 주입받아 사용할 환경 변수 목록의 스키마입니다.
// 빌드 타임의 process.env를 통하지 않고, public/env.json 요청에 의해 동적으로 로드됩니다.
export const runtimeConfigSchema = z.object({
  stage: z.enum(['preview', 'staging', 'production']),
  apiBaseUrl: z.string().url(),
  sentryEnvironment: z.string(),
  featureFlagClientKey: z.string(),
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
`;

  // 7. runtime-config.ts
  const runtimeConfigCode = `// apps/${serviceName}/src/lib/runtime-config.ts
'use client';

import { useEffect, useState } from 'react';
import { runtimeConfigSchema, type RuntimeConfig } from '../../env.schema';

let cachedPromise: Promise<RuntimeConfig> | null = null;

// 요청을 발생시킬 env.json의 URL을 동적으로 결정합니다.
function getRuntimeConfigUrl(): string {
  if (typeof window === 'undefined') {
    return '/env.json';
  }

  // CloudFront 기본 도메인의 path preview 라우팅을 고려합니다.
  // /pr-123/about 과 같은 경로의 경우, /env.json이 아니라 /pr-123/env.json에서 설정을 가져와야 합니다.
  const pathPreviewMatch = window.location.pathname.match(/^\\/(pr-\\d+)(?:\\/|\$)/);
  if (pathPreviewMatch) {
    return \`/\${pathPreviewMatch[1]}/env.json\`;
  }

  // custom-domain preview 및 staging/production 은 루트의 /env.json을 사용합니다.
  return '/env.json';
}

export function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (!cachedPromise) {
    const url = getRuntimeConfigUrl();
    cachedPromise = fetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(\`Failed to fetch runtime config (\${url}): \${res.status}\`);
        }
        return res.json();
      })
      .then((json) => runtimeConfigSchema.parse(json))
      .catch((err) => {
        cachedPromise = null; // 실패 시 다음 호출이 재시도할 수 있도록 캐시 무효화
        throw err;
      });
  }
  return cachedPromise;
}

export function useRuntimeConfig() {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    loadRuntimeConfig()
      .then((c) => {
        if (active) setConfig(c);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      active = false;
    };
  }, []);

  return { config, error };
}
`;

  // 8. public env json templates
  const envPreviewJson = `{
  "stage": "preview",
  "apiBaseUrl": "https://sandbox-api.example.com",
  "sentryEnvironment": "frontend-preview",
  "featureFlagClientKey": "sdk_preview_mock_key_123"
}`;

  const envStagingJson = `{
  "stage": "staging",
  "apiBaseUrl": "https://staging-api.example.com",
  "sentryEnvironment": "frontend-staging",
  "featureFlagClientKey": "sdk_staging_validated_key_456"
}`;

  const envProductionJson = `{
  "stage": "production",
  "apiBaseUrl": "https://api.example.com",
  "sentryEnvironment": "frontend-production",
  "featureFlagClientKey": "sdk_production_secure_key_789"
}`;

  // 9. Makefile
  const makefileCode = `# Makefile
# 프론트엔드 다중 개발 환경 구축 및 관리 자동화 명령 단일 진입점

SERVICE ?= ${serviceName}
ENV     ?= preview
APP_DIR := apps/\$(SERVICE)
TF_DIR  := infra/terraform

.DEFAULT_GOAL := help
.PHONY: help preflight bootstrap tf-init tf-plan tf-apply tf-output tf-backend gh-setup verify e2e-local rollback destroy

help: ## 명령 도움말 목록 출력
\t@grep -E '^[a-zA-Z0-9_-]+:.*## ' \$(MAKEFILE_LIST) | sed -E 's/:[^#]*## /  →  /'

preflight: ## AWS CLI / GH CLI 설치 및 인증 상태 사전 검증
\t@./scripts/preflight.sh

bootstrap: ## 원커맨드 구축 (preflight → terraform apply → GitHub 연동 설정)
\t@./scripts/bootstrap.sh

tf-init: ## terraform 초기화
\tterraform -chdir=\$(TF_DIR) init

tf-plan: ## 생성될 AWS 리소스 모의 계획 검토
\tterraform -chdir=\$(TF_DIR) plan

tf-apply: ## 실제 AWS 리소스 생성 실행
\tterraform -chdir=\$(TF_DIR) apply

tf-output: ## terraform output 출력
\tterraform -chdir=\$(TF_DIR) output

tf-backend: ## (협업용) 원격 state 관리를 위한 S3 + DynamoDB 자동 프로비저닝
\t@./scripts/tf-backend.sh

gh-setup: ## Terraform 출력을 GitHub variables 및 environments로 연동 (PROD_REVIEWER=로그인ID 선택)
\t@./scripts/gh-setup.sh

verify: ## 로컬 통합 정적 품질 검증 (lint + typecheck + unit test + tf validate)
\t@./scripts/verify.sh

e2e-local: ## AWS 계정 없이 로컬 빌드 후 정적 서버 구동 및 smoke / 성능 예산 검사 (ENV=preview|staging|production)
\t@APP_DIR=\$(APP_DIR) ./scripts/e2e-local.sh \$(ENV)

rollback: ## 장애 대응 긴급 롤백 (ENV=production SHA=<commit_sha> DIST=<cloudfront_id>)
\tARTIFACT_BUCKET=\$\$(terraform -chdir=\$(TF_DIR) output -raw artifact_bucket) SERVICE_NAME=\$(SERVICE) \\
\t  ./scripts/rollback.sh \$(ENV) \$(SHA) \$(DIST)

destroy: ## 모든 프로비저닝된 인프라 리소스 일괄 삭제 (주의)
\tterraform -chdir=\$(TF_DIR) destroy
`;

  // 10. deploy-s3.sh
  const deployS3Code = `#!/usr/bin/env bash
# scripts/deploy-s3.sh
# 정적 리소스 파일의 확장자에 맞게 최적의 Cache-Control 메타데이터를 포함해 S3 버킷으로 업로드합니다.
set -euo pipefail

SRC_DIR="\${1:-}"
DEST_S3_URI="\${2:-}"

if [ -z "\${SRC_DIR}" ] || [ -z "\${DEST_S3_URI}" ]; then
  echo "Usage: ./deploy-s3.sh <local_src_dir> <dest_s3_uri>"
  exit 1
fi

echo "🚀 Starting cache-optimized sync from \${SRC_DIR} to \${DEST_S3_URI}..."

# 1) Immutable Assets 업로드 (해시명이 포함된 정적 자산들: _next/static, static/media 등)
# 1년 캐시 유지 및 클라이언트 재조회 생략
echo "📦 Uploading immutable assets (_next/static/...) with infinite cache..."
aws s3 sync "\${SRC_DIR}" "\${DEST_S3_URI}" \\
  --exclude "*" \\
  --include "_next/static/*" \\
  --include "static/*" \\
  --cache-control "public,max-age=31536000,immutable" \\
  --delete

# 2) Entry/Config Files 업로드 (index.html, env.json, deployment.json 등)
# CDN 및 브라우저는 즉시 항상 오리진(S3)을 대조하여 갱신 여부를 확인해야 함 (no-cache)
echo "📄 Uploading configuration files and entry HTMLs with no-cache rules..."
aws s3 sync "\${SRC_DIR}" "\${DEST_S3_URI}" \\
  --exclude "_next/static/*" \\
  --exclude "static/*" \\
  --exclude "env.*.json" \\
  --exclude "*.map" \\
  --cache-control "public,max-age=0,must-revalidate" \\
  --delete

echo "✅ Cache-optimized deployment completed successfully!"
`;

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100vh', color: 'var(--app-ink)' }}>
      {/* Page Hero */}
      <section
        className="guide-page-hero"
        aria-labelledby="generator-title"
        style={{ paddingBottom: '30px' }}
      >
        <p className="eyebrow" style={{ color: 'var(--app-accent)' }}>
          Interactive Architect Tool
        </p>
        <h1 id="generator-title" style={{ fontWeight: 900 }}>
          아키텍처 설계 제너레이터
        </h1>
        <p>
          본인의 프로젝트 정보와 AWS/GitHub 환경 설정값을 아래 폼에 입력하면, **멀티베타 환경 구축에
          완벽하게 일치하는 Terraform, GitHub Actions 설정 및 애플리케이션 코드**를 실시간으로
          커스텀 생성해 드립니다. 복사해서 사용하세요.
        </p>
      </section>

      {/* Main Grid: Inputs vs Outputs */}
      <section
        style={{
          width: 'min(1180px, calc(100% - clamp(32px, 7vw, 96px)))',
          marginInline: 'auto',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '30px',
          paddingBottom: '80px',
        }}
      >
        {/* Dynamic Architectural Routing Map Card */}
        <div
          style={{
            background: 'var(--app-panel)',
            border: '1px solid var(--app-line-strong)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: 'var(--app-shadow)',
          }}
        >
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--app-ink)',
            }}
          >
            ⚙️ 커스텀 실시간 라우팅 흐름도
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--app-ink-muted)' }}>
            입력한 정보를 기반으로 트래픽 흐름 및 S3 경로가 어떻게 생성되는지 시각화한 맵입니다.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
              position: 'relative',
            }}
          >
            {/* PR Preview Block */}
            <div
              style={{
                background: 'var(--stage-preview-bg)',
                border: '1px solid var(--stage-preview)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <span
                className="stage-badge"
                style={{
                  background: 'var(--stage-preview-bg)',
                  borderColor: 'var(--stage-preview)',
                  color: 'var(--stage-preview-fg)',
                  marginBottom: '10px',
                }}
              >
                <span className="stage-badge__mark" style={{ background: 'var(--stage-preview)' }}>
                  ◆
                </span>
                <span className="mono" style={{ fontSize: '11px', fontWeight: 800 }}>
                  PR PREVIEW
                </span>
              </span>
              <div style={{ marginTop: '8px', fontSize: '13px' }}>
                <strong style={{ display: 'block', color: 'var(--app-ink)' }}>접속 URL:</strong>
                <code
                  style={{
                    display: 'block',
                    padding: '4px 6px',
                    background: 'var(--app-panel-2)',
                    borderRadius: '4px',
                    margin: '4px 0',
                    fontSize: '12px',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {enableCustomDomain
                    ? `https://pr-123.${previewSubdomain}.${apexDomain}/`
                    : `https://[CF_DOMAIN]/pr-123/`}
                </code>
                <strong style={{ display: 'block', color: 'var(--app-ink)', marginTop: '8px' }}>
                  실제 S3 파일 위치:
                </strong>
                <code
                  style={{
                    display: 'block',
                    padding: '4px 6px',
                    background: 'var(--app-panel-2)',
                    borderRadius: '4px',
                    margin: '4px 0',
                    fontSize: '11px',
                    overflowWrap: 'anywhere',
                  }}
                >
                  s3://{bucketName}/{serviceName}/pr-123/
                </code>
              </div>
            </div>

            {/* Staging Block */}
            <div
              style={{
                background: 'var(--stage-staging-bg)',
                border: '1px solid var(--stage-staging)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <span
                className="stage-badge"
                style={{
                  background: 'var(--stage-staging-bg)',
                  borderColor: 'var(--stage-staging)',
                  color: 'var(--stage-staging-fg)',
                  marginBottom: '10px',
                }}
              >
                <span className="stage-badge__mark" style={{ background: 'var(--stage-staging)' }}>
                  ▲
                </span>
                <span className="mono" style={{ fontSize: '11px', fontWeight: 800 }}>
                  STAGING
                </span>
              </span>
              <div style={{ marginTop: '8px', fontSize: '13px' }}>
                <strong style={{ display: 'block', color: 'var(--app-ink)' }}>접속 URL:</strong>
                <code
                  style={{
                    display: 'block',
                    padding: '4px 6px',
                    background: 'var(--app-panel-2)',
                    borderRadius: '4px',
                    margin: '4px 0',
                    fontSize: '12px',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {enableCustomDomain ? `https://${stagingHost}/` : `https://[STAGING_CF_DOMAIN]/`}
                </code>
                <strong style={{ display: 'block', color: 'var(--app-ink)', marginTop: '8px' }}>
                  실제 S3 파일 위치:
                </strong>
                <code
                  style={{
                    display: 'block',
                    padding: '4px 6px',
                    background: 'var(--app-panel-2)',
                    borderRadius: '4px',
                    margin: '4px 0',
                    fontSize: '11px',
                    overflowWrap: 'anywhere',
                  }}
                >
                  s3://{bucketName}/{serviceName}/staging/current/
                </code>
              </div>
            </div>

            {/* Production Block */}
            <div
              style={{
                background: 'var(--stage-production-bg)',
                border: '1px solid var(--stage-production)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <span
                className="stage-badge"
                style={{
                  background: 'var(--stage-production-bg)',
                  borderColor: 'var(--stage-production)',
                  color: 'var(--stage-production-fg)',
                  marginBottom: '10px',
                }}
              >
                <span
                  className="stage-badge__mark"
                  style={{ background: 'var(--stage-production)' }}
                >
                  ●
                </span>
                <span className="mono" style={{ fontSize: '11px', fontWeight: 800 }}>
                  PRODUCTION
                </span>
              </span>
              <div style={{ marginTop: '8px', fontSize: '13px' }}>
                <strong style={{ display: 'block', color: 'var(--app-ink)' }}>접속 URL:</strong>
                <code
                  style={{
                    display: 'block',
                    padding: '4px 6px',
                    background: 'var(--app-panel-2)',
                    borderRadius: '4px',
                    margin: '4px 0',
                    fontSize: '12px',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {enableCustomDomain ? `https://${productionHost}/` : `https://[PROD_CF_DOMAIN]/`}
                </code>
                <strong style={{ display: 'block', color: 'var(--app-ink)', marginTop: '8px' }}>
                  실제 S3 파일 위치:
                </strong>
                <code
                  style={{
                    display: 'block',
                    padding: '4px 6px',
                    background: 'var(--app-panel-2)',
                    borderRadius: '4px',
                    margin: '4px 0',
                    fontSize: '11px',
                    overflowWrap: 'anywhere',
                  }}
                >
                  s3://{bucketName}/{serviceName}/production/current/
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Outer Split Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)',
            gap: '30px',
          }}
          className="generator-split-container"
        >
          {/* LEFT: Inputs Form */}
          <div
            style={{
              background: 'var(--app-panel)',
              border: '1px solid var(--app-line-strong)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: 'var(--app-shadow)',
              height: 'fit-content',
            }}
          >
            <h3
              style={{
                margin: '0 0 18px',
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--app-ink)',
              }}
            >
              📝 프로젝트 환경 설정값 입력
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Service Identifier */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '4px',
                    color: 'var(--app-ink-muted)',
                  }}
                >
                  서비스명 (Service Name)
                </label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) =>
                    setServiceName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--app-line-strong)',
                    background: 'var(--app-bg)',
                    color: 'var(--app-ink)',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                  placeholder="예: web, admin, app"
                />
              </div>

              {/* AWS Account ID */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '4px',
                    color: 'var(--app-ink-muted)',
                  }}
                >
                  AWS 계정 ID (Account ID)
                </label>
                <input
                  type="text"
                  value={awsAccountId}
                  onChange={(e) => setAwsAccountId(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={12}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--app-line-strong)',
                    background: 'var(--app-bg)',
                    color: 'var(--app-ink)',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                  placeholder="12자리 숫자"
                />
              </div>

              {/* AWS Region */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '4px',
                    color: 'var(--app-ink-muted)',
                  }}
                >
                  AWS 리전 (Region)
                </label>
                <select
                  value={awsRegion}
                  onChange={(e) => setAwsRegion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--app-line-strong)',
                    background: 'var(--app-bg)',
                    color: 'var(--app-ink)',
                    fontSize: '14px',
                  }}
                >
                  <option value="ap-northeast-2">ap-northeast-2 (서울)</option>
                  <option value="us-east-1">us-east-1 (버진아시아 북부)</option>
                  <option value="ap-northeast-1">ap-northeast-1 (도쿄)</option>
                  <option value="us-west-2">us-west-2 (오레곤)</option>
                </select>
              </div>

              {/* GitHub Owner */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '4px',
                    color: 'var(--app-ink-muted)',
                  }}
                >
                  GitHub Org/사용자명
                </label>
                <input
                  type="text"
                  value={githubOwner}
                  onChange={(e) => setGithubOwner(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--app-line-strong)',
                    background: 'var(--app-bg)',
                    color: 'var(--app-ink)',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                  placeholder="GitHub Username"
                />
              </div>

              {/* GitHub Repo */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '4px',
                    color: 'var(--app-ink-muted)',
                  }}
                >
                  GitHub 저장소명
                </label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--app-line-strong)',
                    background: 'var(--app-bg)',
                    color: 'var(--app-ink)',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                  placeholder="repository-name"
                />
              </div>

              {/* Build output dir */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '4px',
                    color: 'var(--app-ink-muted)',
                  }}
                >
                  빌드 출력 폴더 (Next.js static export 기준)
                </label>
                <input
                  type="text"
                  value={buildOutputDir}
                  onChange={(e) => setBuildOutputDir(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--app-line-strong)',
                    background: 'var(--app-bg)',
                    color: 'var(--app-ink)',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                  }}
                  placeholder="out"
                />
              </div>

              {/* Package Manager */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '4px',
                    color: 'var(--app-ink-muted)',
                  }}
                >
                  패키지 매니저
                </label>
                <select
                  value={packageManager}
                  onChange={(e) => setPackageManager(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--app-line-strong)',
                    background: 'var(--app-bg)',
                    color: 'var(--app-ink)',
                    fontSize: '14px',
                  }}
                >
                  <option value="pnpm">pnpm</option>
                  <option value="npm">npm</option>
                  <option value="yarn">yarn</option>
                </select>
              </div>

              {/* Custom Domain Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  borderTop: '1px solid var(--app-line)',
                  paddingTop: '14px',
                  marginTop: '6px',
                }}
              >
                <input
                  type="checkbox"
                  id="enable_domain_check"
                  checked={enableCustomDomain}
                  onChange={(e) => setEnableCustomDomain(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: 'var(--app-accent)',
                    cursor: 'pointer',
                  }}
                />
                <label
                  htmlFor="enable_domain_check"
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    color: 'var(--app-ink)',
                  }}
                >
                  커스텀 도메인 활성화
                </label>
              </div>

              {/* Custom Domain Fields */}
              {enableCustomDomain && (
                <div
                  style={{
                    background: 'var(--app-panel-2)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    border: '1px solid var(--app-line)',
                  }}
                >
                  {/* Apex Domain */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        marginBottom: '2px',
                        color: 'var(--app-ink-subtle)',
                      }}
                    >
                      Apex 루트 도메인
                    </label>
                    <input
                      type="text"
                      value={apexDomain}
                      onChange={(e) => setApexDomain(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--app-line-strong)',
                        background: 'var(--app-bg)',
                        color: 'var(--app-ink)',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                      }}
                      placeholder="example.com"
                    />
                  </div>

                  {/* Route53 Hosted Zone ID */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        marginBottom: '2px',
                        color: 'var(--app-ink-subtle)',
                      }}
                    >
                      Route53 호스팅 영역 ID
                    </label>
                    <input
                      type="text"
                      value={hostedZoneId}
                      onChange={(e) => setHostedZoneId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--app-line-strong)',
                        background: 'var(--app-bg)',
                        color: 'var(--app-ink)',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                      }}
                      placeholder="Z0123456789ABCDEFGHIJ"
                    />
                  </div>

                  {/* Preview Subdomain */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        marginBottom: '2px',
                        color: 'var(--app-ink-subtle)',
                      }}
                    >
                      Preview 서브도메인 프리픽스
                    </label>
                    <input
                      type="text"
                      value={previewSubdomain}
                      onChange={(e) => setPreviewSubdomain(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--app-line-strong)',
                        background: 'var(--app-bg)',
                        color: 'var(--app-ink)',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                      }}
                      placeholder="preview (-> *.preview.domain)"
                    />
                  </div>

                  {/* Staging Host */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        marginBottom: '2px',
                        color: 'var(--app-ink-subtle)',
                      }}
                    >
                      Staging 호스트 도메인
                    </label>
                    <input
                      type="text"
                      value={stagingHost}
                      onChange={(e) => setStagingHost(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--app-line-strong)',
                        background: 'var(--app-bg)',
                        color: 'var(--app-ink)',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                      }}
                      placeholder="staging.example.com"
                    />
                  </div>

                  {/* Production Host */}
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        marginBottom: '2px',
                        color: 'var(--app-ink-subtle)',
                      }}
                    >
                      Production 호스트 도메인
                    </label>
                    <input
                      type="text"
                      value={productionHost}
                      onChange={(e) => setProductionHost(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--app-line-strong)',
                        background: 'var(--app-bg)',
                        color: 'var(--app-ink)',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                      }}
                      placeholder="www.example.com"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Generated Code Outputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: '2px solid var(--app-line)',
                gap: '6px',
                paddingBottom: '2px',
                overflowX: 'auto',
              }}
            >
              {(['iac', 'cicd', 'app', 'scripts'] as const).map((tab) => {
                const label =
                  tab === 'iac'
                    ? '🌐 IaC (Terraform)'
                    : tab === 'cicd'
                      ? '🤖 CI/CD (GitHub)'
                      : tab === 'app'
                        ? '💻 App Config (Zod)'
                        : '📜 Scripts & CLI';
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      // Set default subtabs when switching tabs
                      if (tab === 'iac') setActiveSubTab('tfvars');
                      else if (tab === 'cicd') setActiveSubTab('preview_yml');
                      else if (tab === 'app') setActiveSubTab('schema');
                      else if (tab === 'scripts') setActiveSubTab('makefile');
                    }}
                    style={{
                      padding: '10px 16px',
                      border: 'none',
                      background: 'none',
                      color: active ? 'var(--app-accent)' : 'var(--app-ink-muted)',
                      fontSize: '14px',
                      fontWeight: active ? 850 : 700,
                      cursor: 'pointer',
                      borderBottom: active ? '3px solid var(--app-focus)' : '3px solid transparent',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                      marginBottom: '-2px',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Sub Tabs Container */}
            <div
              style={{
                background: 'var(--app-panel)',
                border: '1px solid var(--app-line-strong)',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: 'var(--app-shadow)',
              }}
            >
              {/* Subtabs selectors */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px',
                  borderBottom: '1px solid var(--app-line)',
                  paddingBottom: '12px',
                  overflowX: 'auto',
                }}
              >
                {activeTab === 'iac' && (
                  <>
                    <button
                      onClick={() => setActiveSubTab('tfvars')}
                      className={`mono ${activeSubTab === 'tfvars' ? 'active-subtab' : 'inactive-subtab'}`}
                    >
                      terraform.tfvars
                    </button>
                    <button
                      onClick={() => setActiveSubTab('router')}
                      className={`mono ${activeSubTab === 'router' ? 'active-subtab' : 'inactive-subtab'}`}
                    >
                      preview-router.js
                    </button>
                  </>
                )}
                {activeTab === 'cicd' && (
                  <>
                    <button
                      onClick={() => setActiveSubTab('preview_yml')}
                      className={`mono ${activeSubTab === 'preview_yml' ? 'active-subtab' : 'inactive-subtab'}`}
                    >
                      preview.yml (PR)
                    </button>
                    <button
                      onClick={() => setActiveSubTab('deploy_yml')}
                      className={`mono ${activeSubTab === 'deploy_yml' ? 'active-subtab' : 'inactive-subtab'}`}
                    >
                      deploy.yml (Staging/Prod)
                    </button>
                    <button
                      onClick={() => setActiveSubTab('cleanup_yml')}
                      className={`mono ${activeSubTab === 'cleanup_yml' ? 'active-subtab' : 'inactive-subtab'}`}
                    >
                      cleanup.yml
                    </button>
                  </>
                )}
                {activeTab === 'app' && (
                  <>
                    <button
                      onClick={() => setActiveSubTab('schema')}
                      className={`mono ${activeSubTab === 'schema' ? 'active-subtab' : 'inactive-subtab'}`}
                    >
                      env.schema.ts
                    </button>
                    <button
                      onClick={() => setActiveSubTab('runtime')}
                      className={`mono ${activeSubTab === 'runtime' ? 'active-subtab' : 'inactive-subtab'}`}
                    >
                      runtime-config.ts
                    </button>
                    <button
                      onClick={() => setActiveSubTab('env_json')}
                      className={`mono ${activeSubTab === 'env_json' ? 'active-subtab' : 'inactive-subtab'}`}
                    >
                      env.preview/staging/prod.json
                    </button>
                  </>
                )}
                {activeTab === 'scripts' && (
                  <>
                    <button
                      onClick={() => setActiveSubTab('makefile')}
                      className={`mono ${activeSubTab === 'makefile' ? 'active-subtab' : 'inactive-subtab'}`}
                    >
                      Makefile
                    </button>
                    <button
                      onClick={() => setActiveSubTab('deploy_s3')}
                      className={`mono ${activeSubTab === 'deploy_s3' ? 'active-subtab' : 'inactive-subtab'}`}
                    >
                      deploy-s3.sh
                    </button>
                  </>
                )}
              </div>

              {/* Code display with copy button */}
              {(() => {
                let currentCode = '';
                let title = '';
                let explanation = '';
                let pathInfo = '';

                if (activeTab === 'iac') {
                  if (activeSubTab === 'tfvars') {
                    currentCode = tfvarsCode;
                    title = 'Terraform 변수 정의 파일';
                    explanation =
                      '이 파일은 Terraform 인프라 프로비저닝에 필요한 변수 값을 정의합니다. Git에 커밋되지 않도록 보관하세요.';
                    pathInfo = 'infra/terraform/terraform.tfvars';
                  } else {
                    currentCode = previewRouterCode;
                    title = 'CloudFront Function Preview 라우터';
                    explanation =
                      '이 Javascript 코드는 CloudFront 엣지 가속 노드에서 실행되며 호스트 도메인(pr-123.domain) 또는 경로(domain/pr-123)를 해당 S3 버킷의 prefix(폴더)로 재작성해 줍니다.';
                    pathInfo = 'infra/terraform/functions/preview-router.js';
                  }
                } else if (activeTab === 'cicd') {
                  if (activeSubTab === 'preview_yml') {
                    currentCode = previewWorkflowCode;
                    title = 'PR Preview 배포 워크플로';
                    explanation =
                      'Pull Request가 생성되거나 업데이트될 때마다 자동으로 코드를 검증하고 빌드하여 OIDC를 통해 AWS OAC-S3 구조에 배포하고 PR 댓글로 URL을 작성해 주는 GitHub Actions 명세입니다.';
                    pathInfo = '.github/workflows/preview.yml';
                  } else if (activeSubTab === 'deploy_yml') {
                    currentCode = deployWorkflowCode;
                    title = 'Staging 및 Production 릴리스 승격 워크플로';
                    explanation =
                      'Build-Once 원칙을 준수하여 최초 1회 빌드한 정적 아티팩트를 보존한 뒤 staging에 배포하고, GitHub Environments 승인 절차를 거쳐 동일 아티팩트를 production으로 승격 및 CDN 갱신을 수행합니다.';
                    pathInfo = '.github/workflows/deploy.yml';
                  } else {
                    currentCode = cleanupWorkflowCode;
                    title = 'PR 종료 및 일회성 미사용 리소스 정리 워크플로';
                    explanation =
                      'PR이 Close 되거나 매일 밤 정해진 시간에 작동하여, 이미 닫힌 PR의 프리픽스 스토리지 데이터를 영구 격리 삭제하여 불필요한 스토리지 과금을 자동으로 차단합니다.';
                    pathInfo = '.github/workflows/cleanup-preview.yml';
                  }
                } else if (activeTab === 'app') {
                  if (activeSubTab === 'schema') {
                    currentCode = envSchemaCode;
                    title = 'Zod 런타임 환경 설정 검증 스키마';
                    explanation =
                      '애플리케이션이 구동된 직후 브라우저단에서 dynamic 로드할 설정 객체의 타입 안정성을 런타임에 최종 검사합니다.';
                    pathInfo = `apps/${serviceName}/env.schema.ts`;
                  } else if (activeSubTab === 'runtime') {
                    currentCode = runtimeConfigCode;
                    title = 'Next.js / SPA 런타임 설정 로더';
                    explanation =
                      '클라이언트 브라우저가 접속한 URL 패턴을 읽어 path 기반 프리뷰인지 판별하고, /env.json 또는 /pr-123/env.json 요청을 발생시켜 전역 상태에 config를 주입하는 훅입니다.';
                    pathInfo = `apps/${serviceName}/src/lib/runtime-config.ts`;
                  } else {
                    currentCode = `// apps/${serviceName}/public/env.preview.json\n${envPreviewJson}\n\n// apps/${serviceName}/public/env.staging.json\n${envStagingJson}\n\n// apps/${serviceName}/public/env.production.json\n${envProductionJson}`;
                    title = '환경별 정적 JSON 환경 설정 템플릿';
                    explanation =
                      '각 배포 위치의 루트에 빌드 결과물과 별도로 배치될 static JSON 설정들입니다. 이 환경 파일들에는 노출되면 안 되는 보안 시크릿 키는 작성하지 마세요.';
                    pathInfo = `apps/${serviceName}/public/env.*.json`;
                  }
                } else if (activeTab === 'scripts') {
                  if (activeSubTab === 'makefile') {
                    currentCode = makefileCode;
                    title = '자동화 실행 메이크파일';
                    explanation =
                      '긴 쉘 명령이나 스크립트 인자 처리를 단일 커맨드로 매핑하여 실수를 없애고 개발자 환경 온보딩 속도를 극대화합니다.';
                    pathInfo = 'Makefile';
                  } else {
                    currentCode = deployS3Code;
                    title = 'S3 Cache-Control 캐시 제어 배포 스크립트';
                    explanation =
                      '정적 웹 리소스 중 HTML이나 설정 파일은 no-cache, must-revalidate로, static/css/js 등의 해시 처리 자산은 1년(immutable) 캐시 제어 헤더를 주입해 CDN 캐시 오염을 완벽 차단합니다.';
                    pathInfo = 'scripts/deploy-s3.sh';
                  }
                }

                const copyKey = `${activeTab}-${activeSubTab}`;
                const isCopied = copiedState[copyKey] || false;

                return (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '10px',
                        marginBottom: '12px',
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            margin: '0 0 4px',
                            fontSize: '15px',
                            fontWeight: 800,
                            color: 'var(--app-ink)',
                          }}
                        >
                          {title}
                        </h4>
                        <p
                          style={{
                            margin: '0',
                            fontSize: '13px',
                            color: 'var(--app-ink-muted)',
                            lineHeight: '1.5',
                          }}
                        >
                          {explanation}
                        </p>
                        <div
                          style={{
                            marginTop: '8px',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: 'var(--app-accent)',
                          }}
                        >
                          📝 권장 경로: <span className="mono">{pathInfo}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(copyKey, currentCode)}
                        style={{
                          padding: '6px 12px',
                          background: isCopied ? 'var(--app-ok-bg)' : 'var(--app-accent)',
                          color: isCopied ? 'var(--app-ok-fg)' : 'var(--app-accent-fg)',
                          border: isCopied ? '1px solid var(--app-ok)' : '1px solid transparent',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {isCopied ? '✓ 복사완료' : '📋 코드 복사'}
                      </button>
                    </div>

                    <pre
                      style={{
                        background: 'var(--app-panel-2)',
                        padding: '16px',
                        borderRadius: '8px',
                        overflowX: 'auto',
                        fontSize: '12px',
                        lineHeight: '1.6',
                        border: '1px solid var(--app-line)',
                        color: 'var(--app-ink-muted)',
                        fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
                      }}
                    >
                      <code>{currentCode}</code>
                    </pre>
                  </div>
                );
              })()}
            </div>

            {/* Architectural Setup Notes */}
            <div
              style={{
                background: 'var(--app-panel)',
                border: '1px solid var(--app-line-strong)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: 'var(--app-shadow)',
              }}
            >
              <h3
                style={{
                  margin: '0 0 12px',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--app-ink)',
                }}
              >
                💡 1분 구축 및 배포 시작하기 가이드
              </h3>
              <ol
                style={{
                  paddingLeft: '20px',
                  margin: '0',
                  fontSize: '13px',
                  color: 'var(--app-ink-muted)',
                  lineHeight: '1.7',
                }}
              >
                <li style={{ marginBottom: '8px' }}>
                  이 저장소 루트에서{' '}
                  <code
                    style={{
                      background: 'var(--app-panel-2)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  >
                    infra/terraform/
                  </code>{' '}
                  폴더로 이동한 뒤 위의 <strong>terraform.tfvars</strong> 파일 코드를 저장합니다.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <code
                    style={{
                      background: 'var(--app-panel-2)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  >
                    infra/terraform/functions/preview-router.js
                  </code>{' '}
                  경로를 생성하여 <strong>preview-router.js</strong> 코드를 붙여넣습니다.
                </li>
                <li style={{ marginBottom: '8px' }}>
                  터미널에서{' '}
                  <code
                    style={{
                      background: 'var(--app-panel-2)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  >
                    make bootstrap
                  </code>{' '}
                  또는{' '}
                  <code
                    style={{
                      background: 'var(--app-panel-2)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  >
                    terraform apply
                  </code>
                  를 실행하여 AWS 리소스를 만듭니다. (성공적으로 인프라가 생기면 자동으로 GitHub
                  Variables에 IAM Role ARN 및 CF Distribution ID가 연동됩니다.)
                </li>
                <li style={{ marginBottom: '8px' }}>
                  위의 GitHub workflow 파일들(
                  <code
                    style={{
                      background: 'var(--app-panel-2)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  >
                    preview.yml
                  </code>
                  ,{' '}
                  <code
                    style={{
                      background: 'var(--app-panel-2)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  >
                    deploy.yml
                  </code>
                  ,{' '}
                  <code
                    style={{
                      background: 'var(--app-panel-2)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  >
                    cleanup-preview.yml
                  </code>
                  )을 저장소의{' '}
                  <code
                    style={{
                      background: 'var(--app-panel-2)',
                      padding: '2px 4px',
                      borderRadius: '4px',
                    }}
                  >
                    .github/workflows/
                  </code>{' '}
                  경로에 보관한 뒤 push 하세요.
                </li>
                <li>
                  개발용 브랜치에서 PR(Pull Request)을 작성하면 즉시 첫 preview 배포가 작동되고 PR
                  코멘트에 커스텀 URL 주소가 기재됩니다!
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Styled JSX for subtabs to avoid polluting global scope */}
      <style jsx global>{`
        .active-subtab {
          background: var(--app-accent-soft) !important;
          color: var(--app-accent) !important;
          border: 1px solid var(--app-accent) !important;
          font-weight: 850 !important;
          padding: 6px 12px !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          cursor: pointer !important;
        }
        .inactive-subtab {
          background: var(--app-panel-2) !important;
          color: var(--app-ink-subtle) !important;
          border: 1px solid var(--app-line-strong) !important;
          font-weight: 700 !important;
          padding: 6px 12px !important;
          border-radius: 6px !important;
          font-size: 12px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
        }
        .inactive-subtab:hover {
          color: var(--app-ink) !important;
          border-color: var(--app-line-strong) !important;
        }
        @media (max-width: 960px) {
          .generator-split-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
