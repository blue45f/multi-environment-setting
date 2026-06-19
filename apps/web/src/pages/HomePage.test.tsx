import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from './HomePage'

import type { RuntimeConfig } from '../../env.schema'

// useRuntimeConfig 를 모킹해 jsdom 에서도 결정적으로 런타임 상태를 검증한다.
// (실제 /env.json 페치는 smoke(Playwright) 영역. 여기선 UI 계약만 본다.)
// vi.mock 은 vitest 가 import 위로 호이스트하므로 위 import 보다 늦게 적어도 적용된다.
const mockState: { config: RuntimeConfig | null; error: Error | null } = {
  config: null,
  error: null,
}

vi.mock('@/lib/runtime-config', () => ({
  useRuntimeConfig: () => mockState,
}))

const PREVIEW_CONFIG: RuntimeConfig = {
  stage: 'preview',
  apiBaseUrl: 'https://api-preview.example.com',
  sentryEnvironment: 'preview',
  featureFlagClientKey: 'public-preview-key',
}

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockState.config = null
  mockState.error = null
})

afterEach(() => {
  cleanup()
})

describe('HomePage', () => {
  it('config 없이도 히어로/CTA 가 보인다(blank 방지)', () => {
    renderHome()
    // hero 제목과 단일 primary CTA 는 config 와 무관하게 항상 렌더된다.
    expect(screen.getByRole('heading', { name: /Multi-Environment Demo/ })).toBeTruthy()
    expect(screen.getByRole('link', { name: '아키텍처 가이드 읽기' })).toBeTruthy()
    // 로드 전엔 stage 배지가 loading 폴백을 보여준다.
    expect(screen.getByTestId('stage').textContent).toContain('loading')
  })

  it('config 로드 시 런타임 값과 라이브 상태를 표시한다', () => {
    mockState.config = PREVIEW_CONFIG
    renderHome()
    expect(screen.getByTestId('stage').textContent).toContain('preview')
    expect(screen.getByTestId('api').textContent).toContain('api-preview.example.com')
    // data-live 가 켜져 라이브 액센트(상단 바·펄스)가 동작한다.
    const card = document.querySelector('.runtime-card')
    expect(card?.getAttribute('data-live')).toBe('true')
  })

  it('stage 카드를 누르면 다른 환경을 미리보고 되돌릴 수 있다', () => {
    mockState.config = PREVIEW_CONFIG
    renderHome()

    const rail = document.querySelector('.env-rail') as HTMLElement
    const stagingCard = within(rail)
      .getAllByRole('button')
      .find((b) => b.textContent?.includes('릴리즈 전 검증 환경'))
    expect(stagingCard).toBeTruthy()

    fireEvent.click(stagingCard as HTMLElement)
    expect(screen.getByRole('heading', { name: '미리보는 환경' })).toBeTruthy()
    expect(screen.getByTestId('stage').textContent).toContain('staging')
    expect(stagingCard?.getAttribute('aria-pressed')).toBe('true')

    // 되돌리기 → 실제 접속 환경(preview)으로 복귀.
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }))
    expect(screen.getByRole('heading', { name: '현재 접속 환경' })).toBeTruthy()
    expect(screen.getByTestId('stage').textContent).toContain('preview')
  })

  it('config 로드 실패 시 에러 배너를 노출한다', () => {
    mockState.error = new Error('boom')
    renderHome()
    expect(screen.getByTestId('error').textContent).toContain('boom')
  })
})
