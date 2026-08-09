import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownAZ, LogOut, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AskAI } from '../components/AskAI'
import { AuroraBackground } from '../components/AuroraBackground'
import { TickerCardSkeleton } from '../components/Skeleton'
import { TickerCard } from '../components/TickerCard'
import { WatchlistForm } from '../components/WatchlistForm'
import {
  addWatchlistItem,
  fetchInsight,
  fetchPriceHistory,
  fetchWatchlist,
  removeWatchlistItem,
  type Insight,
  type PricePoint,
  type WatchlistItem,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useToast } from '../lib/toast'

type SortMode = 'recent' | 'sentiment-desc' | 'sentiment-asc' | 'change-desc' | 'change-asc' | 'alpha'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'recent', label: 'Recently added' },
  { value: 'sentiment-desc', label: 'Most bullish' },
  { value: 'sentiment-asc', label: 'Most bearish' },
  { value: 'change-desc', label: 'Biggest gainers' },
  { value: 'change-asc', label: 'Biggest losers' },
  { value: 'alpha', label: 'A → Z' },
]

const SUGGESTED_TICKERS: { ticker: string; assetType: 'stock' | 'crypto' }[] = [
  { ticker: 'AAPL', assetType: 'stock' },
  { ticker: 'NVDA', assetType: 'stock' },
  { ticker: 'TSLA', assetType: 'stock' },
  { ticker: 'BTC', assetType: 'crypto' },
  { ticker: 'ETH', assetType: 'crypto' },
]

interface TickerData {
  insight: Insight | null
  history: PricePoint[]
}

export function Dashboard() {
  const { session } = useAuth()
  const { showToast } = useToast()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [dataByTicker, setDataByTicker] = useState<Record<string, TickerData>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [suggesting, setSuggesting] = useState(false)

  useEffect(() => {
    fetchWatchlist()
      .then(async (watchlist) => {
        setItems(watchlist)
        const entries = await Promise.all(
          watchlist.map(async (item) => {
            const [insight, history] = await Promise.all([
              fetchInsight(item.ticker),
              fetchPriceHistory(item.ticker),
            ])
            return [item.ticker, { insight, history }] as const
          }),
        )
        setDataByTicker(Object.fromEntries(entries))
      })
      .catch(() => setError('Failed to load watchlist'))
      .finally(() => setLoading(false))
  }, [])

  async function loadTickerData(ticker: string) {
    const [insight, history] = await Promise.all([fetchInsight(ticker), fetchPriceHistory(ticker)])
    setDataByTicker((prev) => ({ ...prev, [ticker]: { insight, history } }))
  }

  async function handleAdd(ticker: string, assetType: 'stock' | 'crypto') {
    const item = await addWatchlistItem(ticker, assetType)
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]))
    showToast(`Added ${item.ticker} to your watchlist`)
    loadTickerData(item.ticker).catch(() => {})
  }

  async function handleSuggestedAdd(ticker: string, assetType: 'stock' | 'crypto') {
    setSuggesting(true)
    try {
      await handleAdd(ticker, assetType)
    } catch {
      showToast(`Couldn't add ${ticker}`, 'error')
    } finally {
      setSuggesting(false)
    }
  }

  async function handleRemove(id: string) {
    const removed = items.find((i) => i.id === id)
    try {
      await removeWatchlistItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      if (removed) showToast(`Removed ${removed.ticker}`)
    } catch {
      showToast(`Couldn't remove ${removed?.ticker ?? 'ticker'} — try again`, 'error')
      throw new Error('remove failed')
    }
  }

  const sortedItems = useMemo(() => {
    const withData = items.map((item) => ({ item, data: dataByTicker[item.ticker] }))

    const sentimentOf = (t: TickerData | undefined) => t?.insight?.sentiment_score ?? null
    const changeOf = (t: TickerData | undefined) =>
      t?.insight?.price?.change_pct ?? t?.history[t.history.length - 1]?.change_pct ?? null

    switch (sortMode) {
      case 'sentiment-desc':
        return withData.sort((a, b) => (sentimentOf(b.data) ?? -2) - (sentimentOf(a.data) ?? -2)).map((x) => x.item)
      case 'sentiment-asc':
        return withData.sort((a, b) => (sentimentOf(a.data) ?? 2) - (sentimentOf(b.data) ?? 2)).map((x) => x.item)
      case 'change-desc':
        return withData.sort((a, b) => (changeOf(b.data) ?? -Infinity) - (changeOf(a.data) ?? -Infinity)).map((x) => x.item)
      case 'change-asc':
        return withData.sort((a, b) => (changeOf(a.data) ?? Infinity) - (changeOf(b.data) ?? Infinity)).map((x) => x.item)
      case 'alpha':
        return [...items].sort((a, b) => a.ticker.localeCompare(b.ticker))
      case 'recent':
      default:
        return items
    }
  }, [items, dataByTicker, sortMode])

  return (
    <div className="relative min-h-screen">
      <AuroraBackground />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-bg shadow-lg shadow-accent/25">
              <TrendingUp size={20} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-text">Sentiro</h1>
              <p className="text-xs text-muted">{session?.user.email}</p>
            </div>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-bear/40 hover:text-bear"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-4"
        >
          <WatchlistForm onAdd={handleAdd} />
        </motion.div>

        {error && <p className="text-sm text-bear">{error}</p>}

        {!loading && items.length > 0 && (
          <div className="mb-4 flex items-center justify-end gap-2">
            <ArrowDownAZ size={14} className="text-muted" />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text focus:border-accent focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <TickerCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl border border-dashed border-border p-12 text-center"
          >
            <p className="mb-4 text-sm text-muted">
              Your watchlist is empty. Add a stock or crypto ticker above, or try one of these:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_TICKERS.map((s) => (
                <button
                  key={s.ticker}
                  disabled={suggesting}
                  onClick={() => handleSuggestedAdd(s.ticker, s.assetType)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-text transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                >
                  {s.ticker}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {sortedItems.map((item) => (
                <TickerCard
                  key={item.id}
                  item={item}
                  insight={dataByTicker[item.ticker]?.insight ?? null}
                  history={dataByTicker[item.ticker]?.history ?? []}
                  loading={!(item.ticker in dataByTicker)}
                  onRemove={handleRemove}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AskAI />
    </div>
  )
}
