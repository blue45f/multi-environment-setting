'use client';

import { useEffect, useId, useState } from 'react';

type MermaidDiagramProps = {
  chart: string;
  title: string;
};

export function MermaidDiagram({ chart, title }: MermaidDiagramProps) {
  const reactId = useId();
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

    async function render() {
      try {
        setError(null);
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          themeVariables: {
            background: '#fbfaf7',
            primaryColor: '#fbfaf7',
            primaryTextColor: '#2f2b27',
            primaryBorderColor: '#cfc6ba',
            lineColor: '#6653d9',
            secondaryColor: '#f0ece5',
            tertiaryColor: '#f7f4ee',
            fontFamily:
              'Avenir Next, Trebuchet MS, Apple SD Gothic Neo, Malgun Gothic, system-ui, sans-serif',
          },
        });

        const rendered = await mermaid.render(renderId, chart);
        if (!cancelled) setSvg(rendered.svg);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Mermaid render failed');
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  return (
    <figure className="rendered-mermaid" aria-label={`${title} rendered diagram`}>
      {svg ? (
        <div className="rendered-mermaid__svg" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="rendered-mermaid__state" aria-live="polite">
          {error ? '다이어그램을 렌더링하지 못했습니다.' : '다이어그램 렌더링 중'}
        </div>
      )}
      {error && <figcaption>{error}</figcaption>}
    </figure>
  );
}
