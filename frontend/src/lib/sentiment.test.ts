import { describe, expect, it } from 'vitest'
import { bucketForScore, clampScore, labelForScore, type SentimentBucket } from './sentiment'

/**
 * This table is duplicated verbatim in backend/tests/test_sentiment.py. Both
 * must pass for the label stored on a row to match the label the UI renders
 * for the same score.
 */
const CASES: [number, string, SentimentBucket][] = [
  [1.0, 'Very bullish', 'bullish'],
  [0.75, 'Very bullish', 'bullish'],
  [0.5, 'Very bullish', 'bullish'], // inclusive lower bound
  [0.4999, 'Bullish', 'bullish'],
  [0.15, 'Bullish', 'bullish'], // inclusive lower bound
  [0.1499, 'Neutral', 'neutral'],
  [0.0, 'Neutral', 'neutral'],
  [-0.1499, 'Neutral', 'neutral'],
  [-0.15, 'Bearish', 'bearish'], // exclusive: -0.15 is NOT neutral
  [-0.4999, 'Bearish', 'bearish'],
  [-0.5, 'Very bearish', 'bearish'], // exclusive: -0.5 is NOT bearish
  [-1.0, 'Very bearish', 'bearish'],
]

describe('labelForScore', () => {
  it.each(CASES)('%f -> %s', (score, label) => {
    expect(labelForScore(score)).toBe(label)
  })
})

describe('bucketForScore', () => {
  it.each(CASES)('%f -> bucket %s', (score, _label, bucket) => {
    expect(bucketForScore(score)).toBe(bucket)
  })
})

describe('invariants across the whole domain', () => {
  const scores = Array.from({ length: 201 }, (_, i) => (i - 100) / 100)

  it('assigns exactly one known label to every score in [-1, 1]', () => {
    const valid = new Set(['Very bullish', 'Bullish', 'Neutral', 'Bearish', 'Very bearish'])
    for (const s of scores) expect(valid.has(labelForScore(s))).toBe(true)
  })

  it('never lets the coarse bucket contradict the fine label', () => {
    for (const s of scores) {
      const label = labelForScore(s).toLowerCase()
      const bucket = bucketForScore(s)
      if (label.includes('bullish')) expect(bucket).toBe('bullish')
      else if (label.includes('bearish')) expect(bucket).toBe('bearish')
      else expect(bucket).toBe('neutral')
    }
  })
})

describe('clampScore', () => {
  it.each([
    [2.5, 1],
    [-2.5, -1],
    [0.3, 0.3],
    [1, 1],
    [-1, -1],
    [0, 0],
  ])('clamps %f to %f', (raw, expected) => {
    expect(clampScore(raw)).toBe(expected)
  })
})
