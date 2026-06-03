import type { ReactNode } from 'react';

export const metadata = {
  title: 'Multi-Environment Demo',
  description: '다중 개발 서버 레퍼런스 예제 앱',
};

// 전역 a11y 스타일: 키보드 포커스 링(:focus-visible)과 스크린리더 전용 유틸,
// 그리고 모션 최소화 선호 존중. 무거운 디자인 시스템 없이 인라인 <style>로 최소화.
const globalA11yCss = `
  *:focus-visible {
    outline: 2px solid #9fb0e0;
    outline-offset: 2px;
    border-radius: 4px;
  }
  .skip-link {
    position: absolute;
    left: 8px;
    top: -48px;
    z-index: 100;
    padding: 8px 16px;
    background: #6c8cff;
    color: #0b1020;
    font-weight: 600;
    text-decoration: none;
    border-radius: 8px;
    transition: top 0.15s ease;
  }
  .skip-link:focus {
    top: 8px;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <style dangerouslySetInnerHTML={{ __html: globalA11yCss }} />
      </head>
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          margin: 0,
          background: '#0b1020',
          color: '#e7ecff',
        }}
      >
        <a className="skip-link" href="#content">
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}
