// repo 루트 scripts/*.sh 를 빌드 타임에 ?raw 로 인라인한다.
// Next의 fs.readFileSync(process.cwd(), '../../scripts/<name>') 런타임 읽기를
// SPA에 맞게 대체한 것이다. 스크립트 본문은 그대로 보존된다.
import bootstrap from '../../../../../scripts/bootstrap.sh?raw'
import cleanupPreview from '../../../../../scripts/cleanup-preview.sh?raw'
import deployS3 from '../../../../../scripts/deploy-s3.sh?raw'
import dev from '../../../../../scripts/dev.sh?raw'
import e2eLocal from '../../../../../scripts/e2e-local.sh?raw'
import ghSetup from '../../../../../scripts/gh-setup.sh?raw'
import invalidate from '../../../../../scripts/invalidate.sh?raw'
import newService from '../../../../../scripts/new-service.sh?raw'
import preflight from '../../../../../scripts/preflight.sh?raw'
import promote from '../../../../../scripts/promote.sh?raw'
import rollback from '../../../../../scripts/rollback.sh?raw'
import tfBackend from '../../../../../scripts/tf-backend.sh?raw'
import verify from '../../../../../scripts/verify.sh?raw'

const scriptSources: Record<string, string> = {
  'bootstrap.sh': bootstrap,
  'cleanup-preview.sh': cleanupPreview,
  'deploy-s3.sh': deployS3,
  'dev.sh': dev,
  'e2e-local.sh': e2eLocal,
  'gh-setup.sh': ghSetup,
  'invalidate.sh': invalidate,
  'new-service.sh': newService,
  'preflight.sh': preflight,
  'promote.sh': promote,
  'rollback.sh': rollback,
  'tf-backend.sh': tfBackend,
  'verify.sh': verify,
}

export function getScriptContent(scriptName: string): string {
  return scriptSources[scriptName] ?? `# Script not found: ${scriptName}`
}
