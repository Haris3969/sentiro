import { motion } from 'framer-motion'
import { Bitcoin, LineChart as LineChartIcon, X } from 'lucide-react'
import { useState } from 'react'
import type { Insight, PricePoint, WatchlistItem } from '../lib/api'
import { NarrativeCard } from './NarrativeCard'
import { PriceChart } from './PriceChart'
import { SentimentGauge } from './SentimentGauge'
import { TickerCardSkeleton } from './Skeleton'

interface TickerCardProps {
  item: WatchlistItem
  insight: Insight | null
  history: PricePoint[]
  loading: boolean
  onRemove: (id: string) => void
}

export function TickerCard({ item, insight, history, loading, onRemove }: TickerCardProps) {
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    setRemoving(true)
    try {
      await onRemove(item.id)
    } catch {
      setRemoving(false)
    }
  }

  if (loading) {
    return <TickerCardSkeleton />
  }

  const price = insight?.price ?? history[history.length - 1] ?? null
  const Icon = item.asset_type === 'crypto' ? Bitcoin : LineChartIcon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="glass group relative overflow-hidden rounded-2xl border border-border p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-shadow hover:border-accent/40 hover:shadow-[0_8px_40px_-12px_var(--color-accent)]"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent-2/20 text-accent">
            <Icon size={18} />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold leading-none text-text">
              {item.ticker}
            </h3>
            <span className="text-xs uppercase tracking-wide text-muted">{item.asset_type}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {price && (
            <div className="text-right">
              <div className="font-mono text-sm text-text">${price.price.toFixed(2)}</div>
              {price.change_pct !== null && (
                <div className={price.change_pct >= 0 ? 'text-xs text-bull' : 'text-xs text-bear'}>
                  {price.change_pct >= 0 ? '+' : ''}
                  {price.change_pct.toFixed(2)}%
                </div>
              )}
            </div>
          )}
          <button
            onClick={handleRemove}
            disabled={removing}
            className="rounded-md p-1 text-muted opacity-0 transition-opacity hover:text-bear group-hover:opacity-100 disabled:opacity-50"
            aria-label={`Remove ${item.ticker}`}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <PriceChart history={history} />
        {insight ? (
          <>
            <SentimentGauge score={insight.sentiment_score} />
            <NarrativeCard narrative={insight.narrative} generatedAt={insight.generated_at} />
          </>
        ) : (
          <p className="text-sm text-muted">
            No insight yet — it will appear after the next scheduled refresh.
          </p>
        )}
      </div>
    </motion.div>
  )
}
