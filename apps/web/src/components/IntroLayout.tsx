import { Link, Outlet } from 'react-router-dom';

const guideLinks = [
  { to: '/intro', label: '개요' },
  { to: '/intro/theory', label: '이론 가이드' },
  { to: '/intro/setup', label: '설정' },
  { to: '/intro/scripts', label: '스크립트' },
  { to: '/intro/operations', label: '운영' },
  { to: '/intro/generator', label: '설계 제너레이터' },
];

export function IntroLayout() {
  return (
    <main id="content" className="intro-page">
      <nav className="guide-route-nav" aria-label="소개 페이지 라우터">
        <Link className="back-link" to="/">
          ← 데모로 돌아가기
        </Link>
        <div className="guide-route-nav__links">
          {guideLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <Outlet />
    </main>
  );
}
