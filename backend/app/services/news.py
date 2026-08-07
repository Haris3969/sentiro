from dataclasses import dataclass
from datetime import datetime

import httpx

from app.config import get_settings

MARKETAUX_URL = "https://api.marketaux.com/v1/news/all"
NEWSAPI_URL = "https://newsapi.org/v2/everything"


@dataclass
class NewsItem:
    title: str
    source: str | None
    url: str | None
    published_at: datetime | None


def fetch_news(ticker: str, limit: int = 5) -> list[NewsItem]:
    settings = get_settings()

    if settings.marketaux_api_key:
        try:
            items = _fetch_marketaux(ticker, limit, settings.marketaux_api_key)
            if items:
                return items
        except Exception:
            pass

    if settings.newsapi_key:
        try:
            return _fetch_newsapi(ticker, limit, settings.newsapi_key)
        except Exception:
            pass

    return []


def _fetch_marketaux(ticker: str, limit: int, api_key: str) -> list[NewsItem]:
    resp = httpx.get(
        MARKETAUX_URL,
        params={
            "symbols": ticker,
            "filter_entities": "true",
            "language": "en",
            "limit": limit,
            "api_token": api_key,
        },
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json().get("data", [])

    items = []
    for row in data:
        items.append(
            NewsItem(
                title=row["title"],
                source=row.get("source"),
                url=row.get("url"),
                published_at=_parse_dt(row.get("published_at")),
            )
        )
    return items


def _fetch_newsapi(ticker: str, limit: int, api_key: str) -> list[NewsItem]:
    resp = httpx.get(
        NEWSAPI_URL,
        params={
            "q": ticker,
            "sortBy": "publishedAt",
            "language": "en",
            "pageSize": limit,
            "apiKey": api_key,
        },
        timeout=10,
    )
    resp.raise_for_status()
    articles = resp.json().get("articles", [])

    items = []
    for row in articles:
        source = row.get("source") or {}
        items.append(
            NewsItem(
                title=row["title"],
                source=source.get("name"),
                url=row.get("url"),
                published_at=_parse_dt(row.get("publishedAt")),
            )
        )
    return items


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
