create table watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  ticker text not null,
  asset_type text not null check (asset_type in ('stock', 'crypto')),
  created_at timestamptz default now(),
  unique (user_id, ticker)
);

create table price_snapshots (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  price numeric not null,
  change_pct numeric,
  volume numeric,
  fetched_at timestamptz default now()
);

create table news_articles (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  title text not null,
  source text,
  url text,
  published_at timestamptz,
  fetched_at timestamptz default now()
);

create table insight_cache (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  sentiment_score numeric not null,
  narrative text not null,
  price_snapshot_id uuid references price_snapshots(id),
  generated_at timestamptz default now(),
  unique (ticker, generated_at)
);

alter table watchlist_items enable row level security;

create policy "Users can view their own watchlist items"
  on watchlist_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own watchlist items"
  on watchlist_items for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own watchlist items"
  on watchlist_items for delete
  using (auth.uid() = user_id);

create index idx_price_snapshots_ticker_fetched on price_snapshots (ticker, fetched_at desc);
create index idx_news_articles_ticker_fetched on news_articles (ticker, fetched_at desc);
create index idx_insight_cache_ticker_generated on insight_cache (ticker, generated_at desc);
