"""Open-Meteo elevation service, proxied and cached.

ATTRIBUTION: Open-Meteo is licensed CC BY 4.0.  Cite it as "Open-Meteo
(https://open-meteo.com)".  No API key is required; the service is free for
non-commercial and commercial use under that licence.

The Discovery Lab samples a 3x3 elevation grid around any Earth coordinate and
computes local slope/relief in the browser.  This module owns the upstream call,
the response validation and the cache policy for that call.

Independent of: weather, tiles, the HTTP layer.
"""

from __future__ import annotations

import json
import math
from typing import Callable
from urllib.parse import urlencode

from .cache import STATIC_STALE_TTL, STATIC_TTL, UpstreamUnavailable, STORE, cache_key, fetch

OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"

# Coordinate limits enforced *before* the upstream call.
LAT_MIN, LAT_MAX = -90.0, 90.0
LNG_MIN, LNG_MAX = -180.0, 180.0
MAX_COORDS = 100          # max points per single elevation request


def parse_coordinates(latitude: str, longitude: str) -> tuple[list[float], list[float]]:
    """Parse and validate comma-separated lat/lng strings.

    Raises ValueError with a human-readable message on any bad input.
    """
    lat_parts = [p.strip() for p in latitude.split(",") if p.strip()]
    lng_parts = [p.strip() for p in longitude.split(",") if p.strip()]

    if not lat_parts or not lng_parts:
        raise ValueError("Latitude and longitude are required")
    if len(lat_parts) != len(lng_parts):
        raise ValueError("Latitude and longitude counts must match")
    if len(lat_parts) > MAX_COORDS:
        raise ValueError(f"Too many coordinates (max {MAX_COORDS})")

    latitudes: list[float] = []
    longitudes: list[float] = []
    for raw in lat_parts:
        value = float(raw)
        if not math.isfinite(value) or not (LAT_MIN <= value <= LAT_MAX):
            raise ValueError(f"Latitude {raw} is outside the supported range")
        latitudes.append(value)
    for raw in lng_parts:
        value = float(raw)
        if not math.isfinite(value) or not (LNG_MIN <= value <= LNG_MAX):
            raise ValueError(f"Longitude {raw} is outside the supported range")
        longitudes.append(value)
    return latitudes, longitudes


def build_url(latitudes: list[float], longitudes: list[float]) -> str:
    params = urlencode({
        "latitude": ",".join(f"{value:.6f}" for value in latitudes),
        "longitude": ",".join(f"{value:.6f}" for value in longitudes),
    })
    return f"{OPEN_METEO_ELEVATION_URL}?{params}"


def fetch_elevation(latitudes: list[float], longitudes: list[float]) -> tuple[bytes, str]:
    """Fetch + validate the elevation grid for the given coordinates."""
    url = build_url(latitudes, longitudes)
    params = url.split("?", 1)[1]

    def do_fetch() -> tuple[bytes, str]:
        body, content_type = fetch(url, "application/json")
        payload = json.loads(body)
        elevations = payload.get("elevation") if isinstance(payload, dict) else None
        if not isinstance(elevations, list) or len(elevations) != len(latitudes):
            raise UpstreamUnavailable("Elevation service returned an invalid response")
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in elevations):
            raise UpstreamUnavailable("Elevation service returned non-finite elevations")
        return body, content_type

    key = cache_key("elevation", params)
    result = STORE.get_or_fetch(key, do_fetch, STATIC_TTL, STATIC_STALE_TTL)
    return result.entry.body, result.entry.content_type, result.state


def get_elevation(latitudes: list[float], longitudes: list[float]) -> dict:
    """Convenience wrapper returning the parsed payload plus cache state."""
    body, content_type, state = fetch_elevation(latitudes, longitudes)
    return {"payload": json.loads(body), "content_type": content_type, "cache_state": state}