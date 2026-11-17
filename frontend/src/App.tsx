import { Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, streamChat, type ConversationSummary, type DocumentInfo, type Health, type Message, type Source } from './api'
import { Chat, type AskOptions } from './components/Chat'
import { ACCEPT, Library, type PendingUpload } from './components/Library'
import { SourcePanel } from './components/SourcePanel'
import { strings, type Lang } from './i18n'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

// Storage can throw in private windows; preferences are a convenience, so failures are ignored.
const stored = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const store = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignored */
  }
}

interface OpenSource {
  messageId: Message['id']
  source: Source
  sources: Source[]
  question: string
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = stored('aidocchat.lang')
    return saved === 'en' || saved === 'bg' ? saved : navigator.language.startsWith('bg') ? 'bg' : 'en'
  })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))
  const t = strings[lang]

  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [uploads, setUploads] = useState<PendingUpload[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [scope, setScope] = useState<string[]>([])
  const [streaming, setStreaming] = useState(false)
  const [health, setHealth] = useState<Health | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [panel, setPanel] = useState<OpenSource | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    store('aidocchat.theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang
    store('aidocchat.lang', lang)
  }, [lang])

  useEffect(() => {
    Promise.all([api.documents(), api.conversations(), api.health()])
      .then(([docs, chats, status]) => {
        setDocuments(docs)
        setConversations(chats)
        setHealth(status)
      })
      .catch(() => setToast(strings[lang].apiDown))
    // Runs once on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  // Suggested questions for the first document in scope, shown on an empty conversation.
  const suggestFor = messages.length === 0 ? (scope[0] ?? documents[0]?.id) : undefined
  const llmReady = health?.llm.configured ?? false
  useEffect(() => {
    if (!suggestFor || !llmReady) return
    let current = true
    api
      .suggestions(suggestFor)
      .then((s) => current && setSuggestions(s))
      .catch(() => {})
    return () => {
      current = false
      setSuggestions([])
    }
  }, [suggestFor, llmReady])

  const upload = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const key = crypto.randomUUID()
        if (file.size > MAX_UPLOAD_BYTES) {
          setUploads((u) => [...u, { key, name: file.name, error: t.formats }])
          continue
        }

        setUploads((u) => [...u, { key, name: file.name }])
        try {
          const result = await api.upload(file)
          if (result.document) {
            const doc = result.document
            setDocuments((d) => [doc, ...d.filter((x) => x.id !== doc.id)])
            setUploads((u) => u.filter((x) => x.key !== key))
            setToast(result.duplicate ? t.duplicate(file.name) : t.added(file.name))
          } else {
            setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: result.error ?? '' } : x)))
          }
        } catch (e) {
          const error = e instanceof ApiError ? e.message : t.apiDown
          setUploads((u) => u.map((x) => (x.key === key ? { ...x, error } : x)))
        }
      }
      api.health().then(setHealth).catch(() => {})
    },
    [t],
  )

  // Drop files anywhere on the window.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files')
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      setDragging(true)
    }
    const leave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragging(false)
    }
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      setDragging(false)
      upload([...(e.dataTransfer?.files ?? [])])
    }
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [upload])

  const ask = useCallback(
    async (question: string, options: AskOptions = {}) => {
      if (streaming || !question.trim()) return
      const assistantId = `a-${Date.now()}`
      const patch = (fn: (m: Message) => Message) => setMessages((ms) => ms.map((m) => (m.id === assistantId ? fn(m) : m)))

      setMessages((ms) => [
        ...(options.regenerate
          ? ms.slice(0, ms.findLastIndex((m) => m.role === 'assistant'))
          : [...ms, { id: `q-${Date.now()}`, role: 'user' as const, content: question }]),
        { id: assistantId, role: 'assistant', content: '', pending: true },
      ])
      setPanel(null)
      setStreaming(true)

      // Tokens arrive faster than the screen refreshes; render them once per frame.
      let buffer = ''
      let frame = 0
      const flush = () => {
        frame = 0
        const text = buffer
        buffer = ''
        if (text) patch((m) => ({ ...m, content: m.content + text }))
      }
      const flushNow = () => {
        if (frame) cancelAnimationFrame(frame)
        flush()
      }

      const controller = new AbortController()
      abort.current = controller
      try {
        await streamChat(
          { question, conversationId: activeId, documentIds: scope, regenerate: options.regenerate, overview: options.overview },
          {
            meta: (d) => {
              setActiveId(d.conversationId)
              setTitle(d.title)
              patch((m) => ({ ...m, sources: d.sources }))
            },
            token: (text) => {
              buffer += text
              if (!frame) frame = requestAnimationFrame(flush)
            },
            done: (d) => {
              flushNow()
              patch((m) => ({ ...m, pending: false, elapsedMs: d.elapsedMs }))
            },
            error: (message) => {
              flushNow()
              patch((m) => ({ ...m, pending: false, error: message }))
            },
          },
          controller.signal,
        )
      } catch (e) {
        flushNow()
        const stopped = controller.signal.aborted
        const error = stopped
          ? undefined
          : e instanceof ApiError
            ? e.status === 429
              ? t.rateLimited
              : e.message
            : t.apiDown
        patch((m) => ({ ...m, pending: false, stopped, error }))
      } finally {
        patch((m) => (m.pending ? { ...m, pending: false } : m))
        abort.current = null
        setStreaming(false)
        api.conversations().then(setConversations).catch(() => {})
      }
    },
    [activeId, scope, streaming, t],
  )

  const startNew = () => {
    abort.current?.abort()
    setActiveId(null)
    setTitle(null)
    setMessages([])
    setPanel(null)
    setLibraryOpen(false)
  }

  const open = async (id: string) => {
    abort.current?.abort()
    try {
      const c = await api.conversation(id)
      setActiveId(c.id)
      setTitle(c.title)
      setMessages(c.messages)
      setScope(c.documentIds.filter((d) => documents.some((x) => x.id === d)))
      setPanel(null)
      setLibraryOpen(false)
    } catch {
      setToast(t.apiDown)
    }
  }

  const deleteDocument = async (doc: DocumentInfo) => {
    if (!window.confirm(t.confirmDeleteDocument(doc.fileName))) return
    await api.deleteDocument(doc.id).catch(() => {})
    setDocuments((d) => d.filter((x) => x.id !== doc.id))
    setScope((s) => s.filter((x) => x !== doc.id))
  }

  const deleteConversation = async (id: string) => {
    await api.deleteConversation(id).catch(() => {})
    setConversations((c) => c.filter((x) => x.id !== id))
    if (id === activeId) startNew()
  }

  const exportChat = () => {
    const lines = [`# ${title ?? t.newConversation}`]
    for (const m of messages) {
      if (m.role === 'user') lines.push(`## ${m.content}`)
      else {
        lines.push(m.content)
        if (m.sources?.length) {
          lines.push(`**${t.sources}**`, m.sources.map((s) => `${s.n}. ${s.fileName}${s.page != null ? `, ${t.page(s.page)}` : ''}`).join('\n'))
        }
      }
    }
    const url = URL.createObjectURL(new Blob([lines.join('\n\n')], { type: 'text/markdown' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${(title ?? 'conversation').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60)}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  const cite = (message: Message, source: Source) => {
    const index = messages.indexOf(message)
    const question = messages.slice(0, index).findLast((m) => m.role === 'user')?.content ?? ''
    setPanel((p) =>
      p?.messageId === message.id && p.source.n === source.n ? null : { messageId: message.id, source, sources: message.sources ?? [], question },
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {libraryOpen && <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={() => setLibraryOpen(false)} aria-hidden />}
      <aside
        aria-label={t.library}
        className={`fixed inset-y-0 left-0 z-50 w-[300px] max-w-[85vw] border-r border-rule bg-paper transition-transform duration-200 lg:static lg:translate-x-0 ${
          libraryOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Library
          t={t}
          documents={documents}
          uploads={uploads}
          scope={scope}
          conversations={conversations}
          activeId={activeId}
          health={health}
          theme={theme}
          onUpload={upload}
          onDismissUpload={(key) => setUploads((u) => u.filter((x) => x.key !== key))}
          onToggleScope={(id) => setScope((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
          onClearScope={() => setScope([])}
          onDeleteDocument={deleteDocument}
          onOpen={open}
          onNew={startNew}
          onDeleteConversation={deleteConversation}
          onToggleTheme={() => setTheme((x) => (x === 'dark' ? 'light' : 'dark'))}
          onToggleLang={() => setLang((x) => (x === 'bg' ? 'en' : 'bg'))}
        />
      </aside>

      <div className="flex min-w-0 flex-1 bg-sheet">
        <Chat
          t={t}
          title={title}
          messages={messages}
          documents={documents}
          scope={scope}
          streaming={streaming}
          suggestions={suggestions}
          activeSource={panel ? { messageId: panel.messageId, n: panel.source.n } : null}
          onAsk={ask}
          onStop={() => abort.current?.abort()}
          onCite={cite}
          onChooseFiles={() => fileInput.current?.click()}
          onExport={exportChat}
          onOpenLibrary={() => setLibraryOpen(true)}
        />
        {panel && (
          <SourcePanel
            source={panel.source}
            sources={panel.sources}
            question={panel.question}
            t={t}
            onSelect={(source) => setPanel((p) => p && { ...p, source })}
            onClose={() => setPanel(null)}
          />
        )}
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          upload([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-pen/10 backdrop-blur-[2px]">
          <div className="rounded-2xl border-2 border-dashed border-pen bg-sheet px-10 py-8 text-center shadow-xl">
            <Upload className="mx-auto text-pen" size={26} />
            <p className="mt-3 font-serif text-[20px]">{t.dropHere}</p>
            <p className="mt-1 text-[13px] text-ink-soft">{t.formats}</p>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-28 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-[14px] text-sheet shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
