import { motion } from 'framer-motion'

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
  return 'var(--color-muted)'
}

const RADIUS = 54
const STROKE = 10
const CIRCUMFERENCE = Math.PI * RADIUS // half circle (arc length)

export function SentimentGauge({ score }: SentimentGaugeProps) {
  const clamped = Math.max(-1, Math.min(1, score))
  const pct = (clamped + 1) / 2
  const barColor = color(clamped)
  const dashOffset = CIRCUMFERENCE * (1 - pct)

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[72px] w-[132px] shrink-0">
        <svg viewBox="0 0 132 72" className="h-full w-full overflow-visible">
          <path
            d={`M ${STROKE / 2} 66 A ${RADIUS} ${RADIUS} 0 0 1 ${132 - STROKE / 2} 66`}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          <motion.path
            d={`M ${STROKE / 2} 66 A ${RADIUS} ${RADIUS} 0 0 1 ${132 - STROKE / 2} 66`}
            fill="none"
            stroke={barColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${barColor})` }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <span className="font-display text-xl font-semibold" style={{ color: barColor }}>
            {clamped >= 0 ? '+' : ''}
            {clamped.toFixed(2)}
          </span>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-muted">Sentiment</div>
        <div className="font-display text-base font-semibold" style={{ color: barColor }}>
          {label(clamped)}
        </div>
      </div>
    </div>
  )
}
