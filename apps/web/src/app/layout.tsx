import type { ReactNode } from 'react';

import './globals.css';

export const metadata = {
  title: 'Multi-Environment Demo',
  description: '다중 개발 서버 레퍼런스 예제 앱',
};

// no-FOUC pre-paint: 첫 페인트 전에 저장된 테마 선호를 <html data-theme>에 박는다.
// 'system'(or 미설정)이면 data-theme를 비워 globals.css의 prefers-color-scheme가 결정한다.
// globals.css 토큰이 [data-theme] 와 prefers-color-scheme 둘 다를 다루므로,
// 이 스크립트는 깜빡임(light→dark 점프)만 막는 역할이다.
const noFoucScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

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
        {children}
      </body>
    </html>
  );
}
