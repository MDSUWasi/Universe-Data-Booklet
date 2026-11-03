"""Static app server with a small, allowlisted SQLite upstream cache."""

from __future__ import annotations

import hashlib
import csv
import json
import math
import os
import re
import sqlite3
import time
from contextlib import closing
from dataclasses import dataclass
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Callable
from urllib.error import URLError
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
CACHE_PATH = Path(os.environ.get("PLANETARY_CACHE_DB", ROOT / ".cache/planetary-analog/cache.sqlite3"))
HOST = os.environ.get("PLANETARY_HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8000"))

DAY = 24 * 60 * 60
STATIC_TTL = 30 * DAY
STATIC_STALE_TTL = 365 * DAY
IMMUTABLE_TTL = None
WEATHER_TTL = 15 * 60
WEATHER_STALE_TTL = 30 * DAY
MAX_CACHE_BYTES = 128 * 1024 * 1024
MAX_ENTRY_BYTES = 5 * 1024 * 1024
UPSTREAM_TIMEOUT = 15
USER_AGENT = "PlanetaryAnalogExplorer/1.0 (public research project)"


@dataclass(frozen=True)
class CacheEntry:
    body: bytes
    content_type: str
    cached_at: float


@dataclass(frozen=True)
class CacheResult:
    entry: CacheEntry
    state: str


class CacheStore:
    """A byte-bounded persistent cache; entries are refreshed on demand."""

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


class UpstreamUnavailable(Exception):
    pass


STORE = CacheStore(CACHE_PATH)


