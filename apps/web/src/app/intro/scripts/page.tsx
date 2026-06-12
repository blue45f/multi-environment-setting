import Link from 'next/link';

import { scriptCatalog, scriptPrinciples, scriptRunFlows } from '../guide-data';

export const metadata = {
  title: '멀티베타 환경 개발가이드 · 스크립트',
  description: '멀티베타 환경 구축과 운영에 쓰는 스크립트 사용법과 안전장치',
};

export default function ScriptsPage() {
  return (
    <>
      <section className="guide-page-hero" aria-labelledby="scripts-page-title">
        <p className="eyebrow">ready-made scripts</p>
        <h1 id="scripts-page-title">간단 적용 스크립트 사용법</h1>
        <p>
          긴 클라우드 명령을 직접 외우지 않도록 `Makefile`이 단일 진입점 역할을 합니다. 각
          스크립트는 한 가지 책임만 갖고, 실패 조건과 삭제 범위를 코드 안에서 제한합니다.
        </p>
      </section>

      <section className="guide-scripts" aria-labelledby="scripts-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">recommended order</p>
          <h2 id="scripts-title">목적별 실행 순서</h2>
          <p>
            아래 순서대로 실행하면 로컬 검증, 초기 구축, 서비스 추가, 운영 대응까지 같은 규칙으로
            이어집니다.
          </p>
        </div>

        <div className="script-flow-grid" aria-label="추천 스크립트 실행 순서">
          {scriptRunFlows.map((flow) => (
            <article key={flow.title} className="script-flow-card">
              <h3>{flow.title}</h3>
              <pre>
                <code>{flow.commands.join('\n')}</code>
              </pre>
              <p>{flow.note}</p>
            </article>
          ))}
        </div>

        <div className="script-list">
          {scriptCatalog.map((script) => (
            <article key={script.name} className="script-row">
              <div className="script-row__summary">
                <span>{script.category}</span>
                <code>{script.name}</code>
                <h3>{script.purpose}</h3>
              </div>
              <div className="script-row__command">
                <span className="script-meta-label">대표 명령</span>
                <pre>
                  <code>{script.command}</code>
                </pre>
                <p>
                  <strong>언제 쓰나:</strong> {script.when}
                </p>
                <p>
                  <strong>안전 원리:</strong> {script.principle}
                </p>
              </div>
              <div className="script-row__details">
                <div className="script-detail-block">
                  <strong>필요 값</strong>
                  <ul>
                    {script.inputs.map((input) => (
                      <li key={input}>{input}</li>
                    ))}
                  </ul>
                </div>
                <div className="script-detail-block">
                  <strong>실행 흐름</strong>
                  <ol>
                    {script.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                <p className="script-caution">
                  <strong>주의:</strong> {script.caution}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-script-theory" aria-labelledby="script-theory-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">script theory</p>
          <h2 id="script-theory-title">스크립트가 단순해 보이지만 안전하게 동작하는 원리</h2>
        </div>

        <div className="script-theory-grid">
          {scriptPrinciples.map((item) => (
            <article key={item.title} className="script-theory-card">
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-footer" aria-label="다음 행동">
        <div>
          <p className="eyebrow">Next route</p>
          <h2>운영 책임과 용어로 이어서 이동</h2>
        </div>
        <Link className="guide-cta" href="/intro/operations">
          운영 페이지로 이동
        </Link>
      </section>
    </>
  );
}
