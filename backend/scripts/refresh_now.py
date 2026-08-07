"""Manually run one refresh cycle (price + news + LLM insight) for every
watchlist ticker, without waiting for the scheduled interval. Useful for
local testing and demoing right after deploy.

Usage: python scripts/refresh_now.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.scheduler import run_refresh_job  # noqa: E402

if __name__ == "__main__":
    run_refresh_job()
