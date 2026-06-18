import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from './ErrorBoundary'

// 단위 테스트(pnpm test → vitest, jsdom). 에러 바운더리는 클라이언트 렌더에서만
// throw를 잡으므로(SSR 미동작) @testing-library/react로 렌더한다. 바운더리 계약:
// 정상 자식은 통과, 렌더 throw는 한글 alert 폴백으로 잡아 #main-content 본문 +
// 복구 버튼 두 개를 노출한다(백스크린 회귀 방지).
function Boom(): never {
  throw new Error('render exploded')
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('자식이 정상이면 그대로 렌더한다', () => {
    const { container } = render(
      <ErrorBoundary>
        <p>정상 콘텐츠</p>
      </ErrorBoundary>
    )

    expect(container.textContent).toContain('정상 콘텐츠')
    expect(container.textContent).not.toContain('문제가 발생했어요')
  })

  it('렌더 throw를 잡아 한글 alert 폴백을 보여준다', () => {
    // React가 잡은 에러를 console.error로 흘리므로 테스트 출력만 정리한다.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )

    const alert = container.querySelector('[role="alert"]')
    expect(alert).not.toBeNull()
    expect(alert?.id).toBe('main-content')
    expect(container.querySelector('h1')?.textContent).toBe('문제가 발생했어요')

    const buttonLabels = [...container.querySelectorAll('button')].map((b) => b.textContent)
    expect(buttonLabels).toContain('다시 시도')
    expect(buttonLabels).toContain('홈으로')
    spy.mockRestore()
  })
})
