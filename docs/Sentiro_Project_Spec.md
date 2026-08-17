# Sentiro — Project Spec & Roadmap

AI-powered market & crypto sentiment dashboard. Users build a personal watchlist;
the app pulls live price data and recent news, then uses an LLM to generate a
sentiment score and a plain-English narrative ("why is this moving") per ticker.

**Status: MVP shipped and live.**
- Frontend: https://sentiro-two.vercel.app
- Backend: https://sentiro-backend-production.up.railway.app
- Repo: https://github.com/Haris3969/sentiro (public)

This doc now covers both what was built (Phase 1) and the roadmap for the
6-week internship continuation (Phase 2).

---

## 1. Goals

**Phase 1 (done):** working, deployable portfolio project demonstrating: API
integration, data pipelines, LLM-as-reasoning-layer, auth, caching strategy,
clean UI. Ran entirely on free tiers.

**Phase 2 (internship, in progress):** take Sentiro from portfolio project to
product — real reliability (tests, CI/CD, monitoring), a monetizable feature
set (billing, alerts, richer AI), and technical depth worth showcasing
(multi-provider LLM ensembling, RAG-backed Ask AI, cost/rate-limit tracking).

## 2. Tech Stack

- **Frontend**: React + TypeScript (Vite), Tailwind CSS v4, Recharts, Framer Motion, lucide-react, Axios
- **Backend**: FastAPI (Python), SQLAlchemy, APScheduler
- **Database + Auth**: Supabase (Postgres + built-in auth, row-level security)
- **LLM**: fallback chain, tried in order until one succeeds — **Gemini**
  (`gemini-flash-latest`) → **OpenRouter** (`openai/gpt-oss-20b:free`) →
  **Cohere** (`command-r-08-2024`). All free tier, no card required.
- **Market data**: `yfinance` (stocks, no key) + CoinGecko free API (crypto, no key)
- **News**: Marketaux free tier (financial news w/ metadata) as primary,
  NewsAPI dev tier as fallback
- **Deployment**: Vercel (frontend), Railway (backend, $5/30-day trial —
  not a permanent free tier, revisit before it lapses), Supabase (DB)

> Note: the original plan used Anthropic Claude + Render + Groq. Claude and
> Groq were dropped over account/billing friction during setup; Render was
> dropped for Railway because Railway's CLI supports non-interactive
> project/env/deploy automation, which Render's dashboard-only flow doesn't.
> Functionally equivalent, worth knowing if debugging old references.

## 3. Architecture / Data Flow

1. User signs in (Supabase Auth) and builds a watchlist (tickers: stocks and/or crypto).
2. APScheduler job runs on a fixed interval (`INSIGHT_REFRESH_MINUTES`, default 45)
   for every **distinct** ticker across all users' watchlists (shared cache, not
   per-user — tracking a ticker 1,000 users already track costs zero extra API calls).
3. Job pulls: (a) latest price/volume data, (b) recent news articles for that ticker.
4. Backend sends the news cluster + price movement through the LLM fallback chain,
   which returns:
   - a sentiment score (-1.0 to 1.0)
   - a short plain-English narrative explaining the movement/mood
5. Results are cached in Postgres (keyed by ticker + timestamp) — the LLM is
   NEVER called on page load, only on the scheduled refresh. The whole
   price+news+insight write is one atomic transaction per ticker: if the LLM
   call fails, nothing is written for that cycle (no orphaned price rows with
   no insight) and the last successful insight keeps serving.
6. Frontend fetches cached data from FastAPI and renders: price chart, sentiment
   gauge, narrative card, per ticker. Cards are sortable (recent / most bullish
   / most bearish / biggest gainers / biggest losers / A–Z).

**Critical constraint**: LLM calls and external API calls happen only in the
scheduled job, never per-request, to stay within free tier limits and keep
LLM cost near zero.

**Two deliberate, narrow exceptions to that rule** (both shipped in Phase 1):
- **Ticker validation on add** (`POST /watchlist`) — a one-time yfinance/CoinGecko
  lookup before inserting, rejecting nonexistent symbols instead of accepting
  garbage that fails every refresh cycle forever. Free, keyless APIs, rare
  user-initiated action — acceptable cost.
- **Ask AI** (`POST /ask`) — user-initiated natural-language Q&A over their own
  cached watchlist data, using the same LLM fallback chain. Rate-limited to
  1 question / 15s / user (in-process, not distributed-safe — fine for a
  single Railway instance, needs revisiting if scaled horizontally).

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

RLS: `watchlist_items` has per-user select/insert/delete policies. The other
three tables have RLS enabled with **no** public policies — they're
backend-only (service-role DB connection bypasses RLS), never queried
directly by the frontend.

> Planned addition for Phase 2 RAG work (see §9): a `pgvector`-backed table
> for embeddings over `news_articles` + historical `insight_cache` narratives.
> Supabase supports the `pgvector` extension natively — no new infra needed.

## 5. API Integrations & Env Vars

