"""Persistent, byte-bounded SQLite cache for upstream API responses.

This module is independent of the HTTP layer: it only knows how to store,
lookup, refresh and evict cached response bodies.  All TTL policy lives in
the constants below so that every caller shares one definition of "fresh".
"""

from __future__ import annotations

import hashlib
import os
import sqlite3
import time
from contextlib import closing
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
from urllib.error import URLError
from urllib.request import Request, urlopen

# --------------------------------------------------------------------------- #
# Project root + cache location
# --------------------------------------------------------------------------- #
# This file lives at backend/api/cache.py, so parents[2] is the repo root.
ROOT = Path(__file__).resolve().parents[2]

# Absolute path to the SQLite cache.  ``backend`` is a namespace package, so
# every module that needs the root imports it from here rather than trying to
# walk up from an unknown package location.
CACHE_PATH = Path(os.environ.get("PLANETARY_CACHE_DB", ROOT / ".cache" / "planetary-analog" / "cache.sqlite3"))

# --------------------------------------------------------------------------- #
# TTL policy (seconds).  One definition, shared by every endpoint.
# --------------------------------------------------------------------------- #
DAY = 24 * 60 * 60
STATIC_TTL = 30 * DAY            # Open-Meteo elevation: fresh for 30 days
STATIC_STALE_TTL = 365 * DAY     # ...but serve stale for up to a year on error
IMMUTABLE_TTL = None             # Versioned NASA tiles: never refresh by age
WEATHER_TTL = 15 * 60            # Open-Meteo current weather: fresh for 15 minutes
WEATHER_STALE_TTL = 30 * DAY     # ...serve stale for up to 30 days on error

# --------------------------------------------------------------------------- #
# Size policy
# --------------------------------------------------------------------------- #
MAX_CACHE_BYTES = 128 * 1024 * 1024   # 128 MiB of response bodies
MAX_ENTRY_BYTES = 5 * 1024 * 1024     # 5 MiB per single response
UPSTREAM_TIMEOUT = 15                 # seconds
USER_AGENT = "PlanetaryAnalogExplorer/1.0 (public research project)"


@dataclass(frozen=True)
class CacheEntry:
    body: bytes
    content_type: str
    cached_at: float


@dataclass(frozen=True)
class CacheResult:
    entry: CacheEntry
    state: str  # "HIT" | "MISS" | "STALE"


class UpstreamUnavailable(Exception):
    """Raised when an upstream service cannot be reached and no usable cache exists."""


class CacheStore:
    """A byte-bounded persistent cache; entries are refreshed on demand.

    Eviction is FIFO by insertion time (oldest entries removed first) when the
    store exceeds ``max_bytes``.  Thread-safe enough for the ThreadingHTTPServer
    because every operation opens its own short-lived connection.
    """

    def __init__(self, path: Path, max_bytes: int = MAX_CACHE_BYTES) -> None:
        self.path = path
        self.max_bytes = max_bytes
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path, timeout=10)) as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute(
                """CREATE TABLE IF NOT EXISTS responses (
                    cache_key TEXT PRIMARY KEY,
                    cached_at REAL NOT NULL,
                    content_type TEXT NOT NULL,
                    body BLOB NOT NULL
                )"""
            )
            connection.execute("CREATE INDEX IF NOT EXISTS responses_age ON responses(cached_at)")
            connection.commit()

    def get(self, key: str) -> CacheEntry | None:
        with closing(sqlite3.connect(self.path, timeout=10)) as connection:
            row = connection.execute(
                "SELECT body, content_type, cached_at FROM responses WHERE cache_key = ?", (key,)
            ).fetchone()
        if row is None:
            return None
        return CacheEntry(bytes(row[0]), str(row[1]), float(row[2]))

    def put(self, key: str, body: bytes, content_type: str, cached_at: float | None = None) -> None:
        timestamp = time.time() if cached_at is None else cached_at
        with closing(sqlite3.connect(self.path, timeout=10)) as connection:
            connection.execute(
                "INSERT OR REPLACE INTO responses(cache_key, cached_at, content_type, body) VALUES(?, ?, ?, ?)",
                (key, timestamp, content_type, sqlite3.Binary(body)),
            )
            connection.commit()
            total = connection.execute("SELECT COALESCE(SUM(length(body)), 0) FROM responses").fetchone()[0]
            while total > self.max_bytes:
                oldest = connection.execute(
                    "SELECT cache_key, length(body) FROM responses ORDER BY cached_at ASC LIMIT 1"
                ).fetchone()
                if oldest is None:
                    break
                connection.execute("DELETE FROM responses WHERE cache_key = ?", (oldest[0],))
                total -= oldest[1]
            connection.commit()

    def get_or_fetch(
        self,
        key: str,
        fetch: Callable[[], tuple[bytes, str]],
        ttl: int | None,
        stale_ttl: int | None,
    ) -> CacheResult:
        cached = self.get(key)
        now = time.time()
        age = now - cached.cached_at if cached else None
        if cached and (ttl is None or (age is not None and age <= ttl)):
            return CacheResult(cached, "HIT")

        try:
            body, content_type = fetch()
        except Exception as error:
            if cached and (stale_ttl is None or (age is not None and age <= stale_ttl)):
                return CacheResult(cached, "STALE")
            raise UpstreamUnavailable("Upstream data is unavailable and no usable cached response exists") from error

        self.put(key, body, content_type, now)
        return CacheResult(CacheEntry(body, content_type, now), "MISS")


# --------------------------------------------------------------------------- #
# Shared helpers
# --------------------------------------------------------------------------- #
def cache_key(service: str, value: str) -> str:
    """Stable, non-reversible key derived from the request parameters."""
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return f"{service}:{digest}"


def fetch(url: str, accept: str) -> tuple[bytes, str]:
    """Perform a bounded upstream GET, raising UpstreamUnavailable on any failure."""
    request = Request(url, headers={"Accept": accept, "User-Agent": USER_AGENT})
    try:
        with urlopen(request, timeout=UPSTREAM_TIMEOUT) as response:
            body = response.read(MAX_ENTRY_BYTES + 1)
            content_type = response.headers.get_content_type()
    except (OSError, URLError, TimeoutError) as error:
        raise UpstreamUnavailable("Upstream request failed") from error
    if len(body) > MAX_ENTRY_BYTES:
        raise UpstreamUnavailable("Upstream response exceeded the size limit")
    if not body:
        raise UpstreamUnavailable("Upstream returned an empty response")
    return body, content_type


# Module-level singleton store used by every endpoint route.
STORE = CacheStore(CACHE_PATH)