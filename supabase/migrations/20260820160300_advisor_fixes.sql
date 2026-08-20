-- Phase 1: fixes for what the security/performance advisors flag.

-- 1. auth_rls_initplan
-- Bare auth.uid() is re-evaluated once per candidate row. Wrapping it in a
-- scalar subquery lets the planner hoist it to an InitPlan and evaluate it once
-- per statement instead. Same semantics, materially cheaper as the table grows.
alter policy "Users can view their own watchlist items"
  on public.watchlist_items
  using ((select auth.uid()) = user_id);

alter policy "Users can insert their own watchlist items"
  on public.watchlist_items
  with check ((select auth.uid()) = user_id);

alter policy "Users can delete their own watchlist items"
  on public.watchlist_items
  using ((select auth.uid()) = user_id);

-- 2. unindexed_foreign_key
-- sentiment_snapshots.price_snapshot_id is joined on every latest-insight read
-- and had no supporting index; it also makes deletes on price_snapshots do a
-- sequential scan to enforce the FK.
create index if not exists idx_sentiment_snapshots_price_snapshot
  on public.sentiment_snapshots (price_snapshot_id);
