import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import get_settings
from app.db import SessionLocal
from app.models import NewsArticle, PriceSnapshot, SentimentSnapshot, WatchlistItem
from app.services.llm import LLMError, generate_insight
from app.services.market_data import MarketDataError, fetch_price
from app.services.news import fetch_news
from app.services.sentiment import clamp_score, label_for_score

logger = logging.getLogger("sentiro.scheduler")

_scheduler: BackgroundScheduler | None = None


def refresh_ticker(ticker: str, asset_type: str) -> None:
    """Fetch price + news + sentiment for one ticker and persist as one unit.

    The whole thing is a single transaction: if the LLM call fails we write
    nothing for this cycle rather than leaving a price row with no insight
    attached, and the previous snapshot keeps serving.
    """
    db = SessionLocal()
    try:
        price = fetch_price(ticker, asset_type)
        price_row = PriceSnapshot(
            ticker=ticker, price=price.price, change_pct=price.change_pct, volume=price.volume
        )
        db.add(price_row)
        db.flush()

        news = fetch_news(ticker)
        if news:
            # Upsert: the same headline reappears on every cycle, and before the
            # unique constraint existed this table was 86% duplicates.
            db.execute(
                pg_insert(NewsArticle)
                .values(
                    [
                        {
                            "ticker": ticker,
                            "title": item.title,
                            "source": item.source,
                            "url": item.url,
                            "published_at": item.published_at,
                        }
                        for item in news
                        if item.url
                    ]
                )
                .on_conflict_do_nothing(constraint="news_articles_ticker_url_key")
            )

        insight = generate_insight(ticker, price, news)
        score = clamp_score(insight.sentiment_score)
        db.add(
            SentimentSnapshot(
                ticker=ticker,
                asset_type=asset_type,
                sentiment_score=score,
                label=label_for_score(score),
                narrative=insight.narrative,
                price=price.price,
                change_pct=price.change_pct,
                price_snapshot_id=price_row.id,
            )
        )
        db.commit()
        logger.info("Refreshed insight for %s", ticker)
    except (MarketDataError, LLMError) as exc:
        db.rollback()
        logger.warning("Skipped %s: %s", ticker, exc)
    except Exception:
        db.rollback()
        logger.exception("Unexpected error refreshing %s", ticker)
    finally:
        db.close()


def run_refresh_job() -> None:
    db = SessionLocal()
    try:
        rows = db.execute(select(WatchlistItem.ticker, WatchlistItem.asset_type).distinct()).all()
    finally:
        db.close()

    logger.info("Scheduled refresh starting for %d distinct ticker(s)", len(rows))
    for ticker, asset_type in rows:
        refresh_ticker(ticker, asset_type)


def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    settings = get_settings()
    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        run_refresh_job,
        trigger=IntervalTrigger(minutes=settings.insight_refresh_minutes),
        id="insight_refresh",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("Scheduler started: refreshing every %d minutes", settings.insight_refresh_minutes)
    return _scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
