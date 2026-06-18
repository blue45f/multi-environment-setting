import { Link, Outlet } from 'react-router-dom'

import { RouteAnnouncer } from './layout/RouteAnnouncer'
import { PwaRegister } from './PwaRegister'

// 루트 레이아웃 — Next app/layout.tsx 의 <html>/<body> 골격은 index.html 로 이동했고,
// 여기서는 스킵 링크 · PWA 등록 · 라우트 본문(<Outlet/>) · 전역 푸터만 렌더한다.
const LEGAL_LINKS = {
  terms: 'https://termsdesk.vercel.app/p/multi-environment-setting/terms-of-service',
  privacy: 'https://termsdesk.vercel.app/p/multi-environment-setting/privacy-policy',
  support: 'https://termsdesk.vercel.app/support/multi-environment-setting',
}

export function RootLayout() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <PwaRegister />
      <RouteAnnouncer />
      <Outlet />
      <footer className="global-site-footer" aria-label="법적 고지">
        <nav>
          <Link to="/design">디자인 시스템</Link>
          <a href={LEGAL_LINKS.terms} target="_blank" rel="noreferrer">
            이용약관
          </a>
          <a href={LEGAL_LINKS.privacy} target="_blank" rel="noreferrer">
            개인정보처리방침
          </a>
          <a href={LEGAL_LINKS.support} target="_blank" rel="noreferrer">
            지원
          </a>
        </nav>
        <p>Multi Environment Setting · TermsDesk 포트폴리오</p>
      </footer>
    </>
  )
}
