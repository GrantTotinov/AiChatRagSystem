import { ArrowUp, Check, CircleExclamationPoint, Copy, Download, FileText, Menu, RotateCcw, Square, Upload } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { DocumentInfo, Message, Source } from '../api'
import type { Strings } from '../i18n'
import { Answer } from './Answer'

export interface AskOptions {
  overview?: boolean
  regenerate?: boolean
}

interface Props {
  t: Strings
  title: string | null
  messages: Message[]
  documents: DocumentInfo[]
  scope: string[]
  streaming: boolean
  suggestions: string[]
  activeSource: { messageId: Message['id']; n: number } | null
  onAsk: (question: string, options?: AskOptions) => void
  onStop: () => void
  onCite: (message: Message, source: Source) => void
  onChooseFiles: () => void
  onExport: () => void
  onOpenLibrary: () => void
}

export function Chat(p: Props) {
  const { t } = p
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)

  useLayoutEffect(() => {
    if (stick.current) scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [p.messages])

  const scopeLabel =
    p.scope.length > 0 ? t.scopeSome(p.scope.length, p.documents.length) : t.scopeAll(p.documents.length)
  const lastAssistant = p.messages.findLastIndex((m) => m.role === 'assistant')

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-rule px-3 sm:px-5">
        <button
          type="button"
          onClick={p.onOpenLibrary}
          aria-label={t.openLibrary}
          className="rounded-md p-1.5 text-ink-soft hover:bg-paper hover:text-ink lg:hidden"
        >
          <Menu size={19} />
        </button>
        <h2 className="min-w-0 flex-1 truncate font-medium">{p.title ?? t.newConversation}</h2>
        {p.messages.length > 0 && (
          <button
            type="button"
            onClick={p.onExport}
            title={t.exportChat}
            aria-label={t.exportChat}
            className="rounded-md p-1.5 text-ink-soft hover:bg-paper hover:text-ink"
          >
            <Download size={17} />
          </button>
        )}
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="min-h-0 flex-1 overflow-y-auto scrollbar-thin"
      >
        <div className="mx-auto w-full max-w-[46rem] px-4 pb-10 sm:px-8">
          {p.documents.length === 0 ? (
            <Start t={t} onChooseFiles={p.onChooseFiles} />
          ) : p.messages.length === 0 ? (
            <Ask t={t} scopeLabel={scopeLabel} suggestions={p.suggestions} onAsk={p.onAsk} />
          ) : (
            p.messages.map((m, i) =>
              m.role === 'user' ? (
                <p key={m.id} className="mt-10 whitespace-pre-wrap border-l-2 border-pen pl-3.5 text-[16px] font-semibold leading-snug">
                  {m.content}
                </p>
              ) : (
                <AssistantMessage
                  key={m.id}
                  t={t}
                  message={m}
                  question={p.messages[i - 1]?.content ?? ''}
                  isLast={i === lastAssistant}
                  streaming={p.streaming && i === lastAssistant}
                  activeSource={p.activeSource?.messageId === m.id ? p.activeSource.n : undefined}
                  onCite={(s) => p.onCite(m, s)}
                  onRegenerate={() => p.onAsk(p.messages[i - 1]?.content ?? '', { regenerate: true })}
                />
              ),
            )
          )}
        </div>
      </div>

      <Composer t={t} disabled={p.documents.length === 0} streaming={p.streaming} scopeLabel={scopeLabel} onAsk={p.onAsk} onStop={p.onStop} />
    </main>
  )
}

function Start({ t, onChooseFiles }: { t: Strings; onChooseFiles: () => void }) {
  return (
    <section className="pt-[12vh]">
      <button
        type="button"
        onClick={onChooseFiles}
        className="group block w-full rounded-2xl border-2 border-dashed border-rule bg-paper px-6 py-12 text-center transition-colors hover:border-pen"
      >
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-pen-soft text-pen">
          <Upload size={22} />
        </span>
        <span className="mt-5 block font-serif text-[26px] font-medium leading-tight">{t.startTitle}</span>
        <span className="mx-auto mt-3 block max-w-md text-ink-soft">{t.startBody}</span>
        <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-pen px-4 py-2 font-medium text-sheet group-hover:brightness-110">
          <FileText size={16} />
          {t.chooseFiles}
        </span>
        <span className="mt-3 block text-[13px] text-ink-faint">{t.formats}</span>
      </button>
    </section>
  )
}

function Ask({ t, scopeLabel, suggestions, onAsk }: { t: Strings; scopeLabel: string; suggestions: string[]; onAsk: Props['onAsk'] }) {
  return (
    <section className="pt-[12vh]">
      <h3 className="font-serif text-[30px] font-medium leading-tight tracking-tight">{t.askTitle}</h3>
      <p className="mt-2 text-ink-soft">{scopeLabel}</p>

      <div className="mt-7 flex flex-wrap gap-2">
        {t.quick.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => onAsk(q.prompt, { overview: q.overview })}
            className="rounded-full border border-rule bg-sheet px-3.5 py-1.5 text-[14px] font-medium hover:border-pen hover:text-pen"
          >
            {q.label}
          </button>
        ))}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-9">
          <h4 className="text-[13px] font-semibold text-ink-soft">{t.suggested}</h4>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {suggestions.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => onAsk(s)} className="w-full py-3 text-left font-serif text-[16px] hover:text-pen">
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

