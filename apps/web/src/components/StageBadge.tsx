import { stageMeta } from '@/lib/stages'

// 배포 스테이지 배지 — preview/staging/production 을 색 + 기호(◆▲●) + 라벨로 함께
// 표기하는 시그니처 프리미티브(WCAG 1.4.1: 색만으로 의미를 전달하지 않는다).
// HomePage 의 런타임 stage 표시와 /design 갤러리가 같은 컴포넌트를 공유한다.
// 스테이지 데이터(stageMeta · environmentOrder)는 lib/stages 에서 가져온다.

export function StageBadge({ stage, testId }: { stage?: string; testId?: string }) {
  const meta = stage ? stageMeta[stage] : undefined

  return (
    <span
      data-testid={testId}
      title={meta ? `${meta.label} 환경` : undefined}
      className="stage-badge"
      style={{
        background: meta?.bg ?? 'var(--app-panel-2)',
        borderColor: meta?.dot ?? 'var(--app-line-strong)',
        color: meta?.fg ?? 'var(--app-ink-muted)',
      }}
    >
      <span
        aria-hidden="true"
        className="stage-badge__mark"
        style={{ background: meta?.dot ?? 'var(--app-line-strong)' }}
      >
        {meta?.symbol ?? ''}
      </span>
      <span className="mono">{stage ?? 'loading...'}</span>
    </span>
  )
}
