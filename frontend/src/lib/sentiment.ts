/**
 * Sentiment score bucketing — TypeScript mirror of backend/app/services/sentiment.py.
 *
 * These thresholds also appear in the SQL backfill in
 * supabase/migrations/20260820160000_sentiment_snapshots.sql. All three must
 * agree; sentiment.test.ts asserts the same boundary table the Python tests do.
 */

export const VERY_BULLISH_AT = 0.5
export const BULLISH_AT = 0.15
export const BEARISH_AT = -0.15
export const VERY_BEARISH_AT = -0.5

export type SentimentBucket = 'bullish' | 'neutral' | 'bearish'

export function labelForScore(score: number): string {
  if (score >= VERY_BULLISH_AT) return 'Very bullish'
  if (score >= BULLISH_AT) return 'Bullish'
  if (score > BEARISH_AT) return 'Neutral'
  if (score > VERY_BEARISH_AT) return 'Bearish'
  return 'Very bearish'
}

export function bucketForScore(score: number): SentimentBucket {
  if (score >= BULLISH_AT) return 'bullish'
  if (score > BEARISH_AT) return 'neutral'
  return 'bearish'
}

export function clampScore(score: number): number {
  return Math.max(-1, Math.min(1, score))
}

/** Semantic colour token for a score. Never used decoratively. */
export function toneForScore(score: number): string {
  const bucket = bucketForScore(score)
  if (bucket === 'bullish') return 'var(--color-bull)'
  if (bucket === 'bearish') return 'var(--color-bear)'
  return 'var(--color-flat)'
}
