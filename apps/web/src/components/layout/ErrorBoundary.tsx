import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
  /** 바운더리 리셋(다시 시도) 시 함께 호출 — 추후 쿼리/스토어 에러 리셋 연결용. */
  onReset?: () => void
}

type ErrorBoundaryState = {
  error: Error | null
}

// 컴포넌트 레벨 에러 바운더리 — 라우터 errorElement가 잡지 못하는 렌더 throw
// (lazy 청크 로드 실패, 프로바이더 트리 예외 등)가 전체 SPA를 백스크린으로 만드는 것을 막는다.
// 에러 바운더리는 클래스 컴포넌트로만 구현되므로 여기만 예외적으로 클래스를 쓴다.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // 사용자에겐 원문 노출하지 않되, 운영 모니터링 전송 지점 + 디버깅을 위해 콘솔엔 남긴다.
    console.error('Unhandled render error:', error, info.componentStack)
  }

  private handleReset = (): void => {
    this.props.onReset?.()
    this.setState({ error: null })
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <main id="main-content" tabIndex={-1} role="alert" className="demo-page">
          <section className="hero-shell" aria-labelledby="error-title">
            <div className="hero-copy">
              <p className="eyebrow">Unexpected error</p>
              <h1 id="error-title">문제가 발생했어요</h1>
              <p className="hero-lede">
                예상치 못한 오류로 화면을 표시하지 못했어요. 다시 시도하거나 홈으로 돌아가 주세요.
              </p>
              <div className="hero-actions" aria-label="다음 행동">
                <button type="button" className="primary-action" onClick={this.handleReset}>
                  다시 시도
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => {
                    globalThis.location.href = '/'
                  }}
                >
                  홈으로
                </button>
              </div>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
