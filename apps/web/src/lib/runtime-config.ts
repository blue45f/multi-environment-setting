import { useEffect, useState } from 'react'

import { runtimeConfigSchema, type RuntimeConfig } from '../../env.schema'

import { http, HTTPError, toJson } from './http'

let cached: Promise<RuntimeConfig> | null = null

function runtimeConfigUrl(): string {
  if (typeof window === 'undefined') {
    return '/env.json'
  }

  // CloudFront 기본 도메인 preview는 /pr-<n>/ path로 접근한다.
  // 이때 /env.json을 루트로 요청하면 preview-router가 PR 번호를 알 수 없어 404가 된다.
  // path 기반 preview에서만 같은 PR prefix 아래의 env.json을 읽고,
  // custom-domain preview(pr-<n>.preview.example.com)와 staging/production은 루트 env.json을 유지한다.
  const pathPreview = window.location.pathname.match(/^\/(pr-\d+)(?:\/|$)/)
  if (pathPreview) {
    return `/${pathPreview[1]}/env.json`
  }

  return '/env.json'
}

export function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (!cached) {
    const url = runtimeConfigUrl()
    // ky 공유 클라이언트로 same-origin /env.json 을 읽는다. fetch 시절의
    // `!res.ok` 분기 대신 ky 가 비-2xx 를 HTTPError 로 던지므로, UI 가 의존하는
    // `failed to load ${url}: ${status}` 메시지 형태를 그대로 재현해 보존한다.
    cached = toJson<unknown>(http.get(url, { cache: 'no-store' }))
      .catch((error: unknown) => {
        cached = null
        if (error instanceof HTTPError) {
          throw new Error(`failed to load ${url}: ${error.response.status}`)
        }
        throw error
      })
      .then((json) => runtimeConfigSchema.parse(json))
      .catch((error: unknown) => {
        cached = null
        throw error
      })
  }
  return cached
}

export function useRuntimeConfig(): {
  config: RuntimeConfig | null
  error: Error | null
} {
  const [config, setConfig] = useState<RuntimeConfig | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let active = true
    loadRuntimeConfig()
      .then((c) => {
        if (active) setConfig(c)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e : new Error(String(e)))
      })
    return () => {
      active = false
    }
  }, [])

  return { config, error }
}
