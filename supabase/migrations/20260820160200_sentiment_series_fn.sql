-- Phase 1: server-side downsampling for the sentiment trend chart.
--
-- The browser must never receive the raw series (a 45-minute cadence over 1Y is
-- ~11k rows per ticker). This buckets with date_bin and returns at most ~60
-- points per range.

create or replace function public.sentiment_series(
  p_ticker text,
  p_range  text default '1M'
)
returns table (
  bucket       timestamptz,
  avg_score    numeric,
  min_score    numeric,
  max_score    numeric,
  avg_price    numeric,
  sample_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with cfg as (
    select
      case upper(p_range)
        when '1D' then interval '1 day'
        when '1W' then interval '7 days'
        when '1M' then interval '30 days'
        when '3M' then interval '90 days'
        when '1Y' then interval '365 days'
        else           interval '30 days'
      end as window_len,
      case upper(p_range)
        when '1D' then interval '1 hour'
        when '1W' then interval '6 hours'
        when '1M' then interval '1 day'
        when '3M' then interval '3 days'
        when '1Y' then interval '7 days'
        else           interval '1 day'
      end as bucket_width
  )
  select
    date_bin((select bucket_width from cfg), s.generated_at, timestamptz 'epoch') as bucket,
    round(avg(s.sentiment_score), 4) as avg_score,
    min(s.sentiment_score)           as min_score,
    max(s.sentiment_score)           as max_score,
    round(avg(s.price), 4)           as avg_price,
    count(*)                         as sample_count
  from public.sentiment_snapshots s
  where s.ticker = upper(p_ticker)
    and s.generated_at >= now() - (select window_len from cfg)
  group by 1
  order by 1;
$$;

-- Reads market data, which is backend-only (sentiment_snapshots has RLS on with
-- no policies). SECURITY INVOKER above means RLS still applies if this is ever
-- reached over PostgREST; revoking here makes that explicit rather than relying
-- on the empty-policy fallback.
revoke execute on function public.sentiment_series(text, text) from public;
revoke execute on function public.sentiment_series(text, text) from anon, authenticated;

comment on function public.sentiment_series(text, text) is
  'Downsampled sentiment series for a ticker over 1D/1W/1M/3M/1Y. Called by the FastAPI backend via the owner role.';
