import {
  Check,
  CircleExclamationPoint,
  FileBraces,
  FileSpreadsheet,
  FileText,
  FileType,
  Highlighter,
  Languages,
  LoaderCircle,
  Moon,
  Plus,
  SquarePen,
  Sun,
  Trash,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { ConversationSummary, DocumentInfo, Health } from '../api'
import type { Strings } from '../i18n'

export interface PendingUpload {
  key: string
  name: string
  error?: string
}

interface Props {
  t: Strings
  documents: DocumentInfo[]
  uploads: PendingUpload[]
  scope: string[]
  conversations: ConversationSummary[]
  activeId: string | null
  health: Health | null
  theme: 'light' | 'dark'
  onUpload: (files: File[]) => void
  onDismissUpload: (key: string) => void
  onToggleScope: (id: string) => void
  onClearScope: () => void
  onDeleteDocument: (doc: DocumentInfo) => void
  onOpen: (id: string) => void
  onNew: () => void
  onDeleteConversation: (id: string) => void
  onToggleTheme: () => void
  onToggleLang: () => void
}

export const ACCEPT = '.pdf,.docx,.txt,.md,.markdown,.csv,.json,.log'

const iconFor = (kind: string) =>
  kind === 'csv' ? FileSpreadsheet : kind === 'json' ? FileBraces : kind === 'docx' ? FileType : FileText

function timeAgo(iso: string, locale: string) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, size] of [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ] as const) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(0, 'minute')
}

