import { z } from 'zod'

// 런타임 public config 스키마. (가이드 §8.2)
//
// 여기에는 PUBLIC 값만 둔다. secret / internal token / service credential 금지.
// 이 스키마가 검증하는 /env.json 은 정적 파일로 브라우저에 그대로 노출된다.
// 환경별 secret은 SSM Parameter Store / GitHub environment secret 으로 분리한다.
//
// build-once, deploy-many: 같은 정적 번들을 환경마다 다른 env.json 과 함께 서빙한다.
// 배포 워크플로가 public/env.<stage>.json 을 out/env.json 으로 복사한다.
export const runtimeConfigSchema = z.object({
  stage: z.enum(['preview', 'staging', 'production']),
  apiBaseUrl: z.string().url(),
  sentryEnvironment: z.string().min(1),
  featureFlagClientKey: z.string().min(1),
})

export const RuntimeConfigSchema = runtimeConfigSchema
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>
