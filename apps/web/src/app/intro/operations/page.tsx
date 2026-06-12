import Link from 'next/link';

import { environmentModes, glossary, principles, walkthrough } from '../guide-data';

export const metadata = {
  title: '멀티베타 환경 개발가이드 · 운영',
  description: '멀티베타 환경의 운영 책임, 아키텍처 원칙, 시나리오와 용어',
};

export default function OperationsPage() {
  return (
    <>
      <section className="guide-page-hero" aria-labelledby="operations-title">
        <p className="eyebrow">operations route</p>
        <h1 id="operations-title">운영 책임과 설명용 용어</h1>
        <p>
          preview, staging, production은 같은 앱을 다른 책임과 권한으로 다루는 환경입니다. 이
          페이지는 운영 담당자나 리뷰어에게 “누가 언제 무엇을 확인하는지” 설명하기 위한 기준입니다.
        </p>
      </section>

      <section className="guide-principles" aria-labelledby="principles-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Architecture principles</p>
          <h2 id="principles-title">아키텍처 핵심 원리</h2>
        </div>

        <div className="principles-grid">
          {principles.map((item) => (
            <article key={item.title} className="principle-card">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-modes" aria-labelledby="modes-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Environment playbook</p>
          <h2 id="modes-title">환경별 운영 책임 분리</h2>
        </div>
        <div className="mode-grid">
          {environmentModes.map((mode) => (
            <article key={mode.name} className="mode-card">
              <div className="mode-card__top">
                <strong>{mode.name}</strong>
                <code>{mode.route}</code>
              </div>
              <dl>
                <div>
                  <dt>Owner</dt>
                  <dd>{mode.owner}</dd>
                </div>
                <div>
                  <dt>Trigger</dt>
                  <dd>{mode.trigger}</dd>
                </div>
              </dl>
              <p>{mode.purpose}</p>
              <ul>
                {mode.checks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-demo" aria-labelledby="demo-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Interactive mental model</p>
          <h2 id="demo-title">초보자용 시나리오로 확인</h2>
        </div>
        <div className="walkthrough-list">
          {walkthrough.map((item) => (
            <article key={item.title}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="guide-glossary" aria-labelledby="glossary-title">
        <div className="section-heading section-heading--wide">
          <p className="eyebrow">Glossary</p>
          <h2 id="glossary-title">용어사전</h2>
          <p>처음 접하는 용어를 한 줄 정의로 정리했습니다.</p>
        </div>
        <dl className="glossary-list">
          {glossary.map((entry) => (
            <div key={entry.term} className="glossary-item">
              <dt>{entry.term}</dt>
              <dd>{entry.definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="guide-footer" aria-label="다음 행동">
        <div>
          <p className="eyebrow">Back to overview</p>
          <h2>개요로 돌아가 전체 흐름을 다시 확인</h2>
        </div>
        <Link className="guide-cta" href="/intro">
          개요 페이지로 이동
        </Link>
      </section>
    </>
  );
}
