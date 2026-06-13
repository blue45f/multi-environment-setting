import PwaRegister from './PwaRegister';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata = {
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  title: 'Multi-Environment Demo — Build once · Deploy many 멀티환경 레퍼런스',
  description:
    'PR마다 격리된 preview, staging 검증, production 승격까지 — 한 번 빌드한 정적 산출물에 env.json만 갈아끼워 배포하는 S3+CloudFront·GitHub OIDC 멀티환경 레퍼런스',
};

// no-FOUC pre-paint: 첫 페인트 전에 저장된 테마 선호를 <html data-theme>에 박는다.
// 'system'(or 미설정)이면 data-theme를 비워 globals.css의 prefers-color-scheme가 결정한다.
// globals.css 토큰이 [data-theme] 와 prefers-color-scheme 둘 다를 다루므로,
// 이 스크립트는 깜빡임(light→dark 점프)만 막는 역할이다.
const noFoucScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

const LEGAL_LINKS = {
  terms: 'https://termsdesk.vercel.app/p/multi-environment-setting/terms-of-service',
  privacy: 'https://termsdesk.vercel.app/p/multi-environment-setting/privacy-policy',
  support: 'https://termsdesk.vercel.app/support/multi-environment-setting',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFoucScript }} />
      </head>
      <body>
        <a className="skip-link" href="#content">
          본문으로 건너뛰기
        </a>
        <PwaRegister />
        {children}
        <footer className="global-site-footer" aria-label="법적 고지">
          <nav>
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
      </body>
    </html>
  );
}
