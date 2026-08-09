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
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-bg shadow-lg shadow-accent/30"
        aria-label="Ask AI"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="glass fixed bottom-24 right-6 z-40 flex h-[28rem] w-[22rem] flex-col overflow-hidden rounded-2xl border border-border shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border p-3">
              <Sparkles size={16} className="text-accent" />
              <span className="font-display text-sm font-semibold text-text">Ask about your watchlist</span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted">
                  Ask things like "Why is TSLA down?" or "Which ticker looks most bullish?" — answers use
                  your cached watchlist data.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'ml-auto bg-accent text-bg'
                      : 'bg-surface-2 text-text'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-accent" />
                  Thinking…
                </div>
              )}
              {error && <p className="text-sm text-bear">{error}</p>}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-3">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question…"
                disabled={loading}
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-bg disabled:opacity-40"
                aria-label="Send"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
