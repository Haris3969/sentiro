import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.deps import CurrentUserId, DbSession
from app.models import WatchlistItem

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


class WatchlistItemCreate(BaseModel):
    ticker: str
    asset_type: Literal["stock", "crypto"]


class WatchlistItemOut(BaseModel):
    id: uuid.UUID
    ticker: str
    asset_type: str
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=list[WatchlistItemOut])
def list_watchlist(db=DbSession, user_id: str = CurrentUserId):
    items = db.scalars(
        select(WatchlistItem).where(WatchlistItem.user_id == user_id).order_by(WatchlistItem.created_at)
    ).all()
    return items


@router.post("", response_model=WatchlistItemOut, status_code=status.HTTP_201_CREATED)
def add_watchlist_item(payload: WatchlistItemCreate, db=DbSession, user_id: str = CurrentUserId):
    item = WatchlistItem(
        user_id=user_id,
        ticker=payload.ticker.strip().upper(),
        asset_type=payload.asset_type,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ticker already in watchlist")
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_watchlist_item(item_id: uuid.UUID, db=DbSession, user_id: str = CurrentUserId):
    item = db.scalar(
        select(WatchlistItem).where(WatchlistItem.id == item_id, WatchlistItem.user_id == user_id)
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
