# Frontend Preview Runbook

## Preview URL returns 404

1. Confirm the PR workflow finished successfully.
2. Confirm `ARTIFACT_BUCKET` contains `web/pr-<number>/index.html`.
3. Confirm the preview CloudFront distribution uses the `preview-router`
   function on viewer request.
4. Invalidate `/<service>/pr-<number>/*`.

## Runtime config is stale

1. Check `web/pr-<number>/env.json`.
2. Confirm `deploy-s3.sh` uploaded `env.json` with `no-cache,max-age=0`.
3. Invalidate `/web/pr-<number>/env.json`.

## Roll back staging or production

Use a known-good immutable release:

```bash
./scripts/rollback.sh \
  s3://my-bucket/web/production/releases/<good-sha> \
  s3://my-bucket/web/production/current \
  <PRODUCTION_DISTRIBUTION_ID>
```

## Clean orphan previews

```bash
./scripts/cleanup-preview.sh sweep
```

The cleanup script only deletes prefixes that match `web/pr-<number>/`.
