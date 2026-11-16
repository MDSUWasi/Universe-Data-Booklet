"""Route handlers for the data endpoints backed by committed CSV reports and
free public APIs.

These handlers read the checked-in comparison reports and serve encyclopedia /
real-time data from free public NASA, Open Notify, and USGS endpoints.  They are
independent of the upstream service modules (elevation/weather/tiles) and of the
HTTP transport layer -- the tests call them directly via ``AppHandler._sites``
etc., so the public method names are part of the contract and must not change.
"""

from __future__ import annotations

import csv
from pathlib import Path

from .cache import ROOT

from . import encyclopedia, nasa, opennotify, earth_events

# site name (lowercased, as it appears in the CSV) -> canonical id
SITE_IDS = {
    "moon south pole": "moon",
    "jezero crater (mars)": "jezero",
}

PATCH_NUMERIC_FIELDS = (
    "area_km2", "centre_x", "centre_y", "slope_mean_deg", "rough_mean_m",
    "rough_p95_m", "rough_max_m", "zero_frac",
)


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as source:
        return list(csv.DictReader(source))


def sites_payload() -> dict:
    """Build the /api/sites payload from output/reports/all_sites_comparison.csv."""
    path = ROOT / "output/reports/all_sites_comparison.csv"
    if not path.is_file():
        return {"error": "Site summary data is missing"}, 404

    sites = []
    for row in _read_csv(path):
        site_id = SITE_IDS.get(row.get("site", "").strip().lower())
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

    if {site["id"] for site in sites} != set(SITE_IDS.values()):
        return {"error": "Site summary is incomplete or invalid"}, 500

    return {"source": "output/reports/all_sites_comparison.csv", "sites": sites}, 200


def patches_payload() -> dict:
    """Build the /api/patches payload from output/reports/site_comparison.csv."""
    path = ROOT / "output/reports/site_comparison.csv"
    if not path.is_file():
        return {"error": "Patch comparison data is missing"}, 404

    records: list[dict[str, object]] = []
    for record in _read_csv(path):
        parsed: dict[str, object] = dict(record)
        site_name = record.get("site", "").lower()
        parsed["body"] = (
            "Moon" if site_name.startswith("moon")
            else "Mars" if ("mars" in site_name or "jezero" in site_name)
            else "Earth"
        )
        for name in PATCH_NUMERIC_FIELDS:
            try:
                parsed[name] = float(record[name])
            except (KeyError, ValueError):
                parsed[name] = None
        parsed["filled"] = record.get("filled", "").strip().lower() == "true"
        records.append(parsed)

    return {"source": "output/reports/site_comparison.csv", "records": records}, 200


def scale_sensitivity_payload() -> dict:
    """Build the /api/scale-sensitivity payload (12 m fingerprints vs 90 m reference)."""
    fingerprint_path = ROOT / "data/raw/lunar_fingerprints.csv"
    summary_path = ROOT / "output/reports/all_sites_comparison.csv"
    if not fingerprint_path.is_file() or not summary_path.is_file():
        return {"error": "Scale sensitivity source data is missing"}, 404

    fingerprints = _read_csv(fingerprint_path)
    summaries = _read_csv(summary_path)
    matched = next((row for row in summaries if row.get("site", "").lower().startswith("moon")), None)
    if matched is None:
        return {"error": "Matched-window lunar reference is missing"}, 500

    try:
        matched_mean = float(matched["rough_mean_m"])
        matched_p95 = float(matched["rough_p95_m"])
    except (KeyError, ValueError):
        return {"error": "Matched-window lunar metrics are invalid"}, 500

    points = []
    for row in fingerprints:
        try:
            points.append({
                "patch_id": int(row["patch_id"]),
                "area_km2": float(row["area_km2"]),
                "slope_mean_deg": float(row["slope_mean_deg"]) if row.get("slope_mean_deg") else None,
                "centre_x": float(row["centre_x"]) if row.get("centre_x") else None,
                "centre_y": float(row["centre_y"]) if row.get("centre_y") else None,
                "roughness_mean_m": float(row["roughness_mean_m"]),
                "roughness_p95_m": float(row["roughness_p95_m"]),
            })
        except (KeyError, ValueError):
            continue

    return {
        "fingerprint_window_m": 12,
        "comparison_window_m": 90,
        "fingerprints": points,
        "comparison_reference": {"mean_roughness_m": matched_mean, "p95_roughness_m": matched_p95},
        "warning": "Different roughness windows are shown for scale sensitivity, not as directly comparable scores.",
    }, 200


# --------------------------------------------------------------------------- #
# Encyclopedia endpoints (static planetary data)
# --------------------------------------------------------------------------- #

def encyclopedia_payload() -> dict:
    """Return all encyclopedia data: planets, moons, and diverse terrain sites."""
    return {
        "planets": encyclopedia.list_planets(),
        "moons": encyclopedia.list_moons(),
        "sites": encyclopedia.list_sites(),
    }, 200


def planets_payload() -> dict:
    """Return the list of planetary bodies."""
    return {"planets": encyclopedia.list_planets()}, 200


def moons_payload() -> dict:
    """Return the list of moons."""
    return {"moons": encyclopedia.list_moons()}, 200


def sites_payload_v2() -> dict:
    """Return diverse terrain candidate sites across all bodies."""
    return {"sites": encyclopedia.list_sites()}, 200


def sites_by_body_payload(body: str) -> dict:
    """Return terrain candidate sites filtered by planetary body."""
    sites = encyclopedia.list_sites(body)
    if not sites:
        return {"error": f"No sites found for body '{body}'"}, 404
    return {"body": body, "sites": sites}, 200


def planet_payload(body_id: str) -> dict:
    """Return a single planet's encyclopedia entry."""
    planet = encyclopedia.get_planet(body_id)
    if planet is None:
        return {"error": f"Planet '{body_id}' not found"}, 404
    return planet, 200


def moon_payload(moon_id: str) -> dict:
    """Return a single moon's encyclopedia entry."""
    moon = encyclopedia.get_moon(moon_id)
    if moon is None:
        return {"error": f"Moon '{moon_id}' not found"}, 404
    return moon, 200


def site_payload(site_id: str) -> dict:
    """Return a single terrain site's entry."""
    site = encyclopedia.get_site(site_id)
    if site is None:
        return {"error": f"Site '{site_id}' not found"}, 404
    return site, 200


# --------------------------------------------------------------------------- #
# Real-time / public API endpoints
# --------------------------------------------------------------------------- #

def apod_payload() -> dict:
    """NASA Astronomy Picture of the Day."""
    return nasa.get_apod(), 200


def earth_events_payload() -> dict:
    """Recent Earth natural events (EONET)."""
    return nasa.get_earth_events(), 200


def mars_weather_payload() -> dict:
    """Latest InSight Mars weather report."""
    return nasa.get_mars_weather(), 200


def space_weather_payload() -> dict:
    """Recent space weather notifications (DONKI)."""
    return nasa.get_space_weather(), 200


def iss_position_payload() -> dict:
    """Current ISS position (Open Notify)."""
    return opennotify.get_iss_position(), 200


def astronauts_payload() -> dict:
    """Who is in space right now (Open Notify)."""
    return opennotify.get_astronauts(), 200


def earthquakes_payload() -> dict:
    """Recent earthquakes worldwide (USGS)."""
    return earth_events.get_recent_earthquakes(), 200