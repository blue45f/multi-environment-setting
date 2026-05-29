'use client';

import { useEffect, useState } from 'react';
import { runtimeConfigSchema, type RuntimeConfig } from '../../env.schema';

// /env.json 을 런타임에 한 번만 불러와 검증하고 캐시한다.
// 정적 export 환경에서도 동작하도록 클라이언트에서 fetch 한다.
let cached: Promise<RuntimeConfig> | null = null;

export function loadRuntimeConfig(): Promise<RuntimeConfig> {
  if (!cached) {
    cached = fetch('/env.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`failed to load /env.json: ${res.status}`);
        }
        return res.json();
      })
      .then((json) => runtimeConfigSchema.parse(json));
  }
  return cached;
}

export function useRuntimeConfig(): {
  config: RuntimeConfig | null;
  error: Error | null;
} {
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
