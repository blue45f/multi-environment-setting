import { useEffect } from 'react';

// Next route-segment `export const metadata` 대체 훅.
// 각 라우트 컴포넌트가 자신의 title/description으로 호출하면, 클라이언트 내비게이션
// 시점에 document.title 과 <meta name="description"> 를 동기화한다. OG 크롤러가 보는
// 기본값은 index.html 의 정적 메타이고, 이 훅은 탭 타이틀과 description 만 갱신한다.

const DEFAULT_TITLE = 'Multi-Environment Demo — Build once · Deploy many 멀티환경 레퍼런스';

type PageMeta = {
  title?: string;
  description?: string;
};

function setMetaContent(name: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

export function usePageMeta({ title, description }: PageMeta): void {
  useEffect(() => {
    document.title = title ?? DEFAULT_TITLE;
    if (description) {
      setMetaContent('description', description);
    }
  }, [title, description]);
}
