import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PricePoint } from '../lib/api'

interface PriceChartProps {
  history: PricePoint[]
}

export function PriceChart({ history }: PriceChartProps) {
  if (history.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted">
        No price history yet
      </div>
    )
  }

  const data = history.map((p) => ({
    time: new Date(p.fetched_at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    price: p.price,
  }))

  const first = data[0].price
  const last = data[data.length - 1].price
  const bullish = last >= first
  const lineColor = bullish ? 'var(--color-bull)' : 'var(--color-bear)'
  const gradientId = bullish ? 'priceGradientUp' : 'priceGradientDown'

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" hide />
        <YAxis domain={['auto', 'auto']} hide />
        <Tooltip
          contentStyle={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: 'var(--color-muted)' }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={lineColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
