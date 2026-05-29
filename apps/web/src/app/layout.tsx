import type { ReactNode } from 'react';

export const metadata = {
  title: 'Multi-Environment Demo',
  description: '다중 개발 서버 레퍼런스 예제 앱',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, background: '#0b1020', color: '#e7ecff' }}>
        {children}
      </body>
    </html>
  );
}
