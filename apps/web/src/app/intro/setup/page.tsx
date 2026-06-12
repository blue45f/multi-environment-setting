import Link from 'next/link';

import { domainFlow, platformGuides, usageCommands } from '../guide-data';

const setupPrinciples = [
  {
    title: '브라우저 앱은 secret을 갖지 않는다',
    detail:
      'Next static export나 React SPA는 결국 HTML/CSS/JS로 브라우저에 내려갑니다. 그래서 API base URL, Sentry environment, public feature flag key처럼 공개 가능한 값만 `env.json`에 두고, AWS 권한·토큰·서버 secret은 GitHub OIDC와 AWS IAM에 둡니다.',
  },
  {
    title: '환경 차이는 빌드가 아니라 배포 위치에서 만든다',
    detail:
      'preview, staging, production마다 다시 빌드하면 “검증한 코드”와 “운영에 나간 코드”가 달라질 수 있습니다. 이 저장소는 한 번 만든 `out/` 산출물을 환경별 S3 prefix에 올리고, `env.json`과 CloudFront 라우팅만 바꿉니다.',
  },
  {
    title: 'S3 prefix가 환경 경계다',
    detail:
      '하나의 artifact 버킷을 쓰되 `<service>/pr-123`, `<service>/staging/current`, `<service>/production/current`로 경계를 나눕니다. 이 prefix가 IAM 권한 범위, cleanup 범위, rollback 범위, CloudFront origin path의 기준이 됩니다.',
  },
  {
    title: 'CloudFront는 공개 입구, S3는 비공개 origin이다',
    detail:
      'S3 bucket public access는 전부 막고, CloudFront Origin Access Control(OAC)로 들어오는 요청만 `s3:GetObject`를 허용합니다. 사용자는 CloudFront 도메인만 보고, S3 객체는 직접 열 수 없습니다.',
  },
  {
    title: 'GitHub Actions는 장기 AWS 키를 저장하지 않는다',
    detail:
      '워크플로는 `id-token: write` 권한으로 OIDC 토큰을 받고, AWS IAM role을 AssumeRoleWithWebIdentity로 잠깐 빌립니다. repo secret에 AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY를 저장하지 않는 구조입니다.',
  },
  {
    title: 'production은 GitHub environment 승인으로 멈춘다',
    detail:
      'production job은 GitHub `production` environment에 묶입니다. 이 environment에 required reviewer와 main 브랜치 제한을 걸면, AWS role trust 조건과 GitHub 승인 게이트가 같이 작동합니다.',
  },
];

const setupExecutionSteps = [
  {
    step: '1',
    title: '값 한 파일 작성',
    command: 'cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars',
    detail:
      '`github_owner`, `github_repo`, `aws_region`을 먼저 채웁니다. 도메인 없이 시작하려면 `enable_custom_domain=false`를 유지합니다.',
  },
  {
    step: '2',
    title: '사전 점검',
    command: 'make preflight',
    detail:
      'Terraform, AWS CLI, GitHub CLI, Node, corepack/pnpm, AWS 인증, GitHub 인증, tfvars 파일 존재 여부를 확인합니다.',
  },
  {
    step: '3',
    title: 'AWS 리소스 생성',
    command: 'make tf-plan && make tf-apply',
    detail:
      '계획을 먼저 검토하고 apply합니다. 생성 대상은 S3 artifact bucket, CloudFront 배포 3종, OAC, preview router function, GitHub OIDC role입니다.',
  },
  {
    step: '4',
    title: 'GitHub 변수와 environment 생성',
    command: 'PROD_REVIEWER=<github-login> make gh-setup',
    detail:
      '`terraform output -json deploy_config`를 GitHub repo variable로 넣고 `preview`, `staging`, `production` environments를 만듭니다.',
  },
  {
    step: '5',
    title: '로컬과 원격 smoke 확인',
    command: 'make e2e-local ENV=preview',
    detail:
      'AWS 전에는 로컬 static serving으로 확인하고, AWS 후에는 PR preview와 staging CloudFront URL에서 Playwright smoke를 확인합니다.',
  },
];

