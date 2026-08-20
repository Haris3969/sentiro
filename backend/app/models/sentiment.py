import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SentimentSnapshot(Base):
    """Append-only sentiment time series. One row per (ticker, generated_at).

    Written only by the scheduled ingestion job -- never on read.
    """

    __tablename__ = "sentiment_snapshots"
    __table_args__ = (
        UniqueConstraint("ticker", "generated_at", name="sentiment_snapshots_ticker_generated_at_key"),
        CheckConstraint("asset_type in ('stock', 'crypto')", name="sentiment_snapshots_asset_type_check"),
        CheckConstraint(
            "sentiment_score >= -1 and sentiment_score <= 1",
            name="sentiment_snapshots_score_range_check",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    ticker: Mapped[str] = mapped_column(Text, nullable=False)
    asset_type: Mapped[str] = mapped_column(Text, nullable=False)
    sentiment_score: Mapped[float] = mapped_column(Numeric, nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    narrative: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[float] = mapped_column(Numeric, nullable=False)
    # Nullable on purpose: upstream price providers do not always return a
    # previous close, and 0 would read as "flat" rather than "unknown".
    change_pct: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    price_snapshot_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("price_snapshots.id"), nullable=True
    )
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
