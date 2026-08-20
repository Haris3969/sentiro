import time

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.deps import CurrentUserId, DbSession
from app.models import PriceSnapshot, SentimentSnapshot, WatchlistItem
from app.services.llm import LLMError, answer_question

router = APIRouter(prefix="/ask", tags=["ask"])

_COOLDOWN_SECONDS = 15
_last_asked_at: dict[str, float] = {}


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


class AskResponse(BaseModel):
    answer: str


@router.post("", response_model=AskResponse)
def ask(payload: AskRequest, db=DbSession, user_id: str = CurrentUserId):
    now = time.monotonic()
    last = _last_asked_at.get(user_id)
    if last is not None and now - last < _COOLDOWN_SECONDS:
        wait = round(_COOLDOWN_SECONDS - (now - last))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {wait}s before asking again.",
        )

    items = db.scalars(select(WatchlistItem).where(WatchlistItem.user_id == user_id)).all()
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add at least one ticker to your watchlist before asking.",
        )

    context = _build_watchlist_context(db, items)

    _last_asked_at[user_id] = now
    try:
        answer = answer_question(payload.question.strip(), context)
    except LLMError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI is temporarily unavailable: {exc}",
        )

    return AskResponse(answer=answer)


def _build_watchlist_context(db, items: list[WatchlistItem]) -> str:
    lines = []
    for item in items:
        insight = db.scalar(
            select(SentimentSnapshot)
            .where(SentimentSnapshot.ticker == item.ticker)
            .order_by(SentimentSnapshot.generated_at.desc())
            .limit(1)
        )

        price = None
        if insight and insight.price_snapshot_id:
            price = db.get(PriceSnapshot, insight.price_snapshot_id)
        if price is None:
            price = db.scalar(
                select(PriceSnapshot)
                .where(PriceSnapshot.ticker == item.ticker)
                .order_by(PriceSnapshot.fetched_at.desc())
                .limit(1)
            )

        line = f"{item.ticker} ({item.asset_type})"
        if price:
            change = f"{price.change_pct:+.2f}%" if price.change_pct is not None else "unknown change"
            line += f": ${price.price} ({change})"
        else:
            line += ": no price data yet"

        if insight:
            line += f" — sentiment {float(insight.sentiment_score):+.2f}. {insight.narrative}"
        else:
            line += " — no AI insight yet"

        lines.append(line)

    return "\n".join(lines)
