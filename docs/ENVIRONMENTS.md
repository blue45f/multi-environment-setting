# Environment Matrix

This repository uses the same artifact layout for every frontend environment:

| Environment | Trigger | URL pattern | Data posture | AWS role | Lifetime |
| --- | --- | --- | --- | --- | --- |
| local | developer command | `localhost:3000` | fixture or mock data | personal credentials | manual |
| preview | pull request | `pr-<n>.preview.example.com` | sandbox or read-only data | `web-gha-preview` | until PR close |
| branch dev | feature branch push | `<branch>.dev.example.com` | sandbox data | preview role reuse | until branch delete |
| integration | develop merge | `integration.example.com` | integration test data | staging role | persistent |
| staging | main push or release candidate | `staging.example.com` | masked production-like data | `web-gha-staging` | persistent |
| production | approved deployment | `www.example.com` | production data | `web-gha-production` | persistent |

Preview deployments write to `s3://<artifact-bucket>/web/pr-<n>/`. Staging and
production write immutable releases first, then copy a selected release to
`web/<environment>/current/`.

Production secrets must not be available to preview or staging workflows. Use
GitHub environments plus OIDC trust conditions to keep role assumption scoped to
the matching environment.
