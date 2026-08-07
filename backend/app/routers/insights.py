from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select

from app.deps import CurrentUserId, DbSession
from app.models import InsightCache, PriceSnapshot

router = APIRouter(prefix="/insights", tags=["insights"])


class PriceOut(BaseModel):
    price: float
    change_pct: float | None
    volume: float | None
    fetched_at: datetime

    model_config = {"from_attributes": True}


class InsightOut(BaseModel):
    ticker: str
    sentiment_score: float
    narrative: str
    generated_at: datetime
    price: PriceOut | None

    model_config = {"from_attributes": True}


@router.get("/{ticker}", response_model=InsightOut)
def get_latest_insight(ticker: str, db=DbSession, user_id: str = CurrentUserId):
    ticker = ticker.strip().upper()

    insight = db.scalar(
        select(InsightCache)
        .where(InsightCache.ticker == ticker)
        .order_by(InsightCache.generated_at.desc())
        .limit(1)
    )
    if insight is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No cached insight for {ticker} yet — it will appear after the next scheduled refresh.",
        )

    price = None
    if insight.price_snapshot_id:
        price = db.get(PriceSnapshot, insight.price_snapshot_id)

    return InsightOut(
        ticker=insight.ticker,
        sentiment_score=float(insight.sentiment_score),
        narrative=insight.narrative,
        generated_at=insight.generated_at,
        price=PriceOut.model_validate(price) if price else None,
    )
