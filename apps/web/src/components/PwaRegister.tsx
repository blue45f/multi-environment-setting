import { useEffect } from 'react'

// 서비스 워커 등록(PWA). 프로덕션 빌드에서만 /sw.js 를 등록한다.
export function PwaRegister() {
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {})
    }
  }, [])

  return null
}
