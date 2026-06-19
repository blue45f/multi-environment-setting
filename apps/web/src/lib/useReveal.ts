import { useEffect, useRef, useState } from 'react'

// 스크롤 진입 리빌 훅 — IntersectionObserver 로 요소가 뷰포트에 들어오면 한 번만
// revealed 를 켠다. 핵심 계약(절대 깨지 않는다):
//   1. 콘텐츠는 "기본적으로 보인다". 리빌은 enhancement 일 뿐, 가시성을 가두지 않는다.
//      → CSS 는 [data-reveal] 초기 상태를 살짝 내려/흐리게만 하고, 리빌/리듀스드모션/
//        no-JS/SSR 어디서든 최종 상태(보임)로 수렴한다. (no CLS · no blank-on-no-JS)
//   2. prefers-reduced-motion 이거나 IntersectionObserver 가 없는(jsdom·SSR·구형)
//      환경이면 처음부터 revealed=true 로 둬서 옵저버 없이 즉시 보인다.
//   3. setState 는 옵저버 콜백(비동기)에서만 호출한다 — 이펙트 안 동기 setState 금지.
//
// 같은 패턴을 홈 히어로/섹션들이 공유해 "한 번 본 섹션은 다시 숨지 않는" 차분한 등장만 만든다.

type RevealOptions = {
  /** 뷰포트 바닥에서 얼마나 일찍 트리거할지(px). 기본 -10% 지점. */
  rootMargin?: string
  /** 교차 비율 임계값. 기본 0.12. */
  threshold?: number
}

function canObserve(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof IntersectionObserver === 'undefined') return false
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return false
  }
  return true
}

export function useReveal<T extends HTMLElement = HTMLElement>(
  options: RevealOptions = {}
): { ref: React.RefObject<T | null>; revealed: boolean } {
  const ref = useRef<T>(null)
  // 옵저버를 못 쓰는(서버/리듀스드모션/no-IO) 환경에서는 처음부터 revealed=true.
  const [revealed, setRevealed] = useState(() => !canObserve())

  useEffect(() => {
    const el = ref.current
    if (!el || revealed) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            observer.disconnect()
            break
          }
        }
      },
      {
        rootMargin: options.rootMargin ?? '0px 0px -10% 0px',
        threshold: options.threshold ?? 0.12,
      }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
    }
  }, [revealed, options.rootMargin, options.threshold])

  return { ref, revealed }
}
