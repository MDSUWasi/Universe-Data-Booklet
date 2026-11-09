"""Open Notify free public API client.

Wraps:

* ISS now         -- current ISS lat/lon (http://api.open-notify.org/iss-now.json)
* Astronauts      -- who is in space right now
                    (http://api.open-notify.org/astros.json)

No API key required.  Cached through the shared SQLite store.

Independent of: elevation, weather, tiles, nasa, encyclopedia.
"""

from __future__ import annotations

import json
from typing import Any

from .cache import UpstreamUnavailable, STORE, cache_key, fetch, WEATHER_TTL, WEATHER_STALE_TTL

ISS_URL = "http://api.open-notify.org/iss-now.json"
ASTROS_URL = "http://api.open-notify.org/astros.json"


def _validate_position(payload: dict[str, Any]) -> None:
    if not isinstance(payload, dict) or payload.get("message") != "success":
        raise UpstreamUnavailable("Open Notify returned an invalid response")
    pos = payload.get("iss_position")
    if not isinstance(pos, dict):
        raise UpstreamUnavailable("Open Notify missing iss_position")


def get_iss_position() -> dict[str, Any]:
    """Return the current ISS latitude/longitude with cache state."""
    url = ISS_URL

    def do_fetch() -> tuple[bytes, str]:
        body, content_type = fetch(url, "application/json")
        payload = json.loads(body)
        _validate_position(payload)
        return body, content_type

    key = cache_key("iss", url)
    result = STORE.get_or_fetch(key, do_fetch, WEATHER_TTL, WEATHER_STALE_TTL)
    payload = json.loads(result.entry.body)
    pos = payload["iss_position"]
    return {
        "latitude": float(pos["latitude"]),
        "longitude": float(pos["longitude"]),
        "timestamp": payload.get("timestamp"),
        "cache_state": result.state,
    }


def _validate_astros(payload: dict[str, Any]) -> None:
    if not isinstance(payload, dict) or payload.get("message") != "success":
        raise UpstreamUnavailable("Open Notify astros returned an invalid response")
    if not isinstance(payload.get("people"), list):
        raise UpstreamUnavailable("Open Notify missing people list")


def get_astronauts() -> dict[str, Any]:
    """Return who is currently in space with cache state."""
    url = ASTROS_URL

    def do_fetch() -> tuple[bytes, str]:
        body, content_type = fetch(url, "application/json")
        payload = json.loads(body)
        _validate_astros(payload)
        return body, content_type

    key = cache_key("astros", url)
    result = STORE.get_or_fetch(key, do_fetch, WEATHER_TTL, WEATHER_STALE_TTL)
    payload = json.loads(result.entry.body)
    people = [
        {"name": p.get("name"), "craft": p.get("craft")}
        for p in payload.get("people", [])
    ]
    return {
        "count": payload.get("number", len(people)),
        "people": people,
        "cache_state": result.state,
    }
