# Sentiro — Project Spec & Claude Code Build Prompt

AI-powered market & crypto sentiment dashboard. Users build a personal watchlist;
the app pulls live price data and recent news, then uses an LLM to generate a
sentiment score and a plain-English narrative ("why is this moving") per ticker.

---

## 1. Goals

- Working, deployable portfolio project demonstrating: API integration, data
  pipelines, LLM-as-reasoning-layer, auth, caching strategy, clean UI.
- Must run entirely on free tiers (APIs, hosting, DB).
- MVP first, polish second. Ship something real before adding alerts/extras.

## 2. Tech Stack

- **Frontend**: React + TypeScript (Vite), Tailwind CSS, Recharts, Axios
- **Backend**: FastAPI (Python), SQLAlchemy, APScheduler
- **Database + Auth**: Supabase (Postgres + built-in auth)
- **LLM**: Claude API (Anthropic) — model `claude-sonnet-4-6` or latest available
- **Market data**: `yfinance` (stocks, no key) + CoinGecko free API (crypto, no key)
- **News**: Marketaux free tier (financial news w/ metadata) as primary,
  NewsAPI dev tier as fallback
- **Deployment**: Vercel (frontend), Render or Railway (backend), Supabase (DB)

## 3. Architecture / Data Flow

1. User signs in (Supabase Auth) and builds a watchlist (tickers: stocks and/or crypto).
2. APScheduler job runs on a fixed interval (e.g. every 30–60 min) per active ticker.
3. Job pulls: (a) latest price/volume data, (b) recent news articles for that ticker.
4. Backend sends the news cluster + price movement to Claude, which returns:
   - a sentiment score (e.g. -1.0 to 1.0)
   - a short plain-English narrative explaining the movement/mood
5. Results are cached in Postgres (keyed by ticker + timestamp) — the LLM is
   NEVER called on page load, only on the scheduled refresh.
6. Frontend fetches cached data from FastAPI and renders: price chart, sentiment
   gauge, narrative card, per ticker.

**Critical constraint**: LLM calls and external API calls happen only in the
scheduled job, never per-request, to stay within free tier limits and keep
LLM cost near zero.

## 4. Database Schema (Postgres / Supabase)

```sql
-- users handled by Supabase Auth (auth.users)

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
```

## 5. API Integrations & Env Vars

| Service | Purpose | Env var |
|---|---|---|
| Anthropic | LLM reasoning | `ANTHROPIC_API_KEY` |
| Supabase | DB + auth | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY` |
| Marketaux | News | `MARKETAUX_API_KEY` |
| NewsAPI (fallback) | News | `NEWSAPI_KEY` |
| yfinance | Stock prices | none (no key) |
| CoinGecko | Crypto prices | none (no key) |

All keys go in `backend/.env` (never committed — already gitignored).

## 6. Folder Structure (already scaffolded)

```
Sentiro/
  backend/
    app/
      routers/       # watchlist.py, insights.py, prices.py
      models/         # SQLAlchemy models
      services/        # market_data.py, news.py, llm.py, scheduler.py
      main.py
    requirements.txt
    .env
  frontend/
    src/
      components/     # PriceChart, SentimentGauge, NarrativeCard, WatchlistForm
      pages/           # Dashboard, Login
      lib/             # api client, supabase client
    package.json
  README.md
```

## 7. MVP Scope (build in this order)

1. Supabase project set up, schema applied, auth working
2. FastAPI: watchlist CRUD endpoints (add/remove ticker, list watchlist)
3. `services/market_data.py`: fetch price data via yfinance/CoinGecko
4. `services/news.py`: fetch news via Marketaux
5. `services/llm.py`: build prompt, call Claude, parse sentiment + narrative
6. `services/scheduler.py`: APScheduler job that runs steps 3–5 per watchlist ticker, writes to `insight_cache`
7. Read endpoints: `/insights/{ticker}` returns latest cached insight + price history
8. Frontend: auth flow, watchlist management UI, dashboard with chart + sentiment gauge + narrative card per ticker
9. Deploy: frontend → Vercel, backend → Render, verify scheduled job runs on the deployed backend

## 8. Stretch Goals (after MVP works end-to-end)

- Sentiment-change alerts (email or in-app)
- Historical sentiment trend chart (not just current)
- Compare multiple tickers side by side
- Rate-limit-aware fallback between news providers

---

## Prompt for Claude Code

Paste the following into Claude Code in the `Sentiro/` project root:

```
I'm building Sentiro, an AI-powered market & crypto sentiment dashboard.
Full spec is in Sentiro_Project_Spec.md in this repo root — read it first.

The backend/ and frontend/ folders already exist with a basic FastAPI +
Vite/React/TS scaffold and dependencies installed. Do not re-scaffold them.

Build MVP scope items 1–9 from the spec, in order, one at a time. For each
item:
- Implement it fully (working code, not stubs)
- Tell me exactly what env vars or manual setup steps I need to do (e.g.
  creating the Supabase project, running the SQL schema, getting API keys)
  before you continue to the next item
- Keep backend code in backend/app following the folder structure in the spec
- Keep frontend code in frontend/src following the folder structure in the spec
- Use the exact database schema in section 4 of the spec
- Follow the "never call the LLM or external APIs per-request" constraint in
  section 3 — all external calls happen only in the scheduled job

Start with item 1: guide me through Supabase project setup and applying the
schema, then confirm before moving to item 2.
```
