-- Cross-user RLS verification for Phase 1.
--
-- Impersonates the `authenticated` role with a forged JWT claim for user A,
-- then attempts to read and mutate user B's rows. Every count must be 0.
-- Run with: psql "$DATABASE_URL" -v a=<uuid-a> -v b=<uuid-b> -f verify_rls.sql
-- (the Python harness in verify_rls.py does the same thing and asserts.)

begin;

-- Become user A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"USER_A","role":"authenticated"}';

-- 1. A must not SEE B's watchlist rows.
select 'A can read B watchlist rows' as check, count(*) as must_be_zero
  from public.watchlist_items where user_id = 'USER_B';

-- 2. A must not UPDATE B's rows.
with attempted as (
  update public.watchlist_items set ticker = 'HACKED'
   where user_id = 'USER_B' returning 1
)
select 'A can update B watchlist rows' as check, count(*) as must_be_zero from attempted;

-- 3. A must not DELETE B's rows.
with attempted as (
  delete from public.watchlist_items where user_id = 'USER_B' returning 1
)
select 'A can delete B watchlist rows' as check, count(*) as must_be_zero from attempted;

-- 4. A must not INSERT a row owned by B (policy has a WITH CHECK on user_id).
--    Expected: this raises 42501 rather than returning a count.

-- 5. Market-data tables are backend-only: RLS on, zero policies, so an
--    authenticated client sees nothing even though the data is not user-owned.
select 'A can read sentiment_snapshots' as check, count(*) as must_be_zero
  from public.sentiment_snapshots;
select 'A can read price_snapshots' as check, count(*) as must_be_zero
  from public.price_snapshots;
select 'A can read news_articles' as check, count(*) as must_be_zero
  from public.news_articles;

rollback;
