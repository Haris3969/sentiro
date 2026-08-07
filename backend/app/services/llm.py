import json
from dataclasses import dataclass

from google import genai
from google.genai import types

from app.config import get_settings
from app.services.market_data import PriceData
from app.services.news import NewsItem

MODEL = "gemini-flash-latest"

_RESPONSE_SCHEMA = types.Schema(
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
    pass


def generate_insight(ticker: str, price: PriceData, news: list[NewsItem]) -> InsightResult:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise LLMError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = _build_prompt(ticker, price, news)

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_RESPONSE_SCHEMA,
                max_output_tokens=2048,
            ),
        )
    except Exception as exc:
        raise LLMError(f"Gemini API call failed for {ticker}: {exc}") from exc

    if not response.text:
        raise LLMError(f"Gemini response for {ticker} had no content")

    try:
        data = json.loads(response.text)
        score = max(-1.0, min(1.0, float(data["sentiment_score"])))
        narrative = str(data["narrative"]).strip()
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        raise LLMError(f"Could not parse Gemini response for {ticker}: {exc}") from exc

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
        "Based on the price movement and news above, respond with JSON containing:",
        "- sentiment_score: -1.0 (very bearish) to 1.0 (very bullish)",
        "- narrative: a short, plain-English explanation of why this asset is moving and the current market mood. "
        "Reference specific news if relevant; otherwise base it on the price action alone.",
    ]
    return "\n".join(lines)
