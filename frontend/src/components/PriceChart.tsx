import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PricePoint } from '../lib/api'

interface PriceChartProps {
  history: PricePoint[]
}

export function PriceChart({ history }: PriceChartProps) {
  if (history.length === 0) {
    return (
      <div className="flex h-14 items-center text-[12px] text-dim">No price history yet</div>
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

  const bullish = data[data.length - 1].price >= data[0].price
  const stroke = bullish ? 'var(--color-bull)' : 'var(--color-bear)'
  const gradientId = bullish ? 'sparkUp' : 'sparkDown'

  return (
    <ResponsiveContainer width="100%" height={56}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.12} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="time" hide />
        <YAxis domain={['auto', 'auto']} hide />
        <Tooltip
          cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
          contentStyle={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-strong)',
            borderRadius: 8,
            fontSize: 12,
            padding: '4px 8px',
          }}
          labelStyle={{ color: 'var(--color-dim)', fontSize: 11 }}
          itemStyle={{ color: 'var(--color-text)' }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, '']}
        />
        <Area
          type="monotone"
          dataKey="price"
          stroke={stroke}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 2.5, fill: stroke, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
