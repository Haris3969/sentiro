import { motion } from 'framer-motion'
import { X } from 'lucide-react'
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
  const changeTone =
    price?.change_pct == null
      ? 'text-dim'
      : price.change_pct >= 0
        ? 'text-bull'
        : 'text-bear'

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="group rounded-xl border border-border bg-surface p-4 transition-colors duration-150 ease-out hover:border-border-strong focus-within:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-[20px] font-semibold leading-none tracking-tight text-text">
            {item.ticker}
          </h3>
          <span className="shrink-0 rounded border border-border px-1.5 py-px text-[10px] uppercase tracking-wider text-dim">
            {item.asset_type}
          </span>
        </div>

        <div className="flex items-start gap-2">
          {price && (
            <div className="text-right leading-none">
              <div className="text-[20px] font-medium tabular-nums text-text">
                ${price.price.toFixed(2)}
              </div>
              {price.change_pct !== null && (
                <div className={`mt-1 text-[13px] tabular-nums ${changeTone}`}>
                  {price.change_pct >= 0 ? '+' : ''}
                  {price.change_pct.toFixed(2)}%
                </div>
              )}
            </div>
          )}
          {/* Space is always reserved so revealing this causes no layout shift. */}
          <button
            onClick={handleRemove}
            disabled={removing}
            className="-mr-1 -mt-1 rounded p-1 text-dim opacity-0 transition-[opacity,color] duration-150 ease-out hover:text-bear focus:opacity-100 group-hover:opacity-100 disabled:opacity-30"
            aria-label={`Remove ${item.ticker}`}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <PriceChart history={history} />
      </div>

      {insight ? (
        <>
          <div className="mt-3">
            <SentimentGauge score={insight.sentiment_score} />
          </div>
          <div className="mt-3">
            <NarrativeCard narrative={insight.narrative} generatedAt={insight.generated_at} />
          </div>
        </>
      ) : (
        <p className="mt-3 text-[12px] text-dim">
          No insight yet — appears after the next scheduled refresh.
        </p>
      )}
    </motion.div>
  )
}
