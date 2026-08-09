import json
import logging
from dataclasses import dataclass
from typing import Callable, TypeVar

import httpx
from google import genai
from google.genai import types

from app.config import get_settings
from app.services.market_data import PriceData
from app.services.news import NewsItem

logger = logging.getLogger("sentiro.llm")

T = TypeVar("T")

GEMINI_MODEL = "gemini-flash-latest"
OPENROUTER_MODEL = "openai/gpt-oss-20b:free"
COHERE_MODEL = "command-r-08-2024"

_INSIGHT_SCHEMA = types.Schema(
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
    prompt = _build_insight_prompt(ticker, price, news)
    return _run_provider_chain(prompt, json_mode=True, error_context=ticker, validate=_parse_insight)


def answer_question(question: str, watchlist_context: str) -> str:
    prompt = _build_ask_prompt(question, watchlist_context)
    return _run_provider_chain(prompt, json_mode=False, error_context="ask", validate=str.strip)


def _run_provider_chain(prompt: str, json_mode: bool, error_context: str, validate: Callable[[str], T]) -> T:
    settings = get_settings()
    providers: list[tuple[str, str, Callable[[str, str, bool], str]]] = [
        ("gemini", settings.gemini_api_key, _call_gemini),
        ("openrouter", settings.openrouter_api_key, _call_openrouter),
        ("cohere", settings.cohere_api_key, _call_cohere),
    ]

    errors = []
    for name, api_key, fn in providers:
        if not api_key:
            errors.append(f"{name}: no API key configured")
            continue
        try:
            raw_text = fn(prompt, api_key, json_mode)
            return validate(raw_text)
        except _ProviderError as exc:
            logger.warning("Provider %s failed for %s: %s", name, error_context, exc)
            errors.append(f"{name}: {exc}")

    raise LLMError(f"All LLM providers failed for {error_context} — {'; '.join(errors)}")


def _call_gemini(prompt: str, api_key: str, json_mode: bool) -> str:
    client = genai.Client(api_key=api_key)
    config = types.GenerateContentConfig(max_output_tokens=2048)
    if json_mode:
        config.response_mime_type = "application/json"
        config.response_schema = _INSIGHT_SCHEMA

    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt, config=config)
    except Exception as exc:
        raise _ProviderError(f"API call failed: {exc}") from exc

    if not response.text:
        raise _ProviderError("empty response")
    return response.text


def _call_openrouter(prompt: str, api_key: str, json_mode: bool) -> str:
    body = {"model": OPENROUTER_MODEL, "messages": [{"role": "user", "content": prompt}]}
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    try:
        resp = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        raise _ProviderError(f"API call failed: {exc}") from exc


def _call_cohere(prompt: str, api_key: str, json_mode: bool) -> str:
    body = {"model": COHERE_MODEL, "messages": [{"role": "user", "content": prompt}]}
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    try:
        resp = httpx.post(
            "https://api.cohere.com/v2/chat",
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return "".join(block["text"] for block in data["message"]["content"] if block["type"] == "text")
    except Exception as exc:
        raise _ProviderError(f"API call failed: {exc}") from exc


def _parse_insight(raw_text: str) -> InsightResult:
    try:
        data = json.loads(raw_text)
        score = max(-1.0, min(1.0, float(data["sentiment_score"])))
        narrative = str(data["narrative"]).strip()
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise _ProviderError(f"could not parse response: {exc}") from exc

    return InsightResult(sentiment_score=score, narrative=narrative)


def _build_insight_prompt(ticker: str, price: PriceData, news: list[NewsItem]) -> str:
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


def _build_ask_prompt(question: str, watchlist_context: str) -> str:
    return (
        "You are the AI assistant inside Sentiro, a market & crypto sentiment dashboard. "
        "The user is asking about their own watchlist. Here is the current cached data for each "
        "ticker they track (price, cached AI sentiment score from -1.0 to 1.0, and the last-generated narrative):\n\n"
        f"{watchlist_context}\n\n"
        f"User question: {question}\n\n"
        "Answer conversationally in 2-4 sentences, using only the data above. If the data doesn't "
        "contain what's needed to answer, say so honestly instead of guessing. Do not mention that "
        "you were given a data dump — just answer naturally."
    )
