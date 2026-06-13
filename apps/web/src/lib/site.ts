// 사이트 전역 상수 — 빌드타임 SEO 산출물(robots.ts / sitemap.ts)이 공유한다.
//
// build-once, deploy-many: robots.txt·sitemap.xml은 같은 out/ 번들에 담겨
// preview(/pr-<n>/)·staging(/staging/...)·production 모든 위치로 복사된다.
// 환경별로 내용을 갈라낼 수 없으므로 canonical origin은 "공개 production URL"
// 하나로 고정한다. 비-production 사본에 대한 robots disallow 는 단일 호스트
// path-prefix 배치에만 유효한 방어선이고(상세: app/robots.ts 주석), 호스트가
// 갈리는 배치(커스텀 도메인 preview·origin_path 분리 staging)와 살아있는 중복
// 호스트(README §10 의 S3 website URL)는 robots 로 막지 못한다 — 그쪽 경계는
// 접근 제어/X-Robots-Tag 이고, 중복 호스트 색인은 canonical 메타데이터 영역이다.
// 공개 URL이 바뀌면 이 값과 README §10(현재 공개 URL)을 함께 갱신한다.
export const SITE_URL = 'https://multi-beta-guide.vercel.app'
