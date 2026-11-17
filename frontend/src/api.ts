export interface DocumentInfo {
  id: string
  fileName: string
  kind: string
  sizeBytes: number
  pages: number | null
  words: number
  chunksCount: number
  embedded: boolean
  uploadedAt: string
}

export interface Source {
  n: number
  documentId: string
  fileName: string
  page: number | null
  chunkIndex: number
  text: string
  similarity: number | null
}

export interface Message {
  id: number | string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[] | null
  elapsedMs?: number | null
  stopped?: boolean
  pending?: boolean
  error?: string
}

export interface ConversationSummary {
  id: string
  title: string
  updatedAt: string
  documentIds: string[]
  messages: number
}

export interface Conversation {
  id: string
  title: string
  documentIds: string[]
  messages: Message[]
}

export interface Health {
  llm: { configured: boolean; model: string; provider: string }
  embeddings: { status: 'online' | 'missing-model' | 'offline'; model: string }
}

export interface UploadOutcome {
  fileName: string
  document: DocumentInfo | null
  error: string | null
  duplicate: boolean
}

export interface ChatRequest {
  question: string
  conversationId?: string | null
  documentIds?: string[]
  regenerate?: boolean
  overview?: boolean
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function read<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = response.statusText
    try {
      const problem = await response.json()
      message = Object.values(problem.errors ?? {}).flat().join(' ') || problem.title || message
    } catch {
      // Not a problem-details body; keep the status text.
    }
    throw new ApiError(response.status, message)
  }
  return response.status === 204 ? (undefined as T) : response.json()
}

const get = <T>(path: string) => fetch(`/api${path}`).then(read<T>)
const remove = (path: string) => fetch(`/api${path}`, { method: 'DELETE' }).then(read<void>)

export const api = {
  health: () => get<Health>('/health'),
  documents: () => get<DocumentInfo[]>('/documents'),
  deleteDocument: (id: string) => remove(`/documents/${id}`),
  suggestions: (id: string) => get<string[]>(`/documents/${id}/suggestions`),
  conversations: () => get<ConversationSummary[]>('/conversations'),
  conversation: (id: string) => get<Conversation>(`/conversations/${id}`),
  deleteConversation: (id: string) => remove(`/conversations/${id}`),
  async upload(file: File): Promise<UploadOutcome> {
    const form = new FormData()
    form.append('files', file)
    const [outcome] = await fetch('/api/documents', { method: 'POST', body: form }).then(read<UploadOutcome[]>)
    return outcome
  },
}

export interface ChatHandlers {
  meta: (data: { conversationId: string; title: string; sources: Source[] }) => void
  token: (text: string) => void
  done: (data: { messageId: number | null; elapsedMs: number | null }) => void
  error: (message: string) => void
}

/** POSTs a question and reads the server-sent events the API streams back. */
export async function streamChat(body: ChatRequest, on: ChatHandlers, signal: AbortSignal) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok || !response.body) await read(response)

  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += value.replace(/\r\n/g, '\n')

    let end: number
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)

      let event = 'message'
      const data: string[] = []
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data.push(line.slice(line[5] === ' ' ? 6 : 5))
      }
      if (data.length === 0) continue

      const payload = JSON.parse(data.join('\n'))
      if (event === 'meta') on.meta(payload)
      else if (event === 'token') on.token(payload.text)
      else if (event === 'done') on.done(payload)
      else if (event === 'error') on.error(payload.message)
    }
  }
}
