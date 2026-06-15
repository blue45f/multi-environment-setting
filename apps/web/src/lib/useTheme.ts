import { useSyncExternalStore } from 'react'

// 테마 토글 — light / dark / system 3-상태 순환. data-theme 애트리뷰트가 single
// source of truth 이고, useSyncExternalStore 로 같은 탭 안의 여러 토글(홈 데모,
// /design 가이드)이 동일 상태를 공유한다. pre-paint 스크립트(index.html)가 첫
// 페인트 전에 data-theme 를 박아 FOUC 를 막는다.

export type Theme = 'light' | 'dark' | 'system'

const THEME_EVENT = 'demo:themechange'

function getThemeSnapshot(): Theme {
  const attr = document.documentElement.getAttribute('data-theme')
  return attr === 'light' || attr === 'dark' ? attr : 'system'
}

function getServerThemeSnapshot(): Theme {
  return 'system'
}

function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(THEME_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export const themeLabel: Record<Theme, { symbol: string; text: string }> = {
  system: { symbol: '◐', text: '시스템' },
  dark: { symbol: '●', text: '다크' },
  light: { symbol: '○', text: '라이트' },
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot)

  const cycle = () => {
    const next: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system'
    try {
      if (next === 'system') localStorage.removeItem('theme')
      else localStorage.setItem('theme', next)
    } catch {
      // localStorage 불가 환경: DOM 애트리뷰트만으로 동작(best-effort).
    }
    if (next === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', next)
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  return [theme, cycle]
}
