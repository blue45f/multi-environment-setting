import Link from 'next/link';
import fs from 'fs';
import path from 'path';

import { scriptCatalog, scriptPrinciples, scriptRunFlows } from '../guide-data';

export const metadata = {
  title: '멀티베타 환경 개발가이드 · 스크립트',
  description: '멀티베타 환경 구축과 운영에 쓰는 스크립트 사용법과 안전장치',
};

function getScriptContent(scriptName: string): string {
  try {
    const basePath = process.cwd();
    // Next.js dev/build process runs in apps/web, so root scripts are at ../../scripts
    let scriptsPath = path.join(basePath, '../../scripts', scriptName);

    if (!fs.existsSync(scriptsPath)) {
      // Fallback: search upward if running from a different directory
      let current = basePath;
      for (let i = 0; i < 5; i++) {
        const candidate = path.join(current, 'scripts', scriptName);
        if (fs.existsSync(candidate)) {
          scriptsPath = candidate;
          break;
        }
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }

    return fs.readFileSync(scriptsPath, 'utf8');
  } catch (err) {
    console.error(`Failed to read script ${scriptName}:`, err);
    return `# Error reading script file: ${scriptName}`;
  }
}

function tokenizeCodeLine(line: string) {
  const tokenRegex =
    /(#.*)|("[^"]*")|('[^']*')|(\$[a-zA-Z0-9_]+|\$\{[a-zA-Z0-9_]+\})|\b(if|then|else|fi|exit|echo|set|cd|for|in|do|done|function|return|local|export|eval|printf)\b/g;

  let lastIndex = 0;
  const result: React.ReactNode[] = [];
  let match;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      result.push(line.substring(lastIndex, match.index));
    }

    const [lexeme, comment, dstr, sstr, variable, keyword] = match;

    if (comment) {
      result.push(
        <span key={`c-${match.index}`} className="script-code-comment">
          {lexeme}
        </span>,
      );
    } else if (dstr || sstr) {
      result.push(
        <span key={`s-${match.index}`} className="script-code-string">
          {lexeme}
        </span>,
      );
    } else if (variable) {
      result.push(
        <span key={`v-${match.index}`} className="script-code-variable">
          {lexeme}
        </span>,
      );
    } else if (keyword) {
      result.push(
        <span key={`k-${match.index}`} className="script-code-keyword">
          {lexeme}
        </span>,
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    result.push(line.substring(lastIndex));
  }

  return result.length > 0 ? result : line || '\u00A0';
}

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
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          <a
            href="https://github.com/blue45f/multi-environment-setting/blob/main/docs/DEVELOPMENT.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: 'var(--app-accent)',
              textDecoration: 'none',
              fontWeight: 600,
              padding: '6px 14px',
              borderRadius: '20px',
              background: 'var(--app-panel)',
              border: '1px solid var(--app-line-strong)',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--app-shadow-sm)',
            }}
            className="original-link-badge"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            GitHub 원본 가이드 보기
          </a>
        </div>
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
          {scriptCatalog.map((script) => {
            const content = getScriptContent(script.name);
            const lines = content.split('\n');

            return (
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
                <div className="script-row__code">
                  <details className="script-code-details">
                    <summary className="script-code-summary">
                      <span>실제 구현 스크립트 보기 ({script.name})</span>
                    </summary>
                    <div className="script-code-viewport">
                      <pre className="script-code-pre">
                        {lines.map((line, idx) => (
                          <div key={idx} className="script-code-line">
                            <span className="script-code-line-number">{idx + 1}</span>
                            <span className="script-code-line-text">{tokenizeCodeLine(line)}</span>
                          </div>
                        ))}
                      </pre>
                    </div>
                  </details>
                </div>
              </article>
            );
          })}
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
