from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Path, status
from pydantic import BaseModel
from sqlalchemy import select, text

from app.deps import CurrentUserId, DbSession
from app.models import PriceSnapshot, SentimentSnapshot

router = APIRouter(prefix="/insights", tags=["insights"])

VALID_RANGES = ("1D", "1W", "1M", "3M", "1Y")


class PriceOut(BaseModel):
    price: float
    change_pct: float | None
    volume: float | None
    fetched_at: datetime

    model_config = {"from_attributes": True}


class InsightOut(BaseModel):
    ticker: str
    asset_type: str
    sentiment_score: float
    label: str
    narrative: str
    generated_at: datetime
    price: PriceOut | None
    # Change in sentiment vs. the closest snapshot ~24h ago. None when there is
    # no prior snapshot to compare against (e.g. a freshly added ticker).
    score_delta_24h: float | None


class SeriesPoint(BaseModel):
    bucket: datetime
    avg_score: float
    min_score: float
    max_score: float
    avg_price: float | None
    sample_count: int


class SeriesOut(BaseModel):
    ticker: str
    range: str
    points: list[SeriesPoint]


@router.get("/{ticker}", response_model=InsightOut)
def get_latest_insight(ticker: str, db=DbSession, user_id: str = CurrentUserId):
    ticker = ticker.strip().upper()

    snapshot = db.scalar(
        select(SentimentSnapshot)
        .where(SentimentSnapshot.ticker == ticker)
        .order_by(SentimentSnapshot.generated_at.desc())
        .limit(1)
    )
    if snapshot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No cached insight for {ticker} yet — it will appear after the next scheduled refresh.",
        )

    price = None
    if snapshot.price_snapshot_id:
        price = db.get(PriceSnapshot, snapshot.price_snapshot_id)

    # Closest snapshot at or before 24h ago, for the card's trend indicator.
    cutoff = snapshot.generated_at - timedelta(hours=24)
    prior = db.scalar(
        select(SentimentSnapshot)
        .where(SentimentSnapshot.ticker == ticker, SentimentSnapshot.generated_at <= cutoff)
        .order_by(SentimentSnapshot.generated_at.desc())
        .limit(1)
    )
    delta = float(snapshot.sentiment_score) - float(prior.sentiment_score) if prior else None

    return InsightOut(
        ticker=snapshot.ticker,
        asset_type=snapshot.asset_type,
        sentiment_score=float(snapshot.sentiment_score),
        label=snapshot.label,
        narrative=snapshot.narrative,
        generated_at=snapshot.generated_at,
        price=PriceOut.model_validate(price) if price else None,
        score_delta_24h=round(delta, 4) if delta is not None else None,
    )


@router.get("/{ticker}/series", response_model=SeriesOut)
def get_sentiment_series(
    ticker: str,
    range: str = "1M",
    db=DbSession,
    user_id: str = CurrentUserId,
):
    ticker = ticker.strip().upper()
    range_key = range.strip().upper()
    if range_key not in VALID_RANGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"range must be one of {', '.join(VALID_RANGES)}",
        )

    # Bucketing happens in Postgres (sentiment_series); a 1Y window at the
    # current cadence is ~11k rows and must never reach the browser raw.
    rows = db.execute(
        text("select * from public.sentiment_series(:ticker, :range)"),
        {"ticker": ticker, "range": range_key},
    ).mappings().all()

    return SeriesOut(
        ticker=ticker,
        range=range_key,
        points=[
            SeriesPoint(
                bucket=r["bucket"],
                avg_score=float(r["avg_score"]),
                min_score=float(r["min_score"]),
                max_score=float(r["max_score"]),
                avg_price=float(r["avg_price"]) if r["avg_price"] is not None else None,
                sample_count=int(r["sample_count"]),
            )
            for r in rows
        ],
    )
