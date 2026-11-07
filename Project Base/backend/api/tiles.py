"""NASA Solar System Treks WMTS tile proxy, cached as immutable JPEGs.

ATTRIBUTION: both products are NASA/JPL public-domain data served through the
Solar System Treks WMTS service (https://trek.nasa.gov).  Recommended credit:
"NASA/JPL-Caltech" or "NASA/JPL Solar System Treks".

Moon uses the LRO WAC Mosaic; Mars uses the Viking MDIM21 global mosaic.
Tiles are versioned upstream products, so they are cached with no TTL and
served until capacity eviction removes them.

Independent of: elevation, weather, the HTTP layer.
"""

from __future__ import annotations

import re
from urllib.parse import quote

from .cache import IMMUTABLE_TTL, UpstreamUnavailable, STORE, cache_key, fetch

TREK_BASE = "https://trek.nasa.gov/tiles/{body}/EQ/{layer}/1.0.0/default/default028mm/{zoom}/{row}/{column}.jpg"

# body -> (trek slug, WMTS layer name)
LAYERS = {
    "moon": ("Moon", "LRO_WAC_Mosaic_Global_303ppd_v02"),
    "mars": ("Mars", "Mars_Viking_MDIM21_ClrMosaic_global_232m"),
}

# Tile-matrix limits.  ``column`` upper bound is preserved verbatim from the
# original server (2^(zoom+1)) even though standard Web Mercator uses 2^zoom;
# changing it would alter which tiles are accepted.
MAX_ZOOM = 6

_TILE_RE = re.compile(r"^/api/tiles/(moon|mars)/(\d+)/(\d+)/(\d+)\.jpg$")


def parse_tile_path(path: str) -> tuple[str, int, int, int] | None:
    """Match and validate a tile request path.  Returns (body, zoom, row, col) or None."""
    match = _TILE_RE.fullmatch(path)
    if not match:
        return None
    body, zoom_text, row_text, column_text = match.groups()
    zoom, row, column = int(zoom_text), int(row_text), int(column_text)
    if zoom > MAX_ZOOM or row >= 2 ** zoom or column >= 2 ** (zoom + 1):
        return None
    return body, zoom, row, column


def build_tile_url(body: str, zoom: int, row: int, column: int) -> str:
    trek_body, layer = LAYERS[body]
    return TREK_BASE.format(
        body=trek_body, layer=layer, zoom=zoom, row=row, column=column
    )


def fetch_tile(body: str, zoom: int, row: int, column: int) -> tuple[bytes, str, str]:
    """Fetch (or serve cached) a single NASA Trek tile as JPEG."""
    url = build_tile_url(body, zoom, row, column)

    def do_fetch() -> tuple[bytes, str]:
        image, content_type = fetch(url, "image/jpeg")
        if content_type != "image/jpeg" or not image.startswith(b"\xff\xd8"):
            raise UpstreamUnavailable("NASA Trek returned an invalid JPEG tile")
        return image, content_type

    key = cache_key("tile", url)
    result = STORE.get_or_fetch(key, do_fetch, IMMUTABLE_TTL, None)
    return result.entry.body, result.entry.content_type, result.state


def get_tile(body: str, zoom: int, row: int, column: int) -> dict:
    image, content_type, state = fetch_tile(body, zoom, row, column)
    return {"image": image, "content_type": content_type, "cache_state": state}