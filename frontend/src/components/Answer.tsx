import { memo } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Source } from '../api'

// Models write [1], [1, 2], [1][2] or [Source 1]. Each number becomes a link that the renderer turns into a mark.
const CITATION = /\[(?:(?:sources?|източници|източник)\s*)?(\d{1,2}(?:\s*[,;]\s*\d{1,2})*)\]/gi

const linkCitations = (text: string) =>
  text.replace(CITATION, (_, numbers: string) =>
    numbers
      .split(/\s*[,;]\s*/)
      .map((n) => `[${n}](#cite-${n})`)
      .join(''),
  )

interface Props {
  content: string
  sources: Source[]
  activeSource?: number
  streaming?: boolean
  onCite: (source: Source) => void
  pageLabel: (n: number) => string
}

export const Answer = memo(function Answer({ content, sources, activeSource, streaming, onCite, pageLabel }: Props) {
  const components: Components = {
    a({ href, children }) {
      const n = href?.startsWith('#cite-') ? Number(href.slice(6)) : NaN
      if (Number.isNaN(n)) {
        return (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        )
      }
      const source = sources.find((s) => s.n === n)
      if (!source) return <span>[{n}]</span>
      return (
        <button
          type="button"
          className="cite"
          aria-pressed={activeSource === n}
          title={source.page != null ? `${source.fileName}, ${pageLabel(source.page)}` : source.fileName}
          onClick={() => onCite(source)}
        >
          {n}
        </button>
      )
    },
  }

  return (
    <div className={`answer ${streaming ? 'caret' : ''}`}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {linkCitations(content)}
      </Markdown>
    </div>
  )
})
