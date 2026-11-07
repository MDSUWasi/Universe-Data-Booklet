"""Route handlers for the data endpoints backed by committed CSV reports.

These handlers read the checked-in comparison reports and return JSON.  They are
independent of the upstream service modules (elevation/weather/tiles) and of the
HTTP transport layer -- the tests call them directly via ``AppHandler._sites``
etc., so the public method names are part of the contract and must not change.
"""

from __future__ import annotations

import csv
from pathlib import Path

from .cache import ROOT

# site name (lowercased, as it appears in the CSV) -> canonical id
SITE_IDS = {
    "moon south pole": "moon",
    "mcmurdo dry valleys": "mcmurdo",
    "axel heiberg island": "axel",
    "kerguelen islands": "kerguelen",
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
    """Build the /api/patches payload from output/reports/analog_comparison.csv."""
    path = ROOT / "output/reports/analog_comparison.csv"
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

    return {"source": "output/reports/analog_comparison.csv", "records": records}, 200


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