import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AuroraBackground } from '../components/AuroraBackground'
import { TickerCard } from '../components/TickerCard'
import { WatchlistForm } from '../components/WatchlistForm'
import { addWatchlistItem, fetchWatchlist, removeWatchlistItem, type WatchlistItem } from '../lib/api'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function Dashboard() {
  const { session } = useAuth()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWatchlist()
      .then(setItems)
      .catch(() => setError('Failed to load watchlist'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(ticker: string, assetType: 'stock' | 'crypto') {
    const item = await addWatchlistItem(ticker, assetType)
    setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [...prev, item]))
  }

  async function handleRemove(id: string) {
    await removeWatchlistItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

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
          className="mb-8"
        >
          <WatchlistForm onAdd={handleAdd} />
        </motion.div>

        {error && <p className="text-sm text-bear">{error}</p>}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl border border-dashed border-border p-12 text-center"
          >
            <p className="text-sm text-muted">
              Your watchlist is empty. Add a stock or crypto ticker above to get started.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <TickerCard key={item.id} item={item} onRemove={handleRemove} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
