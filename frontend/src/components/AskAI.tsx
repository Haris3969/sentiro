import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, Send, Sparkles, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { askAI } from '../lib/api'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export function AskAI() {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || loading) return

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setQuestion('')
    setLoading(true)
    setError(null)

    try {
      const answer = await askAI(trimmed)
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }])
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Something went wrong asking the AI. Try again in a moment.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors duration-150 ease-out hover:border-border-strong hover:text-text"
        aria-label="Ask AI"
      >
        {open ? <X size={16} /> : <MessageCircle size={16} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed bottom-[68px] right-5 z-40 flex h-[26rem] w-[21rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div className="flex items-center gap-1.5 border-b border-border px-3 py-2.5">
              <Sparkles size={12} className="text-dim" aria-hidden />
              <span className="text-[12px] font-medium text-text">Ask about your watchlist</span>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
              {messages.length === 0 && (
                <p className="text-[12px] leading-[1.5] text-dim">
                  Try “Why is TSLA down?” or “Which ticker looks most bullish?”
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[88%] rounded-lg px-2.5 py-1.5 text-[13px] leading-[1.5] ${
                    m.role === 'user'
                      ? 'ml-auto bg-accent text-bg'
                      : 'bg-surface-2 text-muted'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {loading && <p className="text-[12px] text-dim">Thinking…</p>}
              {error && <p className="text-[12px] text-bear">{error}</p>}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-1.5 border-t border-border p-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question…"
                disabled={loading}
                className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2.5 py-1.5 text-[13px] text-text placeholder:text-dim transition-colors duration-150 ease-out focus:border-border-strong focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent text-bg transition-opacity duration-150 ease-out disabled:opacity-30"
                aria-label="Send"
              >
                <Send size={13} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
