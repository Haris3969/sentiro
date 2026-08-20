import { AnimatePresence } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AskAI } from '../components/AskAI'
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
  const [menuOpen, setMenuOpen] = useState(false)

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

  const email = session?.user.email ?? ''
  const initial = email.charAt(0).toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <header className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-bg">
              <TrendingUp size={15} />
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-text">Sentiro</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
              aria-expanded={menuOpen}
              className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-[12px] font-medium text-muted transition-colors duration-150 ease-out hover:border-border-strong hover:text-text"
            >
              {initial}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-1.5 w-52 rounded-lg border border-border bg-surface p-1">
                  <div className="truncate px-2 py-1.5 text-[11px] text-dim">{email}</div>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="w-full rounded-md px-2 py-1.5 text-left text-[13px] text-muted transition-colors duration-150 ease-out hover:bg-white/[0.04] hover:text-text"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="w-full sm:max-w-md">
            <WatchlistForm onAdd={handleAdd} />
          </div>

          {!loading && items.length > 0 && (
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Sort watchlist"
              className="h-10 shrink-0 rounded-lg border border-transparent bg-transparent px-2 text-[12px] text-muted transition-colors duration-150 ease-out hover:border-border hover:text-text focus:outline-none sm:ml-auto"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface text-text">
                  {opt.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="mt-3 text-[12px] text-bear">{error}</p>}

        <div className="mt-4 pb-16">
          {loading ? (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
              {[...Array(4)].map((_, i) => (
                <TickerCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <p className="text-[13px] text-muted">Your watchlist is empty.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {SUGGESTED_TICKERS.map((s) => (
                  <button
                    key={s.ticker}
                    disabled={suggesting}
                    onClick={() => handleSuggestedAdd(s.ticker, s.assetType)}
                    className="rounded-md border border-border px-2.5 py-1 text-[12px] text-muted transition-colors duration-150 ease-out hover:border-border-strong hover:text-text disabled:opacity-30"
                  >
                    {s.ticker}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
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
      </div>

      <AskAI />
    </div>
  )
}
