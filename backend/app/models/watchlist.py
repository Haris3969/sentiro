import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (
        UniqueConstraint("user_id", "ticker", name="watchlist_items_user_id_ticker_key"),
        CheckConstraint("asset_type in ('stock', 'crypto')", name="watchlist_items_asset_type_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    # No ORM-level ForeignKey: auth.users is Supabase-managed and outside our
    # metadata, which breaks SQLAlchemy's FK dependency-sort. The DB-level
    # constraint from the schema migration still enforces referential integrity.
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    ticker: Mapped[str] = mapped_column(Text, nullable=False)
    asset_type: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