const terraformVariableGroups = [
  {
    group: '서비스와 리전',
    rows: [
      ['service_name', '`web`', '공유 bucket 이름 기본값과 일부 공통 리소스 prefix에 사용합니다.'],
      [
        'services',
        '`["web"]`',
        '배포할 앱 목록입니다. 각 서비스마다 CloudFront 3종과 IAM role 4종이 생깁니다.',
      ],
      [
        'aws_region',
        '`ap-northeast-2`',
        'S3, IAM policy 조건, Amplify 선택 경로 등 기본 리전입니다.',
      ],
    ],
  },
  {
    group: 'GitHub OIDC',
    rows: [
      [
        'github_owner',
        '본인 또는 조직',
        'OIDC trust policy의 `repo:OWNER/REPO:environment:*` claim에 들어갑니다.',
      ],
      ['github_repo', '저장소명', '워크플로가 실행되는 repository와 정확히 일치해야 합니다.'],
      [
        'create_oidc_provider',
        '`true` 또는 `false`',
        'AWS 계정에 GitHub OIDC provider가 이미 있으면 `false`로 두고 기존 provider ARN을 사용합니다.',
      ],
    ],
  },
  {
    group: '도메인',
    rows: [
      [
        'enable_custom_domain',
        '`false` 시작 권장',
        '처음에는 CloudFront 기본 도메인으로 검증하고, DNS 준비 후 true로 전환합니다.',
      ],
      ['apex_domain', '`example.com`', 'Route53 hosted zone의 루트 도메인입니다.'],
      [
        'preview_subdomain',
        '`preview`',
        '`*.preview.example.com` 와일드카드 preview host를 만듭니다.',
      ],
      [
        'staging_host / production_host',
        '`staging.example.com` / `www.example.com`',
        '상시 검증과 운영 도메인입니다.',
      ],
      [
        'hosted_zone_id',
        'Route53 zone ID',
        'ACM DNS 검증 레코드와 alias A/AAAA 레코드를 만들 때 필요합니다.',
      ],
    ],
  },
  {
    group: '수명주기',
    rows: [
      [
        'artifact_bucket_name',
        '비우면 자동 생성',
        '`<service>-frontend-artifacts-<account>-<region>` 형식으로 전역 유일 이름을 만듭니다.',
      ],
      [
        'preview_expiration_days',
        '`14`',
        'cleanup이 누락되어도 `pr-*` preview 객체를 자동 만료합니다.',
      ],
      [
        'release_expiration_days',
        '`90`',
        'rollback 소스인 staging/production release 객체 보관 기간입니다.',
      ],
    ],
  },
];

const awsResourceLayers = [
  {
    layer: 'S3 artifact bucket',
    resources: [
      '`aws_s3_bucket.artifacts`',
      '`aws_s3_bucket_public_access_block.artifacts`',
      '`aws_s3_bucket_versioning.artifacts`',
      '`aws_s3_bucket_lifecycle_configuration.artifacts`',
    ],
    detail:
      '모든 정적 산출물을 하나의 bucket에 저장합니다. public access는 막고, 버전 관리와 lifecycle로 preview/release 수명을 관리합니다.',
  },
  {
    layer: 'CloudFront OAC',
    resources: ['`aws_cloudfront_origin_access_control.s3`', '`aws_s3_bucket_policy.artifacts`'],
    detail:
      'CloudFront만 S3 origin을 읽도록 제한합니다. bucket policy는 CloudFront distribution ARN을 `AWS:SourceArn` 조건으로 확인합니다.',
  },
  {
    layer: 'Preview distribution',
    resources: [
      '`aws_cloudfront_distribution.preview`',
      '`aws_cloudfront_function.preview_router`',
    ],
    detail:
      '서비스별 preview CloudFront 배포 하나가 모든 PR을 처리합니다. `pr-123.preview.example.com` 또는 `/pr-123/`를 `<service>/pr-123/` prefix로 재작성합니다.',
  },
  {
    layer: 'Staging / production distribution',
    resources: [
      '`aws_cloudfront_distribution.staging`',
      '`aws_cloudfront_distribution.production`',
    ],
    detail:
      '각각 origin path를 `/<service>/staging/current`, `/<service>/production/current`로 고정합니다. release를 current로 복사하면 배포가 바뀝니다.',
  },
  {
    layer: 'ACM + Route53',
    resources: ['`aws_acm_certificate.main`', '`aws_route53_record.*`'],
    detail:
      '`enable_custom_domain=true`일 때만 생성합니다. CloudFront용 ACM 인증서는 us-east-1 provider에서 만들고, DNS validation과 alias A/AAAA 레코드를 Route53에 생성합니다.',
  },
  {
    layer: 'IAM roles',
    resources: [
      '`aws_iam_role.preview`',
      '`aws_iam_role.staging`',
      '`aws_iam_role.production`',
      '`aws_iam_role.cleanup`',
    ],
    detail:
      '서비스마다 preview/staging/production/cleanup 역할을 만듭니다. trust는 GitHub environment claim으로 제한하고, 권한은 서비스 prefix와 해당 CloudFront distribution으로 좁힙니다.',
  },
];

