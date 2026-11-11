"""USGS earthquake feed — free public API for recent Earth seismic events.

Endpoint: https://earthquake.usgs.gov/fdsnws/event/1/query
No API key required.  Cached through the shared SQLite store.

Independent of: elevation, weather, tiles, nasa, opennotify, encyclopedia.
"""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlencode

from .cache import UpstreamUnavailable, STORE, cache_key, fetch, WEATHER_TTL, WEATHER_STALE_TTL

USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"


def _validate(payload: dict[str, Any]) -> None:
    if not isinstance(payload, dict) or "features" not in payload:
        raise UpstreamUnavailable("USGS earthquake feed returned an invalid response")


def get_recent_earthquakes(limit: int = 30, min_magnitude: float = 2.5) -> dict[str, Any]:
    """Return recent significant earthquakes worldwide."""
    params = urlencode({
        "format": "geojson",
        "limit": str(limit),
        "minmagnitude": str(min_magnitude),
        "orderby": "time",
    })
    url = USGS_URL + "?" + params

    def do_fetch() -> tuple[bytes, str]:
        body, content_type = fetch(url, "application/json")
        payload = json.loads(body)
        _validate(payload)
        return body, content_type

    key = cache_key("usgs_quakes", params)
    result = STORE.get_or_fetch(key, do_fetch, WEATHER_TTL, WEATHER_STALE_TTL)
    payload = json.loads(result.entry.body)

    quakes = []
    for feature in payload.get("features", []):
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})
        coords = geom.get("coordinates", [None, None, None])
        quakes.append({
            "id": feature.get("id"),
            "place": props.get("place"),
            "time": props.get("time"),
            "mag": props.get("mag"),
            "lat": coords[1],
            "lng": coords[0],
            "depth_km": coords[2],
            "tsunami": props.get("tsunami"),
        })
    return {"quakes": quakes, "count": len(quakes), "cache_state": result.state}
