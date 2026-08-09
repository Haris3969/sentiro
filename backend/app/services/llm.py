import json
import logging
from dataclasses import dataclass

import httpx
from google import genai
from google.genai import types

from app.config import get_settings
from app.services.market_data import PriceData
from app.services.news import NewsItem

logger = logging.getLogger("sentiro.llm")

GEMINI_MODEL = "gemini-flash-latest"
OPENROUTER_MODEL = "openai/gpt-oss-20b:free"
COHERE_MODEL = "command-r-08-2024"

_GEMINI_RESPONSE_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "sentiment_score": types.Schema(
            type=types.Type.NUMBER,
            description="Sentiment score from -1.0 (extremely bearish) to 1.0 (extremely bullish).",
        ),
        "narrative": types.Schema(
            type=types.Type.STRING,
            description="A short (2-4 sentence) plain-English explanation of why the asset is moving and the current mood.",
        ),
    },
    required=["sentiment_score", "narrative"],
)


@dataclass
class InsightResult:
    sentiment_score: float
    narrative: str


class LLMError(Exception):
    """Raised when every provider in the fallback chain has failed."""


class _ProviderError(Exception):
    """Internal: one provider failed, try the next one in the chain."""


def generate_insight(ticker: str, price: PriceData, news: list[NewsItem]) -> InsightResult:
    settings = get_settings()
    prompt = _build_prompt(ticker, price, news)

    providers = [
        ("gemini", settings.gemini_api_key, _gemini_insight),
        ("openrouter", settings.openrouter_api_key, _openrouter_insight),
        ("cohere", settings.cohere_api_key, _cohere_insight),
    ]

    errors = []
    for name, api_key, fn in providers:
        if not api_key:
            errors.append(f"{name}: no API key configured")
            continue
        try:
            return fn(prompt, api_key)
        except _ProviderError as exc:
            logger.warning("Provider %s failed for %s: %s", name, ticker, exc)
            errors.append(f"{name}: {exc}")

    raise LLMError(f"All LLM providers failed for {ticker} — {'; '.join(errors)}")


def _gemini_insight(prompt: str, api_key: str) -> InsightResult:
    client = genai.Client(api_key=api_key)
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_GEMINI_RESPONSE_SCHEMA,
                max_output_tokens=2048,
            ),
        )
    except Exception as exc:
        raise _ProviderError(f"API call failed: {exc}") from exc

    if not response.text:
        raise _ProviderError("empty response")

    return _parse_insight(response.text)


def _openrouter_insight(prompt: str, api_key: str) -> InsightResult:
    try:
        resp = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": OPENROUTER_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
    except Exception as exc:
        raise _ProviderError(f"API call failed: {exc}") from exc

    return _parse_insight(content)


def _cohere_insight(prompt: str, api_key: str) -> InsightResult:
    try:
        resp = httpx.post(
            "https://api.cohere.com/v2/chat",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": COHERE_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
            },
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        content = "".join(block["text"] for block in data["message"]["content"] if block["type"] == "text")
    except Exception as exc:
        raise _ProviderError(f"API call failed: {exc}") from exc

    return _parse_insight(content)


def _parse_insight(raw_text: str) -> InsightResult:
    try:
        data = json.loads(raw_text)
        score = max(-1.0, min(1.0, float(data["sentiment_score"])))
        narrative = str(data["narrative"]).strip()
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise _ProviderError(f"could not parse response: {exc}") from exc

    return InsightResult(sentiment_score=score, narrative=narrative)


def _build_prompt(ticker: str, price: PriceData, news: list[NewsItem]) -> str:
    change_str = f"{price.change_pct:+.2f}%" if price.change_pct is not None else "unknown"
    lines = [
        f"Ticker: {ticker}",
        f"Current price: {price.price}",
        f"Change: {change_str}",
        "",
        "Recent news headlines:",
    ]

    if news:
        for item in news[:8]:
            source = f" ({item.source})" if item.source else ""
            lines.append(f"- {item.title}{source}")
    else:
        lines.append("- No recent news articles found.")

    lines += [
        "",
        "Based on the price movement and news above, respond with a JSON object containing:",
        "- sentiment_score: -1.0 (very bearish) to 1.0 (very bullish)",
        "- narrative: a short, plain-English explanation of why this asset is moving and the current market mood. "
        "Reference specific news if relevant; otherwise base it on the price action alone.",
    ]
    return "\n".join(lines)
