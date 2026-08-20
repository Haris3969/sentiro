-- Make the market-data tables' access posture explicit.
--
-- These three tables had RLS enabled with zero policies, which already denies
-- every client (the backend reaches them through the owner role, which bypasses
-- RLS). That is the intended design, but it is indistinguishable in the schema
-- from someone forgetting to write policies -- and it trips the
-- `rls_enabled_no_policy` advisor on every audit.
--
-- These policies change nothing at runtime: deny-all was and remains the
-- behaviour. They exist so the intent is legible to a reviewer reading the
-- schema, and so a genuine missing-policy mistake on some future table is not
-- lost among three expected notices.

create policy "Market data is backend-only: no client reads"
  on public.sentiment_snapshots
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Market data is backend-only: no client reads"
  on public.price_snapshots
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Market data is backend-only: no client reads"
  on public.news_articles
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on table public.price_snapshots is
  'Market data. Written and read only by the backend via the owner role; clients are denied by policy.';
comment on table public.news_articles is
  'Market data. Written and read only by the backend via the owner role; clients are denied by policy.';
