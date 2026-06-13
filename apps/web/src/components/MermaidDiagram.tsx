import { useEffect, useId, useState } from 'react'

type MermaidDiagramProps = {
  chart: string
  title: string
}

const BLOCKED_SVG_TAGS = new Set([
  'a',
  'audio',
  'embed',
  'foreignobject',
  'iframe',
  'image',
  'link',
  'meta',
  'object',
  'script',
  'video',
])

const URL_ATTRS = new Set(['href', 'xlink:href'])

function sanitizeMermaidSvg(svg: string): string {
  const fixedSvg = svg.replace(/<br([^>]*?)(?<!\/)>/gi, '<br$1/>')
  const parser = new DOMParser()
  const doc = parser.parseFromString(fixedSvg, 'image/svg+xml')

  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error(
      `Mermaid SVG sanitizer failed to parse rendered output: ${parserError.textContent}`
    )
  }

  for (const node of Array.from(doc.querySelectorAll('*'))) {
    const tagName = node.tagName.toLowerCase()
    if (BLOCKED_SVG_TAGS.has(tagName)) {
      node.remove()
      continue
    }

    for (const attr of Array.from(node.attributes)) {
      const attrName = attr.name.toLowerCase()
      const attrValue = attr.value.trim()

      if (attrName.startsWith('on')) {
        node.removeAttribute(attr.name)
        continue
      }

      if (URL_ATTRS.has(attrName) && attrValue && !attrValue.startsWith('#')) {
        node.removeAttribute(attr.name)
        continue
      }

      if (
        attrName === 'style' &&
        /url\s*\(\s*['"]?javascript:|@import|expression\s*\(/i.test(attrValue)
      ) {
        node.removeAttribute(attr.name)
      }
    }
  }

  for (const style of Array.from(doc.querySelectorAll('style'))) {
    if (/url\s*\(\s*['"]?javascript:|@import|expression\s*\(/i.test(style.textContent ?? '')) {
      style.remove()
    }
  }

  const root = doc.documentElement
  if (root.tagName.toLowerCase() !== 'svg') {
    throw new Error('Mermaid SVG sanitizer received non-SVG output')
  }

  return root.outerHTML
}

export function MermaidDiagram({ chart, title }: MermaidDiagramProps) {
  const reactId = useId()
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const renderId = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`

    async function render() {
      try {
        setError(null)
        const mermaid = (await import('mermaid')).default

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          htmlLabels: false,
          flowchart: { htmlLabels: false },
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
        })

        const rendered = await mermaid.render(renderId, chart)
        const safeSvg = sanitizeMermaidSvg(rendered.svg)
        if (!cancelled) setSvg(safeSvg)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Mermaid render failed')
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [chart, reactId])

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
  )
}
