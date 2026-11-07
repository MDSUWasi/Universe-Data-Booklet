"""Static app server with a small, allowlisted SQLite upstream cache.

This is the thin HTTP layer.  All upstream-service logic lives in
``backend/api/`` (cache, elevation, weather, tiles, routes); this file only knows
how to route a request path to the right handler and write the response.

The public names below (``ROOT``, ``STORE``, ``AppHandler``, ``CacheStore``,
``UpstreamUnavailable``) are part of the contract -- the test suite imports them
from here, so they must not move or rename.
"""

from __future__ import annotations

import json
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

# Works both as ``python3 -m backend.server`` (package context) and as
# ``python3 backend/server.py`` (direct execution, no parent package).
try:
    from .api import (
        ROOT,
        STORE,
        CacheStore,
        UpstreamUnavailable,
        cache_key,
        elevation,
        routes,
        tiles,
        weather,
    )
except ImportError:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from backend.api import (  # noqa: E402
        ROOT,
        STORE,
        CacheStore,
        UpstreamUnavailable,
        cache_key,
        elevation,
        routes,
        tiles,
        weather,
    )

FRONTEND = ROOT / "frontend"
HOST = "127.0.0.1"
PORT = 8000


class AppHandler(SimpleHTTPRequestHandler):
    server_version = "PlanetaryAnalogExplorer/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND), **kwargs)

    # ------------------------------------------------------------------ #
    # Routing
    # ------------------------------------------------------------------ #
    def do_GET(self) -> None:
        parsed = urlsplit(self.path)
        if parsed.path == "/api/health":
            self._json(200, {"status": "ok", "cache": "sqlite", "static_ttl_days": 30})
        elif parsed.path == "/api/sites":
            self._serve_payload(routes.sites_payload())
        elif parsed.path == "/api/patches":
            self._serve_payload(routes.patches_payload())
        elif parsed.path == "/api/scale-sensitivity":
            self._serve_payload(routes.scale_sensitivity_payload())
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

    # ------------------------------------------------------------------ #
    # Upstream-backed endpoints
    # ------------------------------------------------------------------ #
    def _elevation(self, query: dict[str, list[str]]) -> None:
        try:
            latitudes, longitudes = elevation.parse_coordinates(
                query.get("latitude", [""])[0],
                query.get("longitude", [""])[0],
            )
        except (ValueError, OverflowError) as error:
            self._json(400, {"error": str(error)})
            return

        try:
            body, content_type, state = elevation.fetch_elevation(latitudes, longitudes)
        except UpstreamUnavailable as error:
            self._json(502, {"error": str(error)})
            return
        self._send(200, body, content_type, {
            "Cache-Control": "no-store",
            "X-Cache": state,
        })

    def _weather(self, query: dict[str, list[str]]) -> None:
        try:
            latitude = float(query.get("lat", [""])[0])
            longitude = float(query.get("lon", [""])[0])
            weather.validate(latitude, longitude)
        except (ValueError, OverflowError) as error:
            self._json(400, {"error": str(error)})
            return

        try:
            body, content_type, state = weather.fetch_weather(latitude, longitude)
        except UpstreamUnavailable as error:
            self._json(502, {"error": str(error)})
            return
        self._send(200, body, content_type, {
            "Cache-Control": "no-store",
            "X-Cache": state,
        })

    def _tile(self, path: str) -> None:
        parsed = tiles.parse_tile_path(path)
        if parsed is None:
            self._json(404, {"error": "Unknown tile"})
            return
        body, zoom, row, column = parsed
        try:
            image, content_type, state = tiles.fetch_tile(body, zoom, row, column)
        except UpstreamUnavailable as error:
            self._json(502, {"error": str(error)})
            return
        if not content_type.startswith("image/"):
            self._json(502, {"error": "Tile service returned a non-image response"})
            return
        self._send(200, image, content_type, {
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Cache": state,
        })

    # ------------------------------------------------------------------ #
    # Response helpers
    # ------------------------------------------------------------------ #
    def _serve_payload(self, payload: tuple[dict, int] | dict) -> None:
        """Accept either a (payload, status) tuple or a bare payload dict."""
        if isinstance(payload, tuple):
            value, status = payload
        else:
            value, status = payload, 200
        self._json(status, value)

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

    # ------------------------------------------------------------------ #
    # Backwards-compatible aliases
    # ------------------------------------------------------------------ #
    # The data endpoints were previously instance methods on AppHandler and
    # the test suite calls them as AppHandler._sites(capture) etc.  They now
    # live in backend.api.routes; re-expose them here so the public surface is
    # unchanged.  Each is a plain function taking a "capture" object that
    # implements _json(status, payload) -- exactly the contract the tests use.
    _read_csv = staticmethod(routes._read_csv)

    @staticmethod
    def _sites(capture):
        value, status = routes.sites_payload()
        capture._json(status, value)

    @staticmethod
    def _patches(capture):
        value, status = routes.patches_payload()
        capture._json(status, value)

    @staticmethod
    def _scale_sensitivity(capture):
        value, status = routes.scale_sensitivity_payload()
        capture._json(status, value)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Planetary Analog Explorer: http://{HOST}:{PORT}/")
    print(f"SQLite cache: {STORE.path} (versioned NASA tiles immutable; elevation 30 days; weather 15 minutes)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()