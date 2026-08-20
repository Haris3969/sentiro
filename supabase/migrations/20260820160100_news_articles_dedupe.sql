-- Phase 1: make news ingestion idempotent.
--
-- news_articles had no unique constraint, so every scheduler cycle re-inserted
-- the same headlines. At migration time: 4,409 rows for 628 distinct
-- (ticker, url) pairs -- 86% duplicates. Dedupe, then make it impossible to
-- happen again.

-- Keep the earliest physical row per (ticker, url).
delete from public.news_articles a
 where a.ctid <> (
        select min(b.ctid)
          from public.news_articles b
         where b.ticker = a.ticker
           and b.url    = a.url
       );

-- Verified pre-migration: 0 rows have a null url, so this is safe and makes the
-- unique constraint actually total (NULLs would otherwise compare as distinct).
alter table public.news_articles
  alter column url set not null;

alter table public.news_articles
  add constraint news_articles_ticker_url_key unique (ticker, url);

create index if not exists idx_news_articles_ticker_published
  on public.news_articles (ticker, published_at desc);

alter table public.news_articles
  add column if not exists sentiment_score numeric,
  add column if not exists summary         text;

alter table public.news_articles
  add constraint news_articles_sentiment_range_check
    check (sentiment_score is null or (sentiment_score >= -1 and sentiment_score <= 1));

comment on constraint news_articles_ticker_url_key on public.news_articles is
  'Ingestion upserts on this; re-running the scheduler must not duplicate rows.';
