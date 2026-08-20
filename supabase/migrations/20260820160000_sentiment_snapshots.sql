-- Phase 1: promote insight_cache to a durable sentiment time series.
--
-- insight_cache was already append-only and already held ~12 days of history
-- (the LLM has never been called on read), so this renames and extends it in
-- place rather than creating a parallel table and abandoning that history.
-- Column naming stays on `ticker` to match the rest of the codebase.

alter table public.insight_cache rename to sentiment_snapshots;

alter index public.insight_cache_pkey rename to sentiment_snapshots_pkey;
alter index public.insight_cache_ticker_generated_at_key
  rename to sentiment_snapshots_ticker_generated_at_key;
alter index public.idx_insight_cache_ticker_generated
  rename to idx_sentiment_snapshots_ticker_generated;

alter table public.sentiment_snapshots
  add column if not exists asset_type text,
  add column if not exists label      text,
  add column if not exists price      numeric,
  add column if not exists change_pct numeric;

-- Denormalise price off the linked snapshot so the series can be read without
-- a join. Verified pre-migration: 0 rows have a null price_snapshot_id.
update public.sentiment_snapshots s
   set price      = p.price,
       change_pct = p.change_pct
  from public.price_snapshots p
 where s.price_snapshot_id = p.id
   and s.price is null;

-- Verified pre-migration: every ticker present here also exists in
-- watchlist_items, so this backfill covers 100% of rows.
update public.sentiment_snapshots s
   set asset_type = w.asset_type
  from (
        select distinct on (ticker) ticker, asset_type
          from public.watchlist_items
         order by ticker, created_at
       ) w
 where s.ticker = w.ticker
   and s.asset_type is null;

-- Buckets must stay in lockstep with app/services/sentiment.py::label_for_score
-- and frontend/src/lib/sentiment.ts::labelForScore.
update public.sentiment_snapshots
   set label = case
                 when sentiment_score >=  0.5  then 'Very bullish'
                 when sentiment_score >=  0.15 then 'Bullish'
                 when sentiment_score >  -0.15 then 'Neutral'
                 when sentiment_score >  -0.5  then 'Bearish'
                 else                               'Very bearish'
               end
 where label is null;

alter table public.sentiment_snapshots
  alter column asset_type set not null,
  alter column label      set not null,
  alter column price      set not null;

-- change_pct stays nullable: upstream price providers do not always return a
-- previous close, and inventing a 0 there would read as "flat" rather than
-- "unknown".

alter table public.sentiment_snapshots
  add constraint sentiment_snapshots_asset_type_check
    check (asset_type in ('stock', 'crypto')),
  add constraint sentiment_snapshots_score_range_check
    check (sentiment_score >= -1 and sentiment_score <= 1);

-- Rows are immutable once written (append-only series), so there is
-- deliberately no updated_at column or touch trigger here.

comment on table public.sentiment_snapshots is
  'Append-only sentiment time series, one row per (ticker, generated_at). Written only by the scheduled ingestion job; never on read.';
