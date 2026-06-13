# Deploy runbook (multi-environment-setting)

Single source of truth for **where this app actually lives and how to ship it**, so
nobody has to re-discover the AWS setup again.

## TL;DR — the one live environment that exists

There is exactly **one browser-accessible deployment**: the **terraform-free-sample**
S3 static website. The "build-once / deploy-many" matrix (`deploy.yml` / `preview.yml`)
is a **demonstration template that is NOT wired** (see below), so the free-sample is
what you validate against.

| Thing | Value |
|---|---|
| Live URL | `http://multi-env-free-sample-945203151945-ap-northeast-2.s3-website.ap-northeast-2.amazonaws.com` |
| S3 bucket | `multi-env-free-sample-945203151945-ap-northeast-2` |
| AWS account | `945203151945` · region `ap-northeast-2` |
| AWS profile | `multi-env-free-sample` (IAM user `multi-env-free-sample-deploy`); `default` = `termsdesk-deploy`, same account |
| Hosting | **S3 static website** (no CloudFront). `index_document=index.html`, `error_document=index.html` |
| Terraform | `infra/terraform-free-sample/` (this is the deployed one; `terraform.tfstate` + `terraform.tfvars` are committed) |

> ⚠️ **Content expires daily.** `terraform-free-sample/terraform.tfvars` sets
> `sample_expiration_days = 1`, so a lifecycle rule deletes the objects after ~1 day
> and the URL starts returning 404. **Re-run the deploy below to refresh it.**

## Build + deploy (refresh the live sample)

```sh
# 1. build the Vite SPA → apps/web/dist  (output dir is `dist`, NOT Next's `out`)
pnpm --dir apps/web run build

# 2. sync to the sample bucket (deploy-s3.sh sets cache-control + excludes env.*.json templates + *.map)
AWS_PROFILE=multi-env-free-sample bash scripts/deploy-s3.sh \
  apps/web/dist \
  s3://multi-env-free-sample-945203151945-ap-northeast-2
```

`scripts/deploy-s3.sh` works unchanged for the Vite output: hashed `assets/*` get
`immutable` cache-control; `index.html` / `*.txt` / `sitemap.xml` / `env.json` get
`no-cache`; `env.preview|staging|production.json` templates and `*.map` are excluded.

The runtime config is `apps/web/public/env.json` (copied into `dist/`). The app fetches
`/env.json` at runtime (`src/lib/runtime-config.ts`) and shows the stage badge — so the
same artifact can serve any stage by swapping `env.json`. (`deploy.yml` does
`cp public/env.<stage>.json dist/env.json`.)

## Validate (what "working" looks like)

```sh
URL=http://multi-env-free-sample-945203151945-ap-northeast-2.s3-website.ap-northeast-2.amazonaws.com
curl -sS -o /dev/null -w '%{http_code}\n' "$URL/"            # 200 (SPA shell)
curl -sS -o /dev/null -w '%{http_code}\n' "$URL/env.json"    # 200
curl -sS "$URL/" | grep -o '/assets/[^"]*'                   # absolute /assets/... (base '/')
curl -sS "$URL/intro/theory"                                  # body = index.html (SPA shell)
```

**Vite SPA specifics (why `base: '/'`):** `vite.config.ts` sets `base: '/'` so the single
`dist/index.html` (served as the fallback for every client route) references assets at
an **absolute** `/assets/...`. A relative `./` base breaks hard-loads of nested routes
(`/intro/theory`) because assets would resolve against the route depth.

**Known limitation of the bare S3 website:** client routes (`/intro`, `/intro/theory`)
return **HTTP 404 with the `index.html` body** (S3 serves `error_document` with the 404
status). The browser still loads it and the client router renders the route, so the app
*works*; only the status code is wrong. A CloudFront Function would rewrite this to 200 —
that's what `infra/terraform/functions/preview-router.js.tftpl` does for the (un-wired)
preview matrix, where it also restores the `/pr-<n>/` prefix for `/assets/...` via referer.

## The matrix infra (deploy.yml / preview.yml) — NOT wired

`deploy.yml` + `preview.yml` demonstrate a build-once/deploy-many flow across a service
matrix (S3 upload → CloudFront invalidation → Amplify preview). Every job is gated on
`if: vars.DEPLOY_CONFIG != ''` and `vars.SERVICES` (default `["web"]`). **Those GitHub
variables and the AWS secrets are NOT set** (`gh variable list` / `gh secret list` are
empty), so the `deploy` job **skips** on every push. `infra/terraform/` (the full
S3+CloudFront+OIDC stack) is the template behind it and is **not applied**. To actually
use it you would: `terraform apply` `infra/terraform/`, set `DEPLOY_CONFIG` (per-service
distribution IDs / role ARNs) + `SERVICES`, and configure the AWS OIDC role secrets.

## Migration note (2026-06-13)

`apps/web` was migrated **Next.js 16 (output:export) → Vite 8 + React Router v7 SPA**.
Output dir changed `out` → `dist` (workflows + this runbook updated). The CloudFront
preview-router was updated for SPA (document requests → root `index.html`; `/_next/` →
`/assets/`) — but that only affects the un-wired matrix preview, validated by code review
only. The free-sample S3 path above is fully validated live.
