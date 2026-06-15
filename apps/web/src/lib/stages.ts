// 배포 스테이지 메타데이터 — preview / staging / production 의 색 토큰 참조, 기호,
// 라벨, 문서 설명을 한곳에서 관리한다. StageBadge 컴포넌트와 HomePage / DesignPage 가
// 공유한다(컴포넌트 파일과 분리해 fast-refresh 경계를 깨끗하게 유지).

export type StageMeta = {
  label: string
  headline: string
  symbol: string
  dot: string
  bg: string
  fg: string
  description: string
  route: string
  deployTrigger: string
  promotion: string
}

export const stageMeta: Record<string, StageMeta> = {
  preview: {
    label: 'Preview',
    headline: 'PR마다 격리된 임시 환경',
    symbol: '◆',
    dot: 'var(--stage-preview)',
    bg: 'var(--stage-preview-bg)',
    fg: 'var(--stage-preview-fg)',
    description:
      'Pull Request 단위로 /pr-<번호>/ 경로가 생기고, 같은 빌드 산출물에 env.json만 주입됩니다.',
    route: '/pr-123/',
    deployTrigger: 'pull_request',
    promotion: '리뷰가 끝나면 staging으로 승격',
  },
  staging: {
    label: 'Staging',
    headline: '릴리즈 전 검증 환경',
    symbol: '▲',
    dot: 'var(--stage-staging)',
    bg: 'var(--stage-staging-bg)',
    fg: 'var(--stage-staging-fg)',
    description: 'main 또는 수동 배포가 production 전에 staging/current prefix를 먼저 갱신합니다.',
    route: '/staging/current/',
    deployTrigger: 'push main / workflow_dispatch',
    promotion: '스모크 테스트 통과 후 production 배포',
  },
  production: {
    label: 'Production',
    headline: '사용자가 보는 운영 환경',
    symbol: '●',
    dot: 'var(--stage-production)',
    bg: 'var(--stage-production-bg)',
    fg: 'var(--stage-production-fg)',
    description:
      '검증된 정적 산출물을 production/current prefix로 복사하고 CloudFront invalidation을 수행합니다.',
    route: '/production/current/',
    deployTrigger: 'manual approval',
    promotion: '릴리즈 완료 후 release artifact 보관',
  },
}

export const environmentOrder = ['preview', 'staging', 'production'] as const