export function Library(p: Props) {
  const { t } = p
  const fileInput = useRef<HTMLInputElement>(null)
  const [filter, setFilter] = useState('')
  const docs = p.documents.filter((d) => d.fileName.toLowerCase().includes(filter.trim().toLowerCase()))

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 px-4 pb-3 pt-4">
        <span className="grid size-8 place-items-center rounded-lg bg-marker text-marker-ink" aria-hidden>
          <Highlighter size={17} strokeWidth={2.2} />
        </span>
        <h1 className="flex-1 text-[17px] font-semibold tracking-tight">{t.appName}</h1>
        <button
          type="button"
          onClick={p.onToggleLang}
          title={t.otherLanguage}
          aria-label={t.otherLanguage}
          className="rounded-md p-1.5 text-ink-soft hover:bg-paper hover:text-ink"
        >
          <Languages size={17} />
        </button>
        <button
          type="button"
          onClick={p.onToggleTheme}
          title={p.theme === 'dark' ? t.themeLight : t.themeDark}
          aria-label={p.theme === 'dark' ? t.themeLight : t.themeDark}
          className="rounded-md p-1.5 text-ink-soft hover:bg-paper hover:text-ink"
        >
          {p.theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>

      <div className="px-3">
        <button
          type="button"
          onClick={p.onNew}
          className="flex w-full items-center gap-2 rounded-lg border border-rule bg-sheet px-3 py-2 text-left font-medium hover:border-ink-faint"
        >
          <SquarePen size={16} className="text-pen" />
          {t.newConversation}
        </button>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pb-4 scrollbar-thin">
        <section aria-labelledby="library-heading" className="px-3">
          <div className="flex items-center justify-between px-1 pb-1.5">
            <h2 id="library-heading" className="text-[13px] font-semibold text-ink-soft">
              {t.library} <span className="font-normal tabular-nums text-ink-faint">{p.documents.length}</span>
            </h2>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-medium text-pen hover:bg-pen-soft"
            >
              <Plus size={15} />
              {t.addFiles}
            </button>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                p.onUpload([...(e.target.files ?? [])])
                e.target.value = ''
              }}
            />
          </div>

          {p.documents.length > 6 && (
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t.filter}
              aria-label={t.filter}
              className="mb-1.5 w-full rounded-md border border-rule bg-sheet px-2.5 py-1.5 text-[14px] placeholder:text-ink-faint"
            />
          )}

          <ul className="space-y-px">
            {p.uploads.map((u) => (
              <li key={u.key} className="flex items-start gap-2.5 rounded-lg px-2 py-2" aria-live="polite">
                {u.error ? (
                  <CircleExclamationPoint size={16} className="mt-0.5 shrink-0 text-danger" />
                ) : (
                  <LoaderCircle size={16} className="mt-0.5 shrink-0 animate-spin text-pen" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{u.name}</p>
                  <p className={`text-[12.5px] ${u.error ? 'text-danger' : 'text-ink-soft'}`}>{u.error ?? t.reading}</p>
                </div>
                {u.error && (
                  <button
                    type="button"
                    onClick={() => p.onDismissUpload(u.key)}
                    aria-label={t.dismiss}
                    className="rounded p-0.5 text-ink-faint hover:text-ink"
                  >
                    <X size={15} />
                  </button>
                )}
              </li>
            ))}

            {docs.map((d) => {
              const Icon = iconFor(d.kind)
              const selected = p.scope.includes(d.id)
              return (
                <li key={d.id} className="group relative">
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-sheet has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-pen">
                    <input type="checkbox" checked={selected} onChange={() => p.onToggleScope(d.id)} className="peer sr-only" />
                    <span
                      className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors ${
                        selected ? 'border-pen bg-pen text-sheet' : 'border-ink-faint/60 text-transparent'
                      }`}
                      aria-hidden
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <div className="min-w-0 flex-1 pr-6">
                      <p className="flex items-center gap-1.5 text-[14px] font-medium">
                        <Icon size={14} className="shrink-0 text-ink-faint" />
                        <span className="truncate" title={d.fileName}>
                          {d.fileName}
                        </span>
                      </p>
                      <p className="text-[12.5px] text-ink-soft">
                        {t.docMeta(d)}
                        {!d.embedded && (
                          <span title={t.keywordOnlyHint} className="ml-1.5 rounded bg-paper px-1 text-[11.5px] text-ink-soft ring-1 ring-rule">
                            {t.keywordOnly}
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => p.onDeleteDocument(d)}
                    aria-label={`${t.deleteDocument}: ${d.fileName}`}
                    title={t.deleteDocument}
                    className="absolute right-1.5 top-2 rounded p-1 text-ink-faint opacity-0 hover:bg-danger-soft hover:text-danger focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash size={14} />
                  </button>
                </li>
              )
            })}
          </ul>

          {p.documents.length === 0 && p.uploads.length === 0 && (
            <p className="px-2 py-2 text-[13.5px] text-ink-soft">{t.emptyLibrary}</p>
          )}
          {p.documents.length > 1 && (
            <p className="px-2 pt-1.5 text-[12.5px] text-ink-faint">
              {p.scope.length > 0 ? (
                <button type="button" onClick={p.onClearScope} className="font-medium text-pen hover:underline">
                  {t.clearScope}
                </button>
              ) : (
                t.scopeHint
              )}
            </p>
          )}
        </section>

        <section aria-labelledby="chats-heading" className="mt-5 px-3">
          <h2 id="chats-heading" className="px-1 pb-1.5 text-[13px] font-semibold text-ink-soft">
            {t.conversations}
          </h2>
          {p.conversations.length === 0 ? (
            <p className="px-2 py-1 text-[13.5px] text-ink-soft">{t.noConversations}</p>
          ) : (
            <ul className="space-y-px">
              {p.conversations.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => p.onOpen(c.id)}
                    aria-current={c.id === p.activeId}
                    className={`w-full rounded-lg px-2.5 py-2 pr-8 text-left ${
                      c.id === p.activeId ? 'bg-sheet shadow-[inset_2px_0_0_var(--pen)]' : 'hover:bg-sheet'
                    }`}
                  >
                    <p className="truncate text-[14px]">{c.title}</p>
                    <p className="text-[12px] text-ink-faint">{timeAgo(c.updatedAt, t.locale)}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => p.onDeleteConversation(c.id)}
                    aria-label={`${t.deleteConversation}: ${c.title}`}
                    title={t.deleteConversation}
                    className="absolute right-1.5 top-2 rounded p-1 text-ink-faint opacity-0 hover:bg-danger-soft hover:text-danger focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {p.health && (
        <footer className="space-y-1 border-t border-rule px-4 py-3 text-[12.5px] text-ink-soft">
          <Status ok={p.health.llm.configured}>
            {p.health.llm.configured ? t.llmOn(p.health.llm.model, p.health.llm.provider) : t.llmOff}
          </Status>
          <Status ok={p.health.embeddings.status === 'online'}>
            {p.health.embeddings.status === 'online'
              ? t.embedOnline(p.health.embeddings.model)
              : p.health.embeddings.status === 'missing-model'
                ? t.embedMissing(p.health.embeddings.model)
                : t.embedOffline}
          </Status>
        </footer>
      )}
    </div>
  )
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2">
      <span className={`mt-[6px] size-1.5 shrink-0 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  )
}
