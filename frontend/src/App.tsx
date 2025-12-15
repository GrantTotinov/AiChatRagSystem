import { useState, useRef, useEffect } from 'react'

const API_URL = 'http://localhost:5261/api'

interface Document {
  id: string
  fileName: string
  uploadedAt: string
  chunksCount: number
}

export default function AiDocChat() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [uploading, setUploading] = useState(false)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/documents`)
      const data = await response.json()
      if (data.success) {
        setDocuments(data.documents)
      }
    } catch (err) {
      console.error('Error loading documents:', err)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        await fetchDocuments()
        setSelectedDoc(data.documentId)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setError(data.error || 'File upload error')
      }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setUploading(false)
    }
  }

  const handleAsk = async () => {
    if (!question.trim() || !selectedDoc) return

    setAsking(true)
    setError('')
    setAnswer('')

    try {
      const response = await fetch(`${API_URL}/chat/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: selectedDoc,
          question: question.trim(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAnswer(data.answer)
      } else {
        setError(data.error || 'Error processing question')
      }
    } catch (err) {
      setError('Cannot connect to server')
    } finally {
      setAsking(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white">AI Doc Chat</h1>
          </div>
          <p className="text-purple-200 text-lg">
            Ask questions about your documents with an AI assistant
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 h-[600px]">
          <div className="lg:col-span-1 space-y-8 h-full flex flex-col">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Upload Document
              </h2>

              <label className="block">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <div
                  className={`
                  cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all
                  ${
                    uploading
                      ? 'border-purple-400 bg-purple-500/20'
                      : 'border-purple-300/50 hover:border-purple-400 hover:bg-white/5'
                  }
                `}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-purple-200 font-medium">
                        Uploading...
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="w-10 h-10 text-purple-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <p className="text-purple-100 font-medium">Choose file</p>
                      <p className="text-purple-300 text-sm">PDF or TXT</p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Documents ({documents.length})
              </h2>

              {documents.length === 0 ? (
                <p className="text-purple-300 text-center py-8">
                  No uploaded documents
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {documents.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc.id)}
                      className={`
                        w-full text-left p-4 rounded-xl transition-all break-words truncate
                        ${
                          selectedDoc === doc.id
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                            : 'bg-white/5 text-purple-100 hover:bg-white/10'
                        }
                      `}
                    >
                      <p className="font-medium truncate">{doc.fileName}</p>
                      <p
                        className={`text-sm mt-1 ${
                          selectedDoc === doc.id
                            ? 'text-white/80'
                            : 'text-purple-300'
                        }`}
                      >
                        {doc.chunksCount} chunks •{' '}
                        {new Date(doc.uploadedAt).toLocaleDateString('en-GB')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 h-full flex flex-col overflow-hidden">
              <div className="p-6 border-b border-white/20">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  Document Chat
                </h2>
                {selectedDoc && (
                  <p className="text-purple-200 text-sm mt-1">
                    Selected:{' '}
                    {documents.find((d) => d.id === selectedDoc)?.fileName}
                  </p>
                )}
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {!selectedDoc ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <svg
                        className="w-16 h-16 text-purple-300 mx-auto mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                        />
                      </svg>
                      <p className="text-purple-200 text-lg">
                        Choose a document
                      </p>
                    </div>
                  </div>
                ) : answer ? (
                  <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-6 border border-white/20">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-green-300 font-semibold mb-2">
                          AI Answer
                        </p>
                        <p className="text-white leading-relaxed whitespace-pre-wrap">
                          {answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-purple-300 text-center">
                      Ask a question about the document
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-red-200">{error}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/20">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about the document..."
                    disabled={!selectedDoc || asking}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  />
                  <button
                    onClick={handleAsk}
                    disabled={!selectedDoc || !question.trim() || asking}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                  >
                    {asking ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Working...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                          />
                        </svg>
                        <span>Send</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