| Service | Purpose | Env var |
|---|---|---|
| Google AI Studio (Gemini) | LLM reasoning, primary | `GEMINI_API_KEY` |
| OpenRouter | LLM reasoning, fallback #1 | `OPENROUTER_API_KEY` |
| Cohere | LLM reasoning, fallback #2 | `COHERE_API_KEY` |
| Supabase | DB + auth | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `DATABASE_URL` |
| Marketaux | News, primary | `MARKETAUX_API_KEY` |
| NewsAPI | News, fallback | `NEWSAPI_KEY` |
| yfinance | Stock prices | none (no key) |
| CoinGecko | Crypto prices | none (no key) |

App config: `CORS_ORIGINS`, `INSIGHT_REFRESH_MINUTES`.

Frontend (`frontend/.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.

All keys go in `backend/.env` / `frontend/.env` (never committed — gitignored;
`.env.example` files document the shape). Production values are set directly
on Railway/Vercel via their CLIs, not synced from local `.env`.

## 6. Folder Structure (as built)

```
Sentiro/
  backend/
    app/
      routers/        # watchlist.py, insights.py, prices.py, ask.py
      models/          # SQLAlchemy models (watchlist, price, news, insight)
      services/        # market_data.py, news.py, llm.py, scheduler.py
      config.py        # pydantic-settings
      db.py            # SQLAlchemy engine/session
      deps.py           # auth dependency (verifies Supabase JWT), db session dep
      main.py
    scripts/
      refresh_now.py   # manually trigger one refresh cycle (bypasses scheduler wait)
    requirements.txt
    Procfile           # Railway/Nixpacks start command
    .env
  frontend/
    src/
      components/      # PriceChart, SentimentGauge, NarrativeCard, WatchlistForm,
                        # TickerCard, AskAI, AuroraBackground, Skeleton
      pages/            # Dashboard, Login
      lib/              # api.ts, supabase.ts, auth.tsx, toast.tsx
    .env
  docs/
    Sentiro_Project_Spec.md
  README.md
```

## 7. MVP Scope — ✅ Shipped

1. ✅ Supabase project set up, schema applied, auth working
2. ✅ FastAPI: watchlist CRUD endpoints (add/remove ticker, list watchlist)
3. ✅ `services/market_data.py`: fetch price data via yfinance/CoinGecko
4. ✅ `services/news.py`: fetch news via Marketaux (+ NewsAPI fallback)
5. ✅ `services/llm.py`: build prompt, call LLM chain, parse sentiment + narrative
6. ✅ `services/scheduler.py`: APScheduler job runs steps 3–5 per distinct
   watchlist ticker, writes to `insight_cache` — verified firing reliably on
   the deployed Railway instance, not just locally
7. ✅ Read endpoints: `/insights/{ticker}`, `/prices/{ticker}`
8. ✅ Frontend: auth flow, watchlist management UI, dashboard with chart +
   sentiment gauge + narrative card per ticker
9. ✅ Deployed: frontend → Vercel, backend → Railway, scheduled job confirmed
   running on the deployed backend (not just local dev)

## 8. Shipped Post-MVP Features

- ✅ **Ticker validation** — rejects nonexistent symbols on add instead of
  silently storing them (they'd otherwise fail every refresh forever).
- ✅ **Ask AI** — natural-language chat panel answering questions grounded in
  the user's own cached watchlist data, via the LLM fallback chain.
- ✅ **LLM provider fallback chain** — Gemini → OpenRouter → Cohere, because
  Gemini's free tier caps at 20 requests/day/model, which even one ticker on
  a 45-min refresh cycle exceeds on its own.
- ✅ **UI polish** — skeleton loaders, sortable dashboard, toast notifications,
  quick-add suggestions on the empty state, aurora/glassmorphism visual design.

---

## 9. Next-Level Roadmap — 6-Week Internship Scope

Goal: ship enough of this that "Sentiro" reads as a real product on a resume,
not just a working demo — reliability + monetization + technical depth.
Rough sequencing below; adjust as priorities shift, but track A and the
testing item in track C are the highest-leverage starting points.

### Track A — Product features
- [ ] **Historical sentiment trend chart** — `insight_cache` already stores every
  generated insight over time; just needs a line chart of sentiment_score
  over time per ticker (data's free, this is pure frontend work).
- [ ] **Ticker comparison view** — select 2+ watchlist tickers, render
  side-by-side sentiment/price.
- [ ] **Sentiment-change alerts** — email via **Resend's free tier** (3,000
  emails/month, 100/day, no card required) or an in-app notification feed
  when a ticker's sentiment crosses a threshold or flips sign between refresh
  cycles. Do **not** use Supabase's built-in SMTP for this — it's meant for
  auth emails only, heavily rate-limited (a handful per hour), and not
  intended for arbitrary transactional email at any real volume.
- [ ] **Ticker search/autocomplete** — typeahead while adding a ticker,
  backed by CoinGecko's `/search` (already used internally) and Yahoo
  Finance's search endpoint for stocks. Prevents typos before they even hit
  the existing validation.
- [ ] **Portfolio-level "market mood"** — aggregate sentiment score across a
  user's whole watchlist, shown at the top of the dashboard.
- [ ] **Public shareable ticker pages** (`sentiro.app/AAPL`, no login) — SEO
  and organic growth surface.
- [ ] Light/dark theme toggle (currently dark-only by design).

### Track B — Monetization / SaaS infrastructure
> Note: this track is about *building the billing mechanism*, not spending
> money before there's revenue. Stripe itself has no monthly fee — it only
> takes a cut of actual transactions — so building this out costs nothing
> until a real customer pays. Safe to build fully within the free-tier goal.

- [ ] **Stripe billing** — free tier (e.g. 5 tickers, 45-min refresh) vs. paid
  tier (unlimited tickers, faster refresh, alerts, Ask AI without the 15s
  cooldown).
- [ ] **Usage enforcement** — tier-aware limits checked at the API layer, not
  just UI-suggested.
- [ ] **Account/billing settings page**.
- [ ] **Insights API as a paid product** — expose `/insights/{ticker}` (and
  friends) behind API keys for external developers, separate from the
  user-facing app. This is the same shared-cache data already being computed,
  so marginal cost is ~zero.

### Track C — Reliability, scale, and things worth bragging about
- [ ] **Automated test suite** — pytest for the backend (services, routers,
  the scheduler's atomic-transaction rollback behavior), Vitest + React
  Testing Library for the frontend. Pick a real coverage target and hit it.
- [ ] **CI/CD** — GitHub Actions: lint + typecheck + test on every PR,
  auto-deploy to Railway/Vercel on merge to `main`. GitHub Actions minutes are
  **unlimited and free for public repos** (Sentiro's repo is public), so no
  cost concern here at all.
- [ ] **Cost & usage tracking** — log every LLM call (provider, tokens,
  latency, success/fail) to a table; build a small internal dashboard.
  Directly enables...
- [ ] **Budget-aware throttling** — if a provider's near its free-tier daily
  cap, skip straight to the next one in the chain instead of wasting a
  request finding out.
- [ ] **Observability** — structured logging is already in place; add error
  tracking via **Sentry's free Developer tier** (5,000 errors/month, no card
  required) and uptime monitoring via **UptimeRobot's free tier** (50
  monitors, 5-min checks, no card required).
- [ ] **Distributed-safe rate limiting** — the current `/ask` cooldown is an
  in-process dict, fine for one Railway instance, broken if this ever scales
  to multiple. Move to a DB-backed or Redis-backed limiter before that
  matters — **Upstash Redis's free tier** (10,000 commands/day, no card
  required) fits this well.
- [ ] **Resilience polish** — retry/backoff on transient provider errors
  (the 503s and 429s seen in testing) before falling through to the next
  provider, not just fail-and-fallback on the first error.

### Track D — AI quality (the deepest technical work)
- [ ] **RAG-backed Ask AI** — right now Ask AI gets a flat dump of the
  latest cached data per ticker. With `pgvector` on Supabase, embed news
  articles + historical narratives and retrieve the most relevant ones per
  question instead of just "latest" — meaningfully better answers for
  questions like "how has sentiment trended this week."
  requires: an embeddings model — Gemini's embedding endpoints
  (`gemini-embedding-001`) are reachable with the same `GEMINI_API_KEY` and
  have their own separate free-tier quota from the chat models, but verify
  the actual daily limit when this gets built rather than assuming — and a
  similarity-search query using `pgvector`, which is a Postgres extension
  Supabase enables at no extra cost. Both should be cheap additions on
  existing infra, but confirm the embeddings quota before relying on it.
- [ ] **Multi-provider ensemble scoring** — instead of pure failover
  (first success wins), optionally query 2+ providers for the same ticker
  and reconcile (average scores, flag high disagreement as low-confidence).
  Bigger free-tier cost, so probably gate this behind the paid tier from
  Track B rather than run it on every refresh.
- [ ] **Eval harness** — a small labeled set of ticker/news/expected-sentiment-
  direction examples to sanity-check prompt changes don't regress quality
  before they ship.

---

## Prompt for Claude Code — Phase 2 kickoff

Paste this into Claude Code in the `Sentiro/` project root to start the
internship phase:

```
I'm continuing work on Sentiro (AI market/crypto sentiment dashboard) for a
6-week internship. Full spec + roadmap is in docs/Sentiro_Project_Spec.md —
read it first, especially section 9 (Next-Level Roadmap) and the "shipped"
sections so you know what already exists.

The app is live and working: frontend on Vercel, backend on Railway, repo is
public at github.com/Haris3969/sentiro. Don't re-scaffold anything.

Let's start with [pick a track/item from section 9 — e.g. "Track C:
automated test suite" or "Track A: historical sentiment trend chart"].
Before writing code, tell me your implementation plan and confirm it with me.
Keep following the existing patterns (services/ for business logic, routers/
for thin endpoints, the LLM fallback-chain structure in llm.py, the atomic
per-ticker transaction in scheduler.py) rather than introducing new patterns
without a reason.
```
