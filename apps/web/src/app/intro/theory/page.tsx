import fs from 'fs';
import path from 'path';

import { MermaidDiagram } from '../MermaidDiagram';
import Link from 'next/link';

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'hr' };

function parseMarkdown(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code Block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      let code = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      blocks.push({ type: 'code', lang, code: code.trim() });
      i++;
      continue;
    }

    // 2. Headings
    if (line.trim().startsWith('#')) {
      const match = line.match(/^(#+)\s+(.*)$/);
      if (match) {
        blocks.push({
          type: 'heading',
          level: match[1].length,
          text: match[2].trim(),
        });
      }
      i++;
      continue;
    }

    // 3. Blockquote
    if (line.trim().startsWith('>')) {
      let text = '';
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        const content = lines[i].trim().slice(1).trim();
        text += (text ? ' ' : '') + content;
        i++;
      }
      blocks.push({ type: 'blockquote', text });
      continue;
    }

    // 4. Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 5. Table
    if (line.trim().startsWith('|')) {
      const headers = line
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      i++; // Move past header
      // Check for separator line (e.g., |---|---|)
      if (i < lines.length && lines[i].trim().startsWith('|') && lines[i].includes('-')) {
        i++;
      }

      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowCells = lines[i]
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        rows.push(rowCells);
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // 6. List
    const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[2]);
      const items: string[] = [];

      while (i < lines.length) {
        const itemMatch = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (!itemMatch) break;
        items.push(itemMatch[3].trim());
        i++;
      }

      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    // 7. Empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 8. Paragraph (default fallback)
    let pText = line.trim();
    i++;
    // Accumulate consecutive paragraph lines
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('|') &&
      !lines[i].trim().startsWith('```') &&
      !/^(\s*)([-*+]|\d+\.)\s+/.test(lines[i])
    ) {
      pText += ' ' + lines[i].trim();
      i++;
    }
    blocks.push({ type: 'paragraph', text: pText });
  }

  return blocks;
}

// Helper to render inline markdown elements (bold, code, links)
function renderInlineText(text: string) {
  // Simple regex replacements for bold (`**text**`), code (`` `code` ``), and links (`[text](url)`)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    const boldIndex = remaining.indexOf('**');
    const codeIndex = remaining.indexOf('`');
    const linkIndex = remaining.indexOf('[');

    const minIdx = Math.min(
      boldIndex === -1 ? Infinity : boldIndex,
      codeIndex === -1 ? Infinity : codeIndex,
      linkIndex === -1 ? Infinity : linkIndex,
    );

    if (minIdx === Infinity) {
      parts.push(remaining);
      break;
    }

    // Add prefix plain text
    if (minIdx > 0) {
      parts.push(remaining.substring(0, minIdx));
      remaining = remaining.substring(minIdx);
    }

    if (remaining.startsWith('**')) {
      const endIdx = remaining.indexOf('**', 2);
      if (endIdx !== -1) {
        parts.push(<strong key={keyIdx++}>{remaining.substring(2, endIdx)}</strong>);
        remaining = remaining.substring(endIdx + 2);
      } else {
        parts.push('**');
        remaining = remaining.substring(2);
      }
    } else if (remaining.startsWith('`')) {
      const endIdx = remaining.indexOf('`', 1);
      if (endIdx !== -1) {
        parts.push(
          <code
            className="mono"
            style={{
              background: 'var(--app-panel-2)',
              padding: '2px 4px',
              borderRadius: '4px',
              fontSize: '0.9em',
            }}
            key={keyIdx++}
          >
            {remaining.substring(1, endIdx)}
          </code>,
        );
        remaining = remaining.substring(endIdx + 1);
      } else {
        parts.push('`');
        remaining = remaining.substring(1);
      }
    } else if (remaining.startsWith('[')) {
      const closingBracket = remaining.indexOf(']');
      const openingParen = remaining.indexOf('(', closingBracket);
      const closingParen = remaining.indexOf(')', openingParen);

      if (closingBracket !== -1 && openingParen === closingBracket + 1 && closingParen !== -1) {
        const linkText = remaining.substring(1, closingBracket);
        const linkUrl = remaining.substring(openingParen + 1, closingParen);

        // Render external or internal link
        if (linkUrl.startsWith('http') || linkUrl.startsWith('mailto')) {
          parts.push(
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--app-accent)', textDecoration: 'underline' }}
              key={keyIdx++}
            >
              {linkText}
            </a>,
          );
        } else {
          // Normalize relative local path guides to our UI sections if applicable
          parts.push(
            <span style={{ color: 'var(--app-ink)', fontWeight: 700 }} key={keyIdx++}>
              {linkText}
            </span>,
          );
        }
        remaining = remaining.substring(closingParen + 1);
      } else {
        parts.push('[');
        remaining = remaining.substring(1);
      }
    }
  }

  return parts;
}

