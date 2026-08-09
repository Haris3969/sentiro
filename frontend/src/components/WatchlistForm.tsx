import { useState, type FormEvent } from 'react'
import axios from 'axios'
import { Plus } from 'lucide-react'

interface WatchlistFormProps {
  onAdd: (ticker: string, assetType: 'stock' | 'crypto') => Promise<void>
}

export function WatchlistForm({ onAdd }: WatchlistFormProps) {
  const [ticker, setTicker] = useState('')
  const [assetType, setAssetType] = useState<'stock' | 'crypto'>('stock')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = ticker.trim()
    if (!trimmed) return

    setSubmitting(true)
    setError(null)
    try {
      await onAdd(trimmed, assetType)
      setTicker('')
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError('Already in your watchlist')
      } else if (axios.isAxiosError(err) && err.response?.status === 400) {
        setError(err.response.data?.detail ?? 'Invalid ticker')
      } else {
        setError('Failed to add ticker')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass flex flex-wrap items-center gap-2 rounded-xl border border-border p-2">
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        placeholder="Add a ticker — AAPL, BTC, TSLA…"
        className="min-w-[220px] flex-1 rounded-lg bg-transparent px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none"
      />
      <div className="flex overflow-hidden rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setAssetType('stock')}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            assetType === 'stock' ? 'bg-accent text-bg' : 'text-muted hover:text-text'
          }`}
        >
          Stock
        </button>
        <button
          type="button"
          onClick={() => setAssetType('crypto')}
          className={`px-3 py-2 text-xs font-medium transition-colors ${
            assetType === 'crypto' ? 'bg-accent text-bg' : 'text-muted hover:text-text'
          }`}
        >
          Crypto
        </button>
      </div>
      <button
        type="submit"
        disabled={submitting || !ticker.trim()}
        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-medium text-bg transition-opacity disabled:opacity-40"
      >
        <Plus size={16} />
        {submitting ? 'Adding…' : 'Add'}
      </button>
      {error && <span className="text-sm text-bear">{error}</span>}
    </form>
  )
}
