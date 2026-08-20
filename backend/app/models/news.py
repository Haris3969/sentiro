import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Numeric, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"
    __table_args__ = (
        # Ingestion upserts on this -- re-running the job must not duplicate.
        UniqueConstraint("ticker", "url", name="news_articles_ticker_url_key"),
        CheckConstraint(
            "sentiment_score is null or (sentiment_score >= -1 and sentiment_score <= 1)",
            name="news_articles_sentiment_range_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    ticker: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sentiment_score: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
