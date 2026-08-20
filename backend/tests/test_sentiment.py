"""Boundary table for sentiment bucketing.

The exact same cases are asserted in frontend/src/lib/sentiment.test.ts and are
encoded a third time in the SQL backfill in
supabase/migrations/20260820160000_sentiment_snapshots.sql. If a threshold moves,
all three must move together or the stored label will disagree with what the UI
renders for the same score.
"""

import pytest

from app.services.sentiment import bucket_for_score, clamp_score, label_for_score

# (score, expected_label, expected_bucket)
CASES = [
    (1.0, "Very bullish", "bullish"),
    (0.75, "Very bullish", "bullish"),
    (0.5, "Very bullish", "bullish"),      # inclusive lower bound
    (0.4999, "Bullish", "bullish"),
    (0.15, "Bullish", "bullish"),          # inclusive lower bound
    (0.1499, "Neutral", "neutral"),
    (0.0, "Neutral", "neutral"),
    (-0.1499, "Neutral", "neutral"),
    (-0.15, "Bearish", "bearish"),         # exclusive: -0.15 is NOT neutral
    (-0.4999, "Bearish", "bearish"),
    (-0.5, "Very bearish", "bearish"),     # exclusive: -0.5 is NOT bearish
    (-1.0, "Very bearish", "bearish"),
]


@pytest.mark.parametrize("score,expected_label,_bucket", CASES)
def test_label_for_score(score, expected_label, _bucket):
    assert label_for_score(score) == expected_label


@pytest.mark.parametrize("score,_label,expected_bucket", CASES)
def test_bucket_for_score(score, _label, expected_bucket):
    assert bucket_for_score(score) == expected_bucket


def test_every_score_in_range_gets_exactly_one_label():
    """No gaps and no overlaps across the whole domain."""
    valid = {"Very bullish", "Bullish", "Neutral", "Bearish", "Very bearish"}
    for i in range(-100, 101):
        assert label_for_score(i / 100) in valid


def test_bucket_agrees_with_label():
    """The coarse bucket must never contradict the fine label."""
    for i in range(-100, 101):
        score = i / 100
        label, bucket = label_for_score(score), bucket_for_score(score)
        if "bullish" in label.lower():
            assert bucket == "bullish", f"{score}: {label} / {bucket}"
        elif "bearish" in label.lower():
            assert bucket == "bearish", f"{score}: {label} / {bucket}"
        else:
            assert bucket == "neutral", f"{score}: {label} / {bucket}"


@pytest.mark.parametrize(
    "raw,expected",
    [(2.5, 1.0), (-2.5, -1.0), (0.3, 0.3), (1.0, 1.0), (-1.0, -1.0), (0, 0.0)],
)
def test_clamp_score(raw, expected):
    """The DB has a check constraint on [-1, 1]; clamping keeps a hallucinated
    score from failing the whole ingestion transaction for that ticker."""
    assert clamp_score(raw) == expected
