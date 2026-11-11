"""NASA free public API client.

Wraps several NASA open services that need no paid account:

* APOD        -- Astronomy Picture of the Day (https://api.nasa.gov/planetary/apod)
* EONET       -- Earth Observatory Natural Event Tracker
               (https://eonet.gsfc.nasa.gov/api/v3/events)
* Mars Weather -- InSight lander weather
               (https://api.nasa.gov/insight_weather/)
* DONKI       -- Space Weather Database Of Notifications, Knowledge, Information
               (https://api.nasa.gov/DONKI/)

All requests fall back to the shared SQLite cache via ``cache.py`` so repeated
page loads do not hammer NASA's servers.  The ``DEMO_KEY`` API key is NASA's
published demo key for low-volume, non-commercial use.

Independent of: elevation, weather, tiles, encyclopedia.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from typing import Any

from .cache import (
    UpstreamUnavailable,
    STORE,
    cache_key,
    fetch,
    STATIC_TTL,
    STATIC_STALE_TTL,
    WEATHER_TTL,
    WEATHER_STALE_TTL,
)

NASA_BASE = "https://api.nasa.gov"
DEMO_KEY = "DEMO_KEY"

APOD_URL = NASA_BASE + "/planetary/apod"
EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"
MARS_WEATHER_URL = NASA_BASE + "/insight_weather/"
DONKI_BASE = NASA_BASE + "/DONKI"


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _nasa_params(extra: dict[str, str]) -> str:
    """Build a query string including the demo API key."""
    from urllib.parse import urlencode
    params = dict(extra)
    params["api_key"] = DEMO_KEY
    return urlencode(params)


def _cached_fetch(service: str, params_query: str, ttl: int, stale_ttl: int,
                  validate) -> tuple[bytes, str, str]:
    """Fetch a NASA JSON endpoint through the shared cache."""
    url = params_query if params_query.startswith("http") else params_query

    def do_fetch() -> tuple[bytes, str]:
        body, content_type = fetch(url, "application/json")
        payload = json.loads(body)
        validate(payload)
        return body, content_type

    key = cache_key(service, params_query)
    result = STORE.get_or_fetch(key, do_fetch, ttl, stale_ttl)
    return result.entry.body, result.entry.content_type, result.state


# --------------------------------------------------------------------------- #
# APOD
# --------------------------------------------------------------------------- #

def _validate_apod(payload: dict[str, Any]) -> None:
    if not isinstance(payload, dict) or "title" not in payload:
        raise UpstreamUnavailable("APOD returned an invalid response")


def get_apod() -> dict[str, Any]:
    """Return the latest APOD entry with cache state."""
    url = APOD_URL + "?" + _nasa_params({})
    body, content_type, state = _cached_fetch(
        "apod", url, STATIC_TTL, STATIC_STALE_TTL, _validate_apod
    )
    payload = json.loads(body)
    return {
        "title": payload.get("title"),
        "explanation": payload.get("explanation"),
        "url": payload.get("url"),
        "hdurl": payload.get("hdurl"),
        "media_type": payload.get("media_type"),
        "date": payload.get("date"),
        "copyright": payload.get("copyright"),
        "cache_state": state,
    }


# --------------------------------------------------------------------------- #
# EONET - Earth natural events
# --------------------------------------------------------------------------- #

def _validate_eonet(payload: dict[str, Any]) -> None:
    if not isinstance(payload, dict) or "events" not in payload:
        raise UpstreamUnavailable("EONET returned an invalid response")


def get_earth_events(limit: int = 20) -> dict[str, Any]:
    """Return recent Earth natural events (wildfires, storms, volcanoes, etc.)."""
    from urllib.parse import urlencode
    params = urlencode({"limit": str(limit)})
    url = EONET_URL + "?" + params
    body, content_type, state = _cached_fetch(
        "eonet", url, WEATHER_TTL, WEATHER_STALE_TTL, _validate_eonet
    )
    payload = json.loads(body)
    events = []
    for ev in payload.get("events", [])[:limit]:
        geometries = ev.get("geometries", [])
        latest = geometries[-1] if geometries else {}
        events.append({
            "id": ev.get("id"),
            "title": ev.get("title"),
            "description": ev.get("description"),
            "date": latest.get("date"),
            "lat": (latest.get("coordinates") or [None, None])[1],
            "lng": (latest.get("coordinates") or [None, None])[0],
            "categories": [c.get("title") for c in ev.get("categories", [])],
        })
    return {"events": events, "count": len(events), "cache_state": state}


# --------------------------------------------------------------------------- #
# Mars Weather (InSight)
# --------------------------------------------------------------------------- #

def _validate_mars_weather(payload: dict[str, Any]) -> None:
    if not isinstance(payload, dict):
        raise UpstreamUnavailable("Mars weather returned an invalid response")


def get_mars_weather() -> dict[str, Any]:
    """Return the latest InSight weather report (sol keys)."""
    url = MARS_WEATHER_URL + "?" + _nasa_params({
        "feedtype": "json",
        "ver": "1.0",
    })
    body, content_type, state = _cached_fetch(
        "mars_weather", url, WEATHER_TTL, WEATHER_STALE_TTL, _validate_mars_weather
    )
    payload = json.loads(body)
    # Find the most recent sol key.
    sol_keys = payload.get("sol_keys", [])
    latest_sol = sol_keys[-1] if sol_keys else None
    report = {}
    if latest_sol:
        sol = payload.get(latest_sol, {})
        report = {
            "sol": latest_sol,
            "temperature": sol.get("AT", {}).get("av"),
            "wind_speed": sol.get("HWS", {}).get("av"),
            "pressure": sol.get("PRE", {}).get("av"),
            "season": sol.get("Season"),
        }
    return {"report": report, "cache_state": state}


# --------------------------------------------------------------------------- #
# DONKI - Space weather
# --------------------------------------------------------------------------- #

def _validate_donki(payload: Any) -> None:
    if not isinstance(payload, list):
        raise UpstreamUnavailable("DONKI returned an invalid response")


def get_space_weather(days: int = 7) -> dict[str, Any]:
    """Return recent space weather notifications (CME, flares, G-Storms)."""
    from urllib.parse import urlencode
    end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")
    params = urlencode({
        "startDate": start_date,
        "endDate": end_date,
        "type": "all",
    })
    url = DONKI_BASE + "/" + params
    body, content_type, state = _cached_fetch(
        "donki", url, WEATHER_TTL, WEATHER_STALE_TTL, _validate_donki
    )
    payload = json.loads(body)
    events = []
    for ev in payload[:50]:
        events.append({
            "type": ev.get("activityType"),
            "start_time": ev.get("startTime"),
            "linked_flares": ev.get("linkedEvents", {}).get("FLR", []),
            "cme": ev.get("linkedEvents", {}).get("CME", []),
        })
    return {"events": events, "count": len(events), "cache_state": state}