const githubSettings = [
  {
    name: 'AWS_REGION',
    value: '`terraform output -raw aws_region`',
    use: 'aws-actions/configure-aws-credentials가 사용할 리전입니다.',
  },
  {
    name: 'ARTIFACT_BUCKET',
    value: '`terraform output -raw artifact_bucket`',
    use: '배포 스크립트가 `s3://<bucket>/<service>/...` 경로를 만들 때 씁니다.',
  },
  {
    name: 'SERVICES',
    value: '`terraform output -json services`',
    use: 'GitHub Actions matrix가 `apps/<service>`를 순회하는 기준입니다.',
  },
  {
    name: 'DEPLOY_CONFIG',
    value: '`terraform output -json deploy_config`',
    use: '서비스별 role ARN, distribution ID, CloudFront domain, preview URL template을 담는 통합 설정입니다.',
  },
  {
    name: 'GitHub environments',
    value: '`preview`, `staging`, `production`',
    use: 'OIDC trust의 `environment:<env>` claim과 일치해야 합니다. production은 reviewer와 main 브랜치 제한을 겁니다.',
  },
];

const deploymentFlow = [
  {
    title: 'PR preview',
    trigger: '`pull_request` opened/synchronize/reopened',
    flow: '서비스별 matrix → lint/typecheck/test/build → `env.preview.json`을 `env.json`으로 복사 → `deployment.json` 작성 → preview role AssumeRole → S3 `/<service>/pr-<n>` 업로드 → CloudFront invalidation → PR 코멘트',
  },
  {
    title: 'Staging',
    trigger: '`main` push 또는 workflow_dispatch',
    flow: '한 번 빌드한 artifact를 다운로드 → `env.staging.json` 주입 → `/<service>/staging/releases/<sha>` 업로드 → `promote.sh`로 current 전환 → entry/config invalidation → smoke',
  },
  {
    title: 'Production',
    trigger: '`production` GitHub environment 승인 후',
    flow: 'staging과 같은 artifact를 사용 → `env.production.json` 주입 → `/<service>/production/releases/<sha>` 업로드 → current 전환 → CloudFront invalidation → smoke',
  },
  {
    title: 'Cleanup',
    trigger: 'PR close 또는 매일 03:00 KST schedule',
    flow: 'cleanup role AssumeRole → closed PR은 즉시 `/<service>/pr-<n>` 삭제 → schedule은 open PR 보존, grace period, max deletion, dry-run 리포트로 안전하게 정리',
  },
];

export const metadata = {
  title: '멀티베타 환경 개발가이드 · 설정',
  description: '멀티베타 환경의 도메인, 플랫폼별 구축 경로, AWS rollout 순서',
};

