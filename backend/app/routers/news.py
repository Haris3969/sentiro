from datetime import datetime

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import select

from app.deps import CurrentUserId, DbSession
from app.models import NewsArticle

router = APIRouter(prefix="/news", tags=["news"])


class NewsItemOut(BaseModel):
    id: str
    title: str
    source: str | None
    url: str
    published_at: datetime | None
    sentiment_score: float | None
    summary: str | None


@router.get("/{ticker}", response_model=list[NewsItemOut])
def get_news(
    ticker: str,
    limit: int = Query(default=10, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db=DbSession,
    user_id: str = CurrentUserId,
):
    ticker = ticker.strip().upper()
    rows = db.scalars(
        select(NewsArticle)
        .where(NewsArticle.ticker == ticker)
        # published_at can be null upstream; nulls sort last so dated news wins.
        .order_by(NewsArticle.published_at.desc().nullslast(), NewsArticle.fetched_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    return [
        NewsItemOut(
            id=str(r.id),
            title=r.title,
            source=r.source,
            url=r.url,
            published_at=r.published_at,
            sentiment_score=float(r.sentiment_score) if r.sentiment_score is not None else None,
            summary=r.summary,
        )
        for r in rows
    ]
