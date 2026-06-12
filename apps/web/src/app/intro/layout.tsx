import Link from 'next/link';
import type { ReactNode } from 'react';

const guideLinks = [
  { href: '/intro', label: '개요' },
  { href: '/intro/setup', label: '설정' },
  { href: '/intro/scripts', label: '스크립트' },
  { href: '/intro/operations', label: '운영' },
];

export default function IntroLayout({ children }: { children: ReactNode }) {
  return (
    <main id="content" className="intro-page">
      <nav className="guide-route-nav" aria-label="소개 페이지 라우터">
        <Link className="back-link" href="/">
          ← 데모로 돌아가기
        </Link>
        <div className="guide-route-nav__links">
          {guideLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </main>
  );
}
