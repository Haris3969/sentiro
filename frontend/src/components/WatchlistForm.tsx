import axios from 'axios'
import { useState, type FormEvent } from 'react'

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

  const segment = (value: 'stock' | 'crypto', text: string) => (
    <button
      type="button"
      onClick={() => setAssetType(value)}
      aria-pressed={assetType === value}
      className={`rounded px-2 py-1 text-[12px] transition-colors duration-150 ease-out ${
        assetType === value ? 'bg-surface-2 text-text' : 'text-dim hover:text-muted'
      }`}
    >
      {text}
    </button>
  )

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface pl-3 pr-1.5 transition-colors duration-150 ease-out focus-within:border-border-strong"
      >
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Add ticker"
          aria-label="Ticker symbol"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-dim focus:outline-none"
        />

        <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-white/[0.04] p-0.5">
          {segment('stock', 'Stock')}
          {segment('crypto', 'Crypto')}
        </div>

        <button
          type="submit"
          disabled={submitting || !ticker.trim()}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-bg transition-opacity duration-150 ease-out disabled:opacity-30"
        >
          {submitting ? 'Adding' : 'Add'}
        </button>
      </form>

      {error && <p className="mt-1.5 text-[12px] text-bear">{error}</p>}
    </div>
  )
}
