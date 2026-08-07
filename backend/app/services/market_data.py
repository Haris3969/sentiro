from dataclasses import dataclass

import httpx
import yfinance as yf

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# Resolved ticker -> CoinGecko coin id, populated lazily via the search endpoint.
_coingecko_id_cache: dict[str, str] = {}


@dataclass
class PriceData:
    ticker: str
    price: float
    change_pct: float | None
    volume: float | None


class MarketDataError(Exception):
    pass


def fetch_price(ticker: str, asset_type: str) -> PriceData:
    if asset_type == "stock":
        return fetch_stock_price(ticker)
    if asset_type == "crypto":
        return fetch_crypto_price(ticker)
    raise MarketDataError(f"Unknown asset_type: {asset_type}")


def fetch_stock_price(ticker: str) -> PriceData:
    try:
        info = yf.Ticker(ticker).fast_info
        price = info.get("lastPrice")
        prev_close = info.get("previousClose")
        volume = info.get("lastVolume")
    except Exception as exc:
        raise MarketDataError(f"yfinance lookup failed for {ticker}: {exc}") from exc

    if price is None:
        raise MarketDataError(f"No price data returned for stock {ticker}")

    change_pct = None
    if prev_close:
        change_pct = (price - prev_close) / prev_close * 100

    return PriceData(ticker=ticker, price=float(price), change_pct=change_pct, volume=float(volume) if volume else None)


def _resolve_coingecko_id(ticker: str) -> str:
    cached = _coingecko_id_cache.get(ticker.upper())
    if cached:
        return cached

    resp = httpx.get(f"{COINGECKO_BASE}/search", params={"query": ticker}, timeout=10)
    resp.raise_for_status()
    coins = resp.json().get("coins", [])
    if not coins:
        raise MarketDataError(f"No CoinGecko match for crypto ticker {ticker}")

    coin_id = coins[0]["id"]
    _coingecko_id_cache[ticker.upper()] = coin_id
    return coin_id


def fetch_crypto_price(ticker: str) -> PriceData:
    coin_id = _resolve_coingecko_id(ticker)

    resp = httpx.get(
        f"{COINGECKO_BASE}/coins/markets",
        params={"vs_currency": "usd", "ids": coin_id},
        timeout=10,
    )
    resp.raise_for_status()
    rows = resp.json()
    if not rows:
        raise MarketDataError(f"No CoinGecko market data for {ticker} ({coin_id})")

    row = rows[0]
    return PriceData(
        ticker=ticker,
        price=float(row["current_price"]),
        change_pct=row.get("price_change_percentage_24h"),
        volume=row.get("total_volume"),
    )
