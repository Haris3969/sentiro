interface SentimentGaugeProps {
  score: number
}

function label(score: number): string {
  if (score >= 0.5) return 'Very bullish'
  if (score >= 0.15) return 'Bullish'
  if (score > -0.15) return 'Neutral'
  if (score > -0.5) return 'Bearish'
  return 'Very bearish'
}

function color(score: number): string {
  if (score > 0.15) return 'var(--color-bull)'
  if (score < -0.15) return 'var(--color-bear)'
  return 'var(--color-flat)'
}

export function SentimentGauge({ score }: SentimentGaugeProps) {
  const clamped = Math.max(-1, Math.min(1, score))
  const tone = color(clamped)

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
      <span className="text-[11px] uppercase tracking-wider text-dim">{label(clamped)}</span>
    </div>
  )
}
