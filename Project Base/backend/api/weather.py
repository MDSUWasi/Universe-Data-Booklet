"""Open-Meteo current-weather service, proxied and cached.

Independent of: elevation, tiles, the HTTP layer.  Owns its own TTL policy
(15-minute fresh window, 30-day stale fallback) so weather can never be confused
with the 30-day elevation policy.
"""

from __future__ import annotations

import json
import math
from urllib.parse import urlencode

from .cache import WEATHER_STALE_TTL, WEATHER_TTL, UpstreamUnavailable, STORE, cache_key, fetch

OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
LAT_MIN, LAT_MAX = -90.0, 90.0
LNG_MIN, LNG_MAX = -180.0, 180.0

CURRENT_FIELDS = ("temperature_2m", "wind_speed_10m")


def validate(latitude: float, longitude: float) -> None:
    if not math.isfinite(latitude) or not (LAT_MIN <= latitude <= LAT_MAX):
        raise ValueError(f"Latitude {latitude} is outside the supported range")
    if not math.isfinite(longitude) or not (LNG_MIN <= longitude <= LNG_MAX):
        raise ValueError(f"Longitude {longitude} is outside the supported range")


def build_url(latitude: float, longitude: float) -> str:
    params = urlencode({
        "latitude": f"{latitude:.4f}",
        "longitude": f"{longitude:.4f}",
        "current": ",".join(CURRENT_FIELDS),
        "timezone": "auto",
    })
    return f"{OPEN_METEO_WEATHER_URL}?{params}"


def fetch_weather(latitude: float, longitude: float) -> tuple[bytes, str, str]:
    validate(latitude, longitude)
    url = build_url(latitude, longitude)
    params = url.split("?", 1)[1]

    def do_fetch() -> tuple[bytes, str]:
        body, content_type = fetch(url, "application/json")
        payload = json.loads(body)
        current = payload.get("current") if isinstance(payload, dict) else None
        if not isinstance(current, dict) or not all(
            isinstance(current.get(name), (int, float)) and math.isfinite(current[name])
            for name in CURRENT_FIELDS
        ):
            raise UpstreamUnavailable("Weather service returned an invalid current reading")
        return body, content_type

    key = cache_key("weather", params)
    result = STORE.get_or_fetch(key, do_fetch, WEATHER_TTL, WEATHER_STALE_TTL)
    return result.entry.body, result.entry.content_type, result.state


def get_weather(latitude: float, longitude: float) -> dict:
    body, content_type, state = fetch_weather(latitude, longitude)
    return {"payload": json.loads(body), "content_type": content_type, "cache_state": state}