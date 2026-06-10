import Link from 'next/link';

// 루트 not-found — 정적 export(output: 'export')가 이 컴포넌트를 out/404.html 로 내보낸다.
// S3/CloudFront(및 Vercel)는 미스난 경로에 그 파일을 그대로 서빙하므로, 인프라 수정 없이
// 이 화면이 곧 사용자가 보는 실제 404 페이지다. 멀티환경 특성상 닫힌 PR의 /pr-<번호>/
// 링크 진입이 가장 흔한 404 시나리오라, 일반 안내 대신 cleanup 맥락을 함께 설명한다.
export const metadata = {
  title: '페이지를 찾을 수 없음 · Multi-Environment Demo',
};

export default function NotFound() {
  return (
    <main id="content" className="demo-page">
      <section className="hero-shell" aria-labelledby="not-found-title">
        <div className="topbar" aria-label="데모 탐색">
          <Link className="brand-chip" href="/">
            <span aria-hidden="true" className="brand-chip__grid" />
            Multi-env Lab
          </Link>
        </div>

        <div className="hero-copy">
          <p className="eyebrow">404 · Not Found</p>
          <h1 id="not-found-title">이 경로에는 배포된 산출물이 없습니다</h1>
          <p className="hero-lede">
            주소가 잘못되었거나, 수명이 끝난 임시 환경일 수 있습니다. PR preview의{' '}
            <code>{'/pr-<번호>/'}</code> 경로는 PR이 닫히면 cleanup 워크플로가 정리하므로, 리뷰가
            끝난 링크는 다시 열리지 않습니다.
          </p>
          <div className="hero-actions" aria-label="다음 행동">
            <Link className="primary-action" href="/">
              데모 홈으로 이동
            </Link>
            <Link className="secondary-action" href="/intro">
              아키텍처 가이드 보기
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
