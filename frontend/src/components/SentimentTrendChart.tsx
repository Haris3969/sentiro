import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetchSentimentSeries, type SentimentSeries, type SeriesPoint, type SeriesRange } from '../lib/api'
import { Skeleton } from './Skeleton'

const RANGES: SeriesRange[] = ['1D', '1W', '1M', '3M', '1Y']

interface SentimentTrendChartProps {
  ticker: string
  height?: number
}

export function SentimentTrendChart({ ticker, height = 140 }: SentimentTrendChartProps) {
  const [range, setRange] = useState<SeriesRange>('1W')
  const [reloadKey, setReloadKey] = useState(0)
  // Result is tagged with the request it belongs to, so loading/error are
  // derived rather than set synchronously inside the effect.
  const [result, setResult] = useState<{
    key: string
    series: SentimentSeries | null
    failed: boolean
  } | null>(null)

  const requestKey = `${ticker}|${range}|${reloadKey}`

  useEffect(() => {
    let cancelled = false

    fetchSentimentSeries(ticker, range)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, series: data, failed: false })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, series: null, failed: true })
      })

    return () => {
      cancelled = true
    }
  }, [ticker, range, requestKey])

  const settled = result?.key === requestKey
  const loading = !settled
  const error = settled && result.failed
  const series = settled ? result.series : null

  const rangeToggle = (
    <div
      role="group"
      aria-label="Chart range"
      className="flex items-center gap-0.5 rounded-md bg-white/[0.04] p-0.5"
    >
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setRange(r)}
          aria-pressed={range === r}
          className={`rounded px-1.5 py-0.5 text-[11px] transition-colors duration-150 ease-out ${
            range === r ? 'bg-surface-2 text-text' : 'text-dim hover:text-muted'
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  )

  const points = series?.points ?? []

  function body() {
    if (loading) return <Skeleton className="w-full" style={{ height }} />

    if (error) {
      return (
        <div className="flex flex-col items-start gap-1.5 py-4">
          <p className="text-[12px] text-muted">Couldn't load the sentiment trend.</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-[11px] text-accent transition-opacity duration-150 ease-out hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )
    }

    if (points.length === 0) {
      return (
        <p className="py-4 text-[12px] text-dim">
          No sentiment history in this range yet — it builds up as the scheduled refresh runs.
        </p>
      )
    }

    const data = points.map((p: SeriesPoint) => ({
      t: new Date(p.bucket).toLocaleString(undefined,
        range === '1D' || range === '1W'
          ? { month: 'short', day: 'numeric', hour: '2-digit' }
          : { month: 'short', day: 'numeric' },
      ),
      score: p.avg_score,
    }))

    return (
      <>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="t"
              tick={{ fontSize: 10, fill: 'var(--color-dim)' }}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis
              domain={[-1, 1]}
              ticks={[-1, 0, 1]}
              tick={{ fontSize: 10, fill: 'var(--color-dim)' }}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.16)" strokeWidth={1} />
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
              formatter={(v) => [Number(v).toFixed(2), 'Sentiment']}
            />
            {/* Neutral stroke on purpose. The accent is reserved for
                interactive elements, and a single semantic colour would
                misrepresent a line that crosses zero -- the bar beside the
                score already carries bull/bear meaning. */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--color-muted)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 2.5, fill: 'var(--color-text)', strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Screen-reader equivalent of the chart. */}
        <table className="sr-only">
          <caption>{`Sentiment score for ${ticker} over ${range}, from -1 (bearish) to +1 (bullish)`}</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Average sentiment</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.t}>
                <th scope="row">{d.t}</th>
                <td>{d.score.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-dim">Sentiment trend</span>
        {rangeToggle}
      </div>
      {body()}
    </div>
  )
}
