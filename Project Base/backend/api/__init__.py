"""Planetary Explorer -- backend API package.

Reorganised from the monolithic ``backend/server.py`` so that each concern lives
in its own independent module:

* ``cache.py``        -- the SQLite cache store + shared helpers + TTL policy
* ``weather.py``      -- Open-Meteo current weather service
* ``tiles.py``        -- NASA Trek WMTS tile proxy (Moon / Mars)
* ``routes.py``      -- committed-CSV data endpoints (/api/sites, /api/patches,
                         /api/scale-sensitivity)

``server.py`` imports from here and re-exports the public names its tests and
callers already depend on (``ROOT``, ``STORE``, ``AppHandler``, ``CacheStore``,
``UpstreamUnavailable``).
"""

from __future__ import annotations

from pathlib import Path

from .cache import (
    CacheEntry,
    CacheResult,
    CacheStore,
    DAY,
    IMMUTABLE_TTL,
    MAX_CACHE_BYTES,
    MAX_ENTRY_BYTES,
    STORE,
    STATIC_STALE_TTL,
    STATIC_TTL,
    UPSTREAM_TIMEOUT,
    USER_AGENT,
    WEATHER_STALE_TTL,
    WEATHER_TTL,
    UpstreamUnavailable,
    cache_key,
    fetch,
)
from . import weather, tiles, routes

# Repo root.  ``backend/api/__init__.py`` -> parents[2] is the repo root.
ROOT = Path(__file__).resolve().parents[2]

__all__ = [
    "ROOT",
    "CacheEntry",
    "CacheResult",
    "CacheStore",
    "STORE",
    "UpstreamUnavailable",
    "cache_key",
    "fetch",
    "weather",
    "tiles",
    "routes",
    "STATIC_TTL",
    "STATIC_STALE_TTL",
    "IMMUTABLE_TTL",
    "WEATHER_TTL",
    "WEATHER_STALE_TTL",
    "MAX_CACHE_BYTES",
    "MAX_ENTRY_BYTES",
    "UPSTREAM_TIMEOUT",
    "USER_AGENT",
    "DAY",
]