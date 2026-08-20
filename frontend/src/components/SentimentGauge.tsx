import { clampScore, labelForScore, toneForScore } from '../lib/sentiment'

interface SentimentGaugeProps {
  score: number
}

export function SentimentGauge({ score }: SentimentGaugeProps) {
  const clamped = clampScore(score)
  const tone = toneForScore(clamped)

  // Center-anchored: the fill grows out from 50% toward whichever end.
  const magnitude = Math.abs(clamped) * 50
  const left = clamped >= 0 ? 50 : 50 - magnitude

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/15" />
        <div
          className="absolute top-0 h-full rounded-full transition-[width,left] duration-150 ease-out"
          style={{ left: `${left}%`, width: `${magnitude}%`, background: tone }}
        />
      </div>
      <span className="text-[13px] tabular-nums" style={{ color: tone }}>
        {clamped >= 0 ? '+' : ''}
        {clamped.toFixed(2)}
      </span>
      <span className="text-[11px] uppercase tracking-wider text-dim">{labelForScore(clamped)}</span>
    </div>
  )
}

/** Trend indicator: "+0.18 vs. yesterday". Renders nothing without a prior snapshot. */
export function SentimentDelta({ delta }: { delta: number | null }) {
  if (delta === null) return null

  const flat = Math.abs(delta) < 0.005
  const tone = flat
    ? 'var(--color-flat)'
    : delta > 0
      ? 'var(--color-bull)'
      : 'var(--color-bear)'

  return (
    <span className="text-[11px] tabular-nums" style={{ color: tone }}>
      {flat ? 'flat' : `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`}
      <span className="text-dim"> vs. yesterday</span>
    </span>
  )
}