export default function SetupPage() {
  return (
    <>
      <section className="guide-page-hero" aria-labelledby="setup-title">
        <p className="eyebrow">setup routes</p>
        <h1 id="setup-title">도메인과 플랫폼 구축 경로</h1>
        <p>
          개인 공유용 Vercel URL과 운영형 AWS S3/CloudFront 모델을 분리해 봅니다. 먼저 로컬과 S3
          baseline으로 구조를 확인하고, 이후 CloudFront routing과 GitHub OIDC 승격 흐름으로
          고도화합니다.
        </p>
      </section>

      <section className="guide-setup-principles" aria-labelledby="setup-principles-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">setup principles</p>
          <h2 id="setup-principles-title">설정 원리부터 설명하면 이렇게 말하면 됩니다</h2>
          <p>
            이 구조는 “환경별 앱을 따로 만드는 것”이 아니라 “하나의 정적 산출물을 안전한 경계에
            배치하는 것”입니다. AWS 리소스는 그 경계를 강제하고, GitHub는 검증과 승인 순서를
            강제합니다.
          </p>
        </div>

        <div className="setup-principle-grid">
          {setupPrinciples.map((item) => (
            <article key={item.title} className="setup-principle-card">
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-setup-steps" aria-labelledby="setup-steps-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">actual setup order</p>
          <h2 id="setup-steps-title">실제로 AWS와 GitHub에 세팅하는 순서</h2>
          <p>
            처음에는 custom domain 없이 CloudFront 기본 도메인으로 끝까지 검증하는 것을 권장합니다.
            도메인은 구조가 확인된 뒤 `enable_custom_domain=true`로 켭니다.
          </p>
        </div>

        <ol className="setup-step-list">
          {setupExecutionSteps.map((item) => (
            <li key={item.step} className="setup-step-item">
              <span>{item.step}</span>
              <article>
                <h3>{item.title}</h3>
                <pre>
                  <code>{item.command}</code>
                </pre>
                <p>{item.detail}</p>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section className="guide-terraform-vars" aria-labelledby="terraform-vars-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">terraform.tfvars</p>
          <h2 id="terraform-vars-title">어떤 값을 왜 채우는지</h2>
          <p>
            이 저장소는 대부분의 설정을 `infra/terraform/terraform.tfvars`에 모읍니다. 변수 이름을
            바꾸는 대신 값을 채우고, 나머지는 Terraform output과 `make gh-setup`이 이어받습니다.
          </p>
        </div>

        <div className="terraform-var-groups">
          {terraformVariableGroups.map((group) => (
            <article key={group.group} className="terraform-var-card">
              <h3>{group.group}</h3>
              <dl>
                {group.rows.map(([name, value, detail]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>
                      <code>{value}</code>
                      <span>{detail}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-aws-resources" aria-labelledby="aws-resources-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">aws resources</p>
          <h2 id="aws-resources-title">Terraform이 실제로 만드는 AWS 리소스</h2>
          <p>
            핵심은 S3를 private origin으로 두고, CloudFront와 IAM role이 prefix 단위 경계를 강제하게
            만드는 것입니다. 아래 이름은 실제 Terraform resource 이름입니다.
          </p>
        </div>

        <div className="aws-resource-list">
          {awsResourceLayers.map((item) => (
            <article key={item.layer} className="aws-resource-row">
              <div>
                <span>Layer</span>
                <h3>{item.layer}</h3>
              </div>
              <ul>
                {item.resources.map((resource) => (
                  <li key={resource}>{resource}</li>
                ))}
              </ul>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-github-settings" aria-labelledby="github-settings-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">github settings</p>
          <h2 id="github-settings-title">GitHub 쪽에 들어가는 변수와 environment</h2>
          <p>
            `make gh-setup`은 Terraform output을 읽어 GitHub repo variables와 environments를
            자동으로 만듭니다. 이 값들이 비어 있으면 배포 워크플로는 안전하게 skip됩니다.
          </p>
        </div>

        <div className="github-setting-table">
          {githubSettings.map((item) => (
            <article key={item.name}>
              <h3>{item.name}</h3>
              <code>{item.value}</code>
              <p>{item.use}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-deploy-flow" aria-labelledby="deploy-flow-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">workflow mapping</p>
          <h2 id="deploy-flow-title">GitHub Actions와 AWS 리소스가 맞물리는 흐름</h2>
          <p>
            workflow는 직접 AWS 키를 들고 있지 않습니다. 각 job이 GitHub environment에 묶이고, 그
            environment claim으로 AWS role을 빌린 뒤 정해진 S3 prefix와 CloudFront 배포만 만집니다.
          </p>
        </div>

        <div className="deploy-flow-list">
          {deploymentFlow.map((item) => (
            <article key={item.title} className="deploy-flow-card">
              <h3>{item.title}</h3>
              <p>
                <strong>트리거:</strong> {item.trigger}
              </p>
              <p>{item.flow}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-domains" aria-labelledby="domains-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">domain and traffic flow</p>
          <h2 id="domains-title">배포되면 URL은 어떻게 만들어지고 트래픽은 어디로 흐를까요</h2>
          <p>
            개인 공유용 Vercel URL은 기억하기 쉬운 alias만 관리하고, 실제 운영형 멀티베타 도메인은
            AWS에서 preview/staging/production 규칙으로 고정합니다. 랜덤 URL과 운영 URL을 섞어
            기준으로 쓰지 않는 것이 핵심입니다.
          </p>
        </div>

        <div className="domain-flow">
          {domainFlow.map((domain) => (
            <article key={domain.name} className="domain-card">
              <span>{domain.name}</span>
              <h3>{domain.example}</h3>
              <strong>{domain.use}</strong>
              <p>{domain.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-platforms" aria-labelledby="platforms-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">platform setup paths</p>
          <h2 id="platforms-title">플랫폼별로 가장 짧게 구축하는 경로</h2>
          <p>
            이 저장소는 Next.js static export, React SPA처럼 빌드 결과가 HTML/CSS/JS 정적 파일로
            떨어지는 프론트엔드를 기준으로 합니다. 개인 공개 URL은 Vercel로 가볍게 유지하고, 실제
            멀티베타 운영 모델은 AWS S3/CloudFront/GitHub OIDC 기준으로 설명합니다.
          </p>
        </div>

        <div className="platform-grid">
          {platformGuides.map((guide) => (
            <article key={guide.platform} className="platform-card">
              <div>
                <span>{guide.platform}</span>
                <h3>{guide.goal}</h3>
              </div>
              <pre>
                <code>{guide.command}</code>
              </pre>
              <ol>
                {guide.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-usage" aria-labelledby="usage-title">
        <div>
          <p className="eyebrow">Runbook</p>
          <h2 id="usage-title">직접 실행할 때 쓰는 명령</h2>
          <p>
            로컬 개발은 `apps/web`에서 실행하고, AWS 샘플은 전용 `multi-env-free-sample` 프로필만
            사용합니다. 다른 서비스 계정(예: `termsdesk-deploy`)은 사용하지 않습니다.
          </p>
        </div>

        <div className="command-stack">
          {usageCommands.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <pre>
                <code>{item.command}</code>
              </pre>
              <p>{item.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-compare" aria-labelledby="compare-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">AWS rollout guide</p>
          <h2 id="compare-title">AWS 기준으로 어디부터 고도화할까요</h2>
        </div>
        <div className="compare-grid">
          <article>
            <h3>1. S3 static baseline</h3>
            <p>
              가장 먼저 `out/` 정적 산출물을 S3 prefix에 올려 build-once 구조가 맞는지 확인합니다.
              `index.html`, `env.json`, `deployment.json`은 no-cache로 두고 hash asset만 immutable로
              분리합니다.
            </p>
          </article>
          <article>
            <h3>2. CloudFront routing</h3>
            <p>
              preview는 <code>pr-&lt;n&gt;</code> prefix, staging/production은 <code>current</code>{' '}
              prefix로 라우팅합니다. CloudFront Function은 host/path를 S3 prefix로 재작성하고
              entry/config invalidation만 수행합니다.
            </p>
          </article>
          <article>
            <h3>3. OIDC promotion</h3>
            <p>
              GitHub OIDC 역할을 preview/staging/production/cleanup으로 나누고, production은
              environment reviewer 승인 뒤에만 AssumeRole이 가능하게 둡니다. rollback은 이전 release
              SHA를 `current`로 되돌립니다.
            </p>
          </article>
        </div>
      </section>

      <section className="guide-footer" aria-label="다음 행동">
        <div>
          <p className="eyebrow">Next route</p>
          <h2>스크립트 사용법으로 이어서 이동</h2>
        </div>
        <Link className="guide-cta" href="/intro/scripts">
          스크립트 페이지로 이동
        </Link>
      </section>
    </>
  );
}