def _cache_key(service: str, value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return f"{service}:{digest}"


def _fetch(url: str, accept: str) -> tuple[bytes, str]:
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


def _numbers(values: list[str], minimum: float, maximum: float, limit: int) -> list[float]:
    if not values or len(values) > limit:
        raise ValueError("Invalid coordinate count")
    numbers = [float(value) for value in values]
    if not all(math.isfinite(value) and minimum <= value <= maximum for value in numbers):
        raise ValueError("Coordinate is outside the supported range")
    return numbers


class AppHandler(SimpleHTTPRequestHandler):
    server_version = "PlanetaryAnalogExplorer/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND), **kwargs)

    def do_GET(self) -> None:
        parsed = urlsplit(self.path)
        if parsed.path == "/api/health":
            self._json(200, {"status": "ok", "cache": "sqlite", "static_ttl_days": 30})
        elif parsed.path == "/api/sites":
            self._sites()
        elif parsed.path == "/api/patches":
            self._patches()
        elif parsed.path == "/api/scale-sensitivity":
            self._scale_sensitivity()
        elif parsed.path == "/api/elevation":
            self._elevation(parse_qs(parsed.query))
        elif parsed.path == "/api/weather":
            self._weather(parse_qs(parsed.query))
        elif parsed.path.startswith("/api/tiles/"):
            self._tile(parsed.path)
        elif parsed.path.startswith("/api/"):
            self._json(404, {"error": "Unknown API endpoint"})
        else:
            super().do_GET()

    def _elevation(self, query: dict[str, list[str]]) -> None:
        try:
            latitudes = _numbers(query.get("latitude", [""])[0].split(","), -90, 90, 100)
            longitudes = _numbers(query.get("longitude", [""])[0].split(","), -180, 180, 100)
            if len(latitudes) != len(longitudes):
                raise ValueError("Latitude and longitude counts must match")
        except (ValueError, OverflowError) as error:
            self._json(400, {"error": str(error)})
            return

        params = urlencode({
            "latitude": ",".join(f"{value:.6f}" for value in latitudes),
            "longitude": ",".join(f"{value:.6f}" for value in longitudes),
        })
        url = f"https://api.open-meteo.com/v1/elevation?{params}"
        def fetch_elevation() -> tuple[bytes, str]:
            body, content_type = _fetch(url, "application/json")
            payload = json.loads(body)
            elevations = payload.get("elevation") if isinstance(payload, dict) else None
            if not isinstance(elevations, list) or len(elevations) != len(latitudes):
                raise UpstreamUnavailable("Elevation service returned an invalid response")
            if not all(isinstance(value, (int, float)) and math.isfinite(value) for value in elevations):
                raise UpstreamUnavailable("Elevation service returned non-finite elevations")
            return body, content_type

        key = _cache_key("elevation", params)
        self._proxy(key, fetch_elevation, STATIC_TTL, STATIC_STALE_TTL, "application/json")

    @staticmethod
    def _read_csv(path: Path) -> list[dict[str, str]]:
        with path.open("r", encoding="utf-8-sig", newline="") as source:
            return list(csv.DictReader(source))

    def _sites(self) -> None:
        path = ROOT / "output/reports/all_sites_comparison.csv"
        if not path.is_file():
            self._json(404, {"error": "Site summary data is missing"})
            return
        site_ids = {
            "moon south pole": "moon",
            "mcmurdo dry valleys": "mcmurdo",
            "axel heiberg island": "axel",
            "kerguelen islands": "kerguelen",
            "jezero crater (mars)": "jezero",
        }
        sites = []
        for row in self._read_csv(path):
            site_id = site_ids.get(row.get("site", "").strip().lower())
            if site_id is None:
                continue
            try:
                sites.append({
                    "id": site_id,
                    "area_km2": float(row["area_km2"]),
                    "mean_rough_m": float(row["rough_mean_m"]),
                    "p95_rough_m": float(row["rough_p95_m"]),
                    "max_rough_m": float(row["rough_max_m"]),
                })
            except (KeyError, ValueError):
                continue
        expected = set(site_ids.values())
        if {site["id"] for site in sites} != expected:
            self._json(500, {"error": "Site summary is incomplete or invalid"})
            return
        self._json(200, {"source": "output/reports/all_sites_comparison.csv", "sites": sites})

    def _patches(self) -> None:
        path = ROOT / "output/reports/analog_comparison.csv"
        if not path.is_file():
            self._json(404, {"error": "Patch comparison data is missing"})
            return
        records = self._read_csv(path)
        numeric_fields = (
            "area_km2", "centre_x", "centre_y", "slope_mean_deg", "rough_mean_m",
            "rough_p95_m", "rough_max_m", "zero_frac",
        )
        parsed_records: list[dict[str, object]] = []
        for record in records:
            parsed: dict[str, object] = dict(record)
            site_name = record.get("site", "").lower()
            parsed["body"] = "Moon" if site_name.startswith("moon") else "Mars" if "mars" in site_name or "jezero" in site_name else "Earth"
            for name in numeric_fields:
                try:
                    parsed[name] = float(record[name])
                except (KeyError, ValueError):
                    parsed[name] = None
            parsed["filled"] = record.get("filled", "").strip().lower() == "true"
            parsed_records.append(parsed)
        self._json(200, {"source": "output/reports/analog_comparison.csv", "records": parsed_records})

    def _scale_sensitivity(self) -> None:
        fingerprint_path = ROOT / "data/raw/lunar_fingerprints.csv"
        summary_path = ROOT / "output/reports/all_sites_comparison.csv"
        if not fingerprint_path.is_file() or not summary_path.is_file():
            self._json(404, {"error": "Scale sensitivity source data is missing"})
            return
        fingerprints = self._read_csv(fingerprint_path)
        summaries = self._read_csv(summary_path)
        matched = next((row for row in summaries if row.get("site", "").lower().startswith("moon")), None)
        if matched is None:
            self._json(500, {"error": "Matched-window lunar reference is missing"})
            return
        try:
            matched_mean = float(matched["rough_mean_m"])
            matched_p95 = float(matched["rough_p95_m"])
        except (KeyError, ValueError):
            self._json(500, {"error": "Matched-window lunar metrics are invalid"})
            return
        points = []
        for row in fingerprints:
            try:
                points.append({
                    "patch_id": int(row["patch_id"]),
                    "area_km2": float(row["area_km2"]),
                    "roughness_mean_m": float(row["roughness_mean_m"]),
                    "roughness_p95_m": float(row["roughness_p95_m"]),
                })
            except (KeyError, ValueError):
                continue
        self._json(200, {
            "fingerprint_window_m": 12,
            "comparison_window_m": 90,
            "fingerprints": points,
            "comparison_reference": {"mean_roughness_m": matched_mean, "p95_roughness_m": matched_p95},
            "warning": "Different roughness windows are shown for scale sensitivity, not as directly comparable scores.",
        })

    def _weather(self, query: dict[str, list[str]]) -> None:
        try:
            latitude = _numbers(query.get("lat", []), -90, 90, 1)[0]
            longitude = _numbers(query.get("lon", []), -180, 180, 1)[0]
        except (ValueError, OverflowError) as error:
            self._json(400, {"error": str(error)})
            return

        params = urlencode({
            "latitude": f"{latitude:.4f}",
            "longitude": f"{longitude:.4f}",
            "current": "temperature_2m,wind_speed_10m",
            "timezone": "auto",
        })
        url = f"https://api.open-meteo.com/v1/forecast?{params}"
        def fetch_weather() -> tuple[bytes, str]:
            body, content_type = _fetch(url, "application/json")
            payload = json.loads(body)
            current = payload.get("current") if isinstance(payload, dict) else None
            if not isinstance(current, dict) or not all(
                isinstance(current.get(name), (int, float)) and math.isfinite(current[name])
                for name in ("temperature_2m", "wind_speed_10m")
            ):
                raise UpstreamUnavailable("Weather service returned an invalid current reading")
            return body, content_type

        key = _cache_key("weather", params)
        self._proxy(key, fetch_weather, WEATHER_TTL, WEATHER_STALE_TTL, "application/json")

    def _tile(self, path: str) -> None:
        match = re.fullmatch(r"/api/tiles/(moon|mars)/(\d+)/(\d+)/(\d+)\.jpg", path)
        if not match:
            self._json(404, {"error": "Unknown tile"})
            return
        body, zoom_text, row_text, column_text = match.groups()
        zoom, row, column = int(zoom_text), int(row_text), int(column_text)
        if zoom > 6 or row >= 2**zoom or column >= 2 ** (zoom + 1):
            self._json(400, {"error": "Tile coordinate is outside the supported matrix"})
            return

        if body == "moon":
            layer = "LRO_WAC_Mosaic_Global_303ppd_v02"
        else:
            layer = "Mars_Viking_MDIM21_ClrMosaic_global_232m"
        url = f"https://trek.nasa.gov/tiles/{body.title()}/EQ/{layer}/1.0.0/default/default028mm/{zoom}/{row}/{column}.jpg"
        def fetch_tile() -> tuple[bytes, str]:
            image, content_type = _fetch(url, "image/jpeg")
            if content_type != "image/jpeg" or not image.startswith(b"\xff\xd8"):
                raise UpstreamUnavailable("NASA Trek returned an invalid JPEG tile")
            return image, content_type

        key = _cache_key("tile", url)
        self._proxy(key, fetch_tile, IMMUTABLE_TTL, None, "image/jpeg", tile=True)

    def _proxy(
        self,
        key: str,
        fetch: Callable[[], tuple[bytes, str]],
        ttl: int | None,
        stale_ttl: int | None,
        fallback_content_type: str,
        tile: bool = False,
    ) -> None:
        try:
            result = STORE.get_or_fetch(key, fetch, ttl, stale_ttl)
        except UpstreamUnavailable as error:
            self._json(502, {"error": str(error)})
            return
        if tile and not result.entry.content_type.startswith("image/"):
            self._json(502, {"error": "Tile service returned a non-image response"})
            return
        content_type = result.entry.content_type or fallback_content_type
        cache_control = "public, max-age=31536000, immutable" if tile else "no-store"
        self._send(200, result.entry.body, content_type, {
            "Cache-Control": cache_control,
            "X-Cache": result.state,
            "X-Cache-Age": str(max(0, int(time.time() - result.entry.cached_at))),
        })

    def _json(self, status: int, value: dict[str, object]) -> None:
        self._send(status, json.dumps(value).encode("utf-8"), "application/json", {"Cache-Control": "no-store"})

    def _send(self, status: int, body: bytes, content_type: str, headers: dict[str, str]) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        for name, value in headers.items():
            self.send_header(name, value)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        super().log_message(format, *args)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Planetary Analog Explorer: http://{HOST}:{PORT}/")
    print(f"SQLite cache: {CACHE_PATH} (versioned NASA tiles immutable; elevation 30 days; weather 15 minutes)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()