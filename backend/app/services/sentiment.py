"""Sentiment score bucketing.

Single source of truth for score -> label/bucket. The same thresholds are
mirrored in three other places that cannot import this module, so they must be
kept in lockstep:

  - supabase/migrations/20260820160000_sentiment_snapshots.sql (backfill CASE)
  - frontend/src/lib/sentiment.ts (labelForScore / bucketForScore)

Both mirrors are covered by tests that assert the same boundary table.
"""

# Boundaries are inclusive-lower for the bullish side and exclusive for the
# bearish side, so exactly one label matches any score in [-1, 1].
VERY_BULLISH_AT = 0.5
BULLISH_AT = 0.15
BEARISH_AT = -0.15
VERY_BEARISH_AT = -0.5


def label_for_score(score: float) -> str:
    """Human-readable label, as displayed on the card and stored on the row."""
    if score >= VERY_BULLISH_AT:
        return "Very bullish"
    if score >= BULLISH_AT:
        return "Bullish"
    if score > BEARISH_AT:
        return "Neutral"
    if score > VERY_BEARISH_AT:
        return "Bearish"
    return "Very bearish"


def bucket_for_score(score: float) -> str:
    """Coarse three-way bucket. Used for filtering, not display."""
    if score >= BULLISH_AT:
        return "bullish"
    if score > BEARISH_AT:
        return "neutral"
    return "bearish"


def clamp_score(score: float) -> float:
    """Constrain to the [-1, 1] range the DB check constraint enforces."""
    return max(-1.0, min(1.0, float(score)))