function cleanMermaidChart(chart: string): string {
  return chart.replace(/<br\s*\/?>/gi, '\\n').replace(/</g, '&lt;');
}

export const metadata = {
  title: '멀티베타 환경 개발가이드 · 이론 상세',
  description: '다중 개발 서버 구축 가이드 이론 상세 설명 및 구현 원칙',
};

export default function TheoryPage() {
  const filePath = path.join(process.cwd(), 'src/app/intro/theory.md');
  let blocks: Block[] = [];

  try {
    const mdContent = fs.readFileSync(filePath, 'utf-8');
    blocks = parseMarkdown(mdContent);
  } catch (error) {
    console.error('Failed to read theory.md:', error);
  }

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100vh', color: 'var(--app-ink)' }}>
      {/* Page Hero */}
      <section
        className="guide-page-hero"
        aria-labelledby="theory-page-title"
        style={{ paddingBottom: '30px' }}
      >
        <p className="eyebrow" style={{ color: 'var(--app-accent)' }}>
          Baseline theory
        </p>
        <h1 id="theory-page-title" style={{ fontWeight: 900 }}>
          27. 다중 개발 서버 구축 가이드
        </h1>
        <p>
          다중 개발 서버 구축을 위한 운영 원칙, 환경 목적 분리 방식, 보안 권한 정책, 그리고
          클린업/비용 통제 전략에 대한 상세 이론 문서입니다.
        </p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
          <a
            href="https://github.com/blue45f/heejun/blob/main/public/%EA%B0%9C%EB%B0%9C%EA%B0%80%EC%9D%B4%EB%93%9C/27_%EB%8B%A4%EC%A4%91_%EA%B0%9C%EB%B0%9C_%EC%84%9C%EB%B2%84_%EA%B5%AC%EC%B6%95_%EA%B0%80%EC%9D%B4%EB%93%9C.md"
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

      {/* Content Section */}
      <section
        style={{
          width: 'min(1180px, calc(100% - clamp(32px, 7vw, 96px)))',
          marginInline: 'auto',
          paddingBottom: '80px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div
          style={{
            background: 'var(--app-panel)',
            border: '1px solid var(--app-line-strong)',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: 'var(--app-shadow)',
            lineHeight: '1.75',
          }}
          className="theory-document-container"
        >
          {blocks.map((block, idx) => {
            switch (block.type) {
              case 'heading': {
                const level = Math.min(block.level + 1, 6);
                const id = block.text.toLowerCase().replace(/[^a-z0-9ㄱ-ㅎㅏ-ㅣ가-힣]/g, '-');
                const borderBottom = block.level <= 2 ? '1px solid var(--app-line)' : 'none';
                const marginTop = block.level === 1 ? '40px' : block.level === 2 ? '32px' : '20px';
                const paddingBottom = block.level <= 2 ? '8px' : '0';

                const headingStyle = {
                  marginTop,
                  marginBottom: '16px',
                  fontWeight: 800,
                  borderBottom,
                  paddingBottom,
                  color: block.level === 1 ? 'var(--app-ink)' : 'var(--app-ink-muted)',
                };

                if (level === 1)
                  return (
                    <h1 key={idx} id={id} style={headingStyle}>
                      {block.text}
                    </h1>
                  );
                if (level === 2)
                  return (
                    <h2 key={idx} id={id} style={headingStyle}>
                      {block.text}
                    </h2>
                  );
                if (level === 3)
                  return (
                    <h3 key={idx} id={id} style={headingStyle}>
                      {block.text}
                    </h3>
                  );
                if (level === 4)
                  return (
                    <h4 key={idx} id={id} style={headingStyle}>
                      {block.text}
                    </h4>
                  );
                if (level === 5)
                  return (
                    <h5 key={idx} id={id} style={headingStyle}>
                      {block.text}
                    </h5>
                  );
                return (
                  <h6 key={idx} id={id} style={headingStyle}>
                    {block.text}
                  </h6>
                );
              }
              case 'paragraph':
                return (
                  <p
                    key={idx}
                    style={{ marginBottom: '16px', fontSize: '15px', color: 'var(--app-ink)' }}
                  >
                    {renderInlineText(block.text)}
                  </p>
                );
              case 'blockquote':
                return (
                  <blockquote
                    key={idx}
                    style={{
                      borderLeft: '4px solid var(--app-accent)',
                      background: 'var(--app-panel-2)',
                      padding: '16px 20px',
                      borderRadius: '0 8px 8px 0',
                      margin: '0 0 20px 0',
                      fontSize: '14px',
                      color: 'var(--app-ink-muted)',
                      fontStyle: 'normal',
                    }}
                  >
                    {renderInlineText(block.text)}
                  </blockquote>
                );
              case 'hr':
                return (
                  <hr
                    key={idx}
                    style={{
                      border: 'none',
                      borderTop: '1px solid var(--app-line)',
                      margin: '32px 0',
                    }}
                  />
                );
              case 'list': {
                const ListTag = block.ordered ? 'ol' : 'ul';
                return (
                  <ListTag
                    key={idx}
                    style={{ paddingLeft: '24px', marginBottom: '20px', fontSize: '15px' }}
                  >
                    {block.items.map((item, itemIdx) => (
                      <li key={itemIdx} style={{ marginBottom: '8px' }}>
                        {renderInlineText(item)}
                      </li>
                    ))}
                  </ListTag>
                );
              }
              case 'code': {
                if (block.lang === 'mermaid') {
                  return (
                    <div
                      key={idx}
                      style={{
                        margin: '24px 0',
                        padding: '16px',
                        border: '1px solid var(--app-line)',
                        borderRadius: '12px',
                        background: 'var(--app-panel-2)',
                      }}
                    >
                      <MermaidDiagram
                        chart={cleanMermaidChart(block.code)}
                        title="이론 다이어그램"
                      />
                    </div>
                  );
                }
                return (
                  <pre
                    key={idx}
                    style={{
                      background: 'var(--app-panel-2)',
                      padding: '16px',
                      borderRadius: '8px',
                      overflowX: 'auto',
                      fontSize: '13px',
                      border: '1px solid var(--app-line)',
                      marginBottom: '20px',
                      fontFamily: 'monospace',
                    }}
                  >
                    <code>{block.code}</code>
                  </pre>
                );
              }
              case 'table':
                return (
                  <div key={idx} style={{ overflowX: 'auto', marginBottom: '24px' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '14px',
                        textAlign: 'left',
                      }}
                    >
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--app-line-strong)' }}>
                          {block.headers.map((h, hIdx) => (
                            <th key={hIdx} style={{ padding: '10px 12px', fontWeight: 800 }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {block.rows.map((row, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid var(--app-line)' }}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} style={{ padding: '10px 12px' }}>
                                {renderInlineText(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              default:
                return null;
            }
          })}
        </div>

        {/* Footer Navigation */}
        <section
          className="guide-footer"
          aria-label="다음 행동"
          style={{ width: '100%', margin: '40px 0 0' }}
        >
          <div>
            <p className="eyebrow">Next route</p>
            <h2>플랫폼별 아키텍처 구축 설정 가이드</h2>
          </div>
          <Link className="guide-cta" href="/intro/setup">
            설정 페이지로 이동
          </Link>
        </section>
      </section>
    </div>
  );
}
