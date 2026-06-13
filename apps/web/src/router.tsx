import { createBrowserRouter } from 'react-router-dom'

import { IntroLayout } from './components/IntroLayout'
import { RootLayout } from './components/RootLayout'
import { HomePage } from './pages/HomePage'
import { GeneratorPage } from './pages/intro/GeneratorPage'
import { IntroPage } from './pages/intro/IntroPage'
import { OperationsPage } from './pages/intro/OperationsPage'
import { ScriptsPage } from './pages/intro/ScriptsPage'
import { SetupPage } from './pages/intro/SetupPage'
import { TheoryPage } from './pages/intro/TheoryPage'
import { NotFoundPage } from './pages/NotFoundPage'

// SPA 라우터. base가 상대('./')이므로 createBrowserRouter는 history API를 그대로 쓰고,
// 호스팅이 확장자 없는 경로를 index.html로 폴백하면(dev/preview 자동, CloudFront Function)
// 모든 라우트가 클라이언트에서 해석된다. small app이라 직접 import(코드 스플릿 생략).
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'intro',
        element: <IntroLayout />,
        children: [
          { index: true, element: <IntroPage /> },
          { path: 'theory', element: <TheoryPage /> },
          { path: 'setup', element: <SetupPage /> },
          { path: 'scripts', element: <ScriptsPage /> },
          { path: 'operations', element: <OperationsPage /> },
          { path: 'generator', element: <GeneratorPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
