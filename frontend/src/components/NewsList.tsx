import { useEffect, useState } from 'react'
import { fetchNews, type NewsItem } from '../lib/api'
import { toneForScore } from '../lib/sentiment'
import { Skeleton } from './Skeleton'

interface NewsListProps {
  ticker: string
  limit?: number
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function NewsList({ ticker, limit = 5 }: NewsListProps) {
  const [reloadKey, setReloadKey] = useState(0)
  // Tagged result: loading/error are derived, never set inside the effect body.
  const [result, setResult] = useState<{
    key: string
    items: NewsItem[]
    failed: boolean
  } | null>(null)

  const requestKey = `${ticker}|${limit}|${reloadKey}`

  useEffect(() => {
    let cancelled = false

    fetchNews(ticker, limit)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, items: data, failed: false })
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, items: [], failed: true })
      })

    return () => {
      cancelled = true
    }
  }, [ticker, limit, requestKey])

  const settled = result?.key === requestKey
  const loading = !settled
  const error = settled && result.failed
  const items = settled ? result.items : []

  return (
    <div>
      <div className="mb-2 text-[11px] uppercase tracking-wider text-dim">Recent news</div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-[85%]" />
              <Skeleton className="h-2.5 w-[40%]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-start gap-1.5">
          <p className="text-[12px] text-muted">Couldn't load news.</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="text-[11px] text-accent transition-opacity duration-150 ease-out hover:opacity-80"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-[12px] text-dim">
          No headlines stored for {ticker} yet — they arrive with the next scheduled refresh.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className="flex gap-2">
              {/* Per-item sentiment is not scored yet, so the dot is rendered
                  only when there is a real value behind it -- a column of
                  identical grey dots communicates nothing. */}
              {n.sentiment_score !== null && (
                <span
                  aria-hidden
                  className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: toneForScore(n.sentiment_score) }}
                />
              )}
              <div className="min-w-0">
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 text-[13px] leading-[1.45] text-muted transition-colors duration-150 ease-out hover:text-text"
                >
                  {n.title}
                </a>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-dim">
                  {n.source && <span className="truncate">{n.source}</span>}
                  {n.source && n.published_at && <span aria-hidden>·</span>}
                  {n.published_at && <span>{relativeTime(n.published_at)}</span>}
                  {n.sentiment_score !== null && (
                    <span className="sr-only">
                      sentiment {n.sentiment_score.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
