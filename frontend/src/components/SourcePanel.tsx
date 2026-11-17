import { X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import type { Source } from '../api'
import type { Strings } from '../i18n'

const STOP_WORDS = new Set(
  'what which when where does that this with from have about there their into them they were been would could should какво какви каква кога къде дали това този тази които който която като след преди може'.split(' '),
)

function queryTerms(question: string) {
  const words = question.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  return [...new Set(words.filter((w) => w.length > 3 && !STOP_WORDS.has(w)))]
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Marks every word that starts with a query term, so "refunds" lights up for "refund". */
function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return <>{text}</>
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])((?:${terms.map(escape).join('|')})[\\p{L}\\p{N}]*)`, 'giu')
  let i = 0
  return (
    <>
      {text.split(pattern).map((part, index) =>
        index % 2 === 1 ? (
          <mark key={index} className="hl" style={{ '--i': i++ } as React.CSSProperties}>
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}

interface Props {
  source: Source
  sources: Source[]
  question: string
  t: Strings
  onSelect: (source: Source) => void
  onClose: () => void
}

export function SourcePanel({ source, sources, question, t, onSelect, onClose }: Props) {
  const terms = useMemo(() => queryTerms(question), [question])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside
      aria-label={t.passage}
      className="fixed inset-x-0 bottom-0 z-30 flex max-h-[72vh] flex-col rounded-t-2xl border-t border-rule bg-sheet shadow-[0_-12px_40px_rgb(0_0_0/0.18)] lg:static lg:z-auto lg:max-h-none lg:w-[400px] lg:shrink-0 lg:rounded-none lg:border-l lg:border-t-0 lg:shadow-none"
    >
      <header className="flex items-start gap-3 border-b border-rule px-5 pb-3 pt-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-ink-soft">{t.sourceN(source.n)}</p>
          <h2 className="truncate font-semibold" title={source.fileName}>
            {source.fileName}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            {[source.page != null && t.page(source.page), source.similarity != null && t.match(Math.round(source.similarity * 100))]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="-mr-1 rounded-md p-1.5 text-ink-soft hover:bg-paper hover:text-ink"
        >
          <X size={18} />
        </button>
      </header>

      {sources.length > 1 && (
        <nav className="flex gap-1.5 overflow-x-auto border-b border-rule px-5 py-2.5 scrollbar-thin" aria-label={t.sources}>
          {sources.map((s) => (
            <button
              key={s.n}
              type="button"
              onClick={() => onSelect(s)}
              aria-current={s.n === source.n}
              className={`h-7 min-w-7 shrink-0 rounded-md px-2 text-[13px] font-semibold tabular-nums transition-colors ${
                s.n === source.n ? 'bg-marker text-marker-ink' : 'bg-paper text-ink-soft hover:text-ink'
              }`}
            >
              {s.n}
            </button>
          ))}
        </nav>
      )}

      <div className="overflow-y-auto px-5 py-5 scrollbar-thin">
        <p key={`${source.documentId}-${source.chunkIndex}`} className="whitespace-pre-line font-serif text-[16px] leading-[1.75]">
          <Highlighted text={source.text} terms={terms} />
        </p>
      </div>
    </aside>
  )
}