interface AssistantProps {
  t: Strings
  message: Message
  question: string
  isLast: boolean
  streaming: boolean
  activeSource?: number
  onCite: (source: Source) => void
  onRegenerate: () => void
}

function AssistantMessage({ t, message: m, isLast, streaming, activeSource, onCite, onRegenerate }: AssistantProps) {
  const [copied, setCopied] = useState(false)
  const sources = m.sources ?? []
  const waiting = m.pending && !m.content

  return (
    <article className="mt-4">
      {waiting ? (
        <p className="py-1 text-ink-soft">
          <span className="searching">{t.searching}…</span>
        </p>
      ) : (
        m.content && <Answer content={m.content} sources={sources} activeSource={activeSource} streaming={streaming} onCite={onCite} pageLabel={t.page} />
      )}

      {m.error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2.5 text-[14px] text-danger">
          <CircleExclamationPoint size={16} className="mt-0.5 shrink-0" />
          {m.error}
        </p>
      )}

      {sources.length > 0 && !waiting && (
        <div className="mt-4">
          <h4 className="sr-only">{t.sources}</h4>
          <ul className="flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <li key={s.n}>
                <button
                  type="button"
                  onClick={() => onCite(s)}
                  aria-pressed={activeSource === s.n}
                  className={`flex max-w-[16rem] items-center gap-2 rounded-md border py-1 pl-1 pr-2.5 text-left text-[12.5px] transition-colors ${
                    activeSource === s.n ? 'border-ink bg-sheet' : 'border-rule bg-sheet hover:border-ink-faint'
                  }`}
                >
                  <span className="grid h-5 min-w-5 place-items-center rounded bg-marker px-1 text-[11.5px] font-semibold text-marker-ink">{s.n}</span>
                  <span className="truncate">{s.fileName}</span>
                  {s.page != null && <span className="shrink-0 text-ink-faint">{t.page(s.page)}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!m.pending && m.content && (
        <div className="mt-3 flex items-center gap-1 text-[12.5px] text-ink-faint">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(m.content).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              })
            }}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-paper hover:text-ink"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t.copied : t.copy}
          </button>
          {isLast && (
            <button type="button" onClick={onRegenerate} className="flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-paper hover:text-ink">
              <RotateCcw size={14} />
              {t.regenerate}
            </button>
          )}
          {m.stopped && <span className="px-1.5">{t.stopped}</span>}
          {m.elapsedMs != null && <span className="ml-auto tabular-nums">{t.seconds(m.elapsedMs)}</span>}
        </div>
      )}
    </article>
  )
}

interface ComposerProps {
  t: Strings
  disabled: boolean
  streaming: boolean
  scopeLabel: string
  onAsk: Props['onAsk']
  onStop: () => void
}

function Composer({ t, disabled, streaming, scopeLabel, onAsk, onStop }: ComposerProps) {
  const [text, setText] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [text])

  useEffect(() => {
    if (!disabled && !streaming) area.current?.focus()
  }, [disabled, streaming])

  const send = () => {
    if (!text.trim() || streaming || disabled) return
    onAsk(text.trim())
    setText('')
  }

  return (
    <div className="shrink-0 px-3 pb-3 sm:px-8 sm:pb-5">
      <div className="mx-auto max-w-[46rem]">
        <div className="rounded-2xl border border-rule bg-sheet shadow-[0_1px_2px_rgb(24_35_61/0.06)] focus-within:border-pen">
          <textarea
            ref={area}
            value={text}
            rows={1}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={disabled ? t.placeholderEmpty : t.placeholder}
            aria-label={t.placeholder}
            maxLength={4000}
            className="block w-full resize-none bg-transparent px-4 pb-1 pt-3.5 text-[15.5px] outline-none placeholder:text-ink-faint focus-visible:outline-none disabled:cursor-not-allowed"
          />
          <div className="flex items-center gap-2 py-2 pl-4 pr-2">
            <p className="min-w-0 flex-1 truncate text-[12.5px] text-ink-faint">{disabled ? "" : scopeLabel}</p>
            {streaming ? (
              <button
                type="button"
                onClick={onStop}
                aria-label={t.stop}
                title={t.stop}
                className="grid size-9 place-items-center rounded-xl bg-ink text-sheet hover:opacity-90"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                onClick={send}
                disabled={!text.trim() || disabled}
                aria-label={t.send}
                title={t.send}
                className="grid size-9 place-items-center rounded-xl bg-pen text-sheet transition-opacity hover:brightness-110 disabled:opacity-35"
              >
                <ArrowUp size={18} strokeWidth={2.4} />
              </button>
            )}
          </div>
        </div>
        <p className="mt-1.5 hidden text-center text-[12px] text-ink-faint sm:block">{t.composerHint}</p>
      </div>
    </div>
  )
}
