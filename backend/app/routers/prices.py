from datetime import datetime

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import select

from app.deps import CurrentUserId, DbSession
from app.models import PriceSnapshot

router = APIRouter(prefix="/prices", tags=["prices"])


class PriceSnapshotOut(BaseModel):
    price: float
    change_pct: float | None
    volume: float | None
    fetched_at: datetime

    model_config = {"from_attributes": True}


@router.get("/{ticker}", response_model=list[PriceSnapshotOut])
def get_price_history(
    ticker: str,
    limit: int = Query(default=50, ge=1, le=500),
    db=DbSession,
    user_id: str = CurrentUserId,
):
    ticker = ticker.strip().upper()
    rows = db.scalars(
        select(PriceSnapshot)
        .where(PriceSnapshot.ticker == ticker)
        .order_by(PriceSnapshot.fetched_at.desc())
        .limit(limit)
    ).all()
    return list(reversed(rows))
