"""Build small browser-ready terrain windows from the local analysis rasters."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from osgeo import gdal

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "frontend/assets/terrain"
GRID_SIZE = 128
WINDOW_METRES = 3000.0
OUTPUT_NODATA = -9999.0
SLOPE_SCALE_DEG = 20.0
ROUGHNESS_SCALE_M = 8.0

SITES = {
    "moon": {
        "name": "Lunar South Pole (Shackleton)",
        "body": "Moon",
        "dem": "data/moon/moon_30m.tif",
        "slope": "output/analysis/moon_slope_30m.tif",
        "roughness": "output/analysis/moon_roughness_30m.tif",
        "safe": "output/maps/southpole_safe_3deg.tif",
        "center": (-27554.4, -27779.2),
    },
    "jezero": {
        "name": "Jezero Crater",
        "body": "Mars",
        "dem": "data/mars/mars_30m.tif",
        "slope": "output/mars/mars_slope_30m.tif",
        "roughness": "output/mars/mars_roughness_30m.tif",
        "center": None,
    },
}


def _dataset_bounds(dataset: gdal.Dataset) -> tuple[float, float, float, float]:
    transform = dataset.GetGeoTransform()
    width = dataset.RasterXSize
    height = dataset.RasterYSize
    corners = [
        (transform[0], transform[3]),
        (transform[0] + width * transform[1], transform[3]),
        (transform[0], transform[3] + height * transform[5]),
        (transform[0] + width * transform[1], transform[3] + height * transform[5]),
    ]
    xs, ys = zip(*corners)
    return min(xs), min(ys), max(xs), max(ys)


def _sample(path: Path, bounds: tuple[float, float, float, float], resampling: str) -> np.ndarray:
    source = gdal.Open(str(path), gdal.GA_ReadOnly)
    if source is None:
        raise FileNotFoundError(f"Could not open raster: {path}")
    sampled = gdal.Warp(
        "",
        source,
        format="MEM",
        outputType=gdal.GDT_Float32,
        outputBounds=bounds,
        width=GRID_SIZE,
        height=GRID_SIZE,
        resampleAlg=resampling,
        dstNodata=OUTPUT_NODATA,
    )
    if sampled is None:
        raise RuntimeError(f"Could not sample raster window: {path}")
    return sampled.GetRasterBand(1).ReadAsArray().astype(np.float32)


def _valid(array: np.ndarray) -> np.ndarray:
    return np.isfinite(array) & (array != OUTPUT_NODATA)


def _quantize(array: np.ndarray, scale: float) -> list[int]:
    values = np.nan_to_num(array, nan=0.0, posinf=0.0, neginf=0.0)
    return np.rint(np.clip(values / scale, 0.0, 1.0) * 255).astype(np.uint8).ravel().tolist()


def build_asset(site_id: str, config: dict[str, object], output_dir: Path) -> Path:
    gdal.UseExceptions()
    dem_path = ROOT / str(config["dem"])
    dem_source = gdal.Open(str(dem_path), gdal.GA_ReadOnly)
    if dem_source is None:
        raise FileNotFoundError(f"Could not open elevation raster: {dem_path}")

    center = config["center"]
    if center is None:
        min_x, min_y, max_x, max_y = _dataset_bounds(dem_source)
        center = ((min_x + max_x) / 2.0, (min_y + max_y) / 2.0)
    center_x, center_y = center
    half_window = WINDOW_METRES / 2.0
    bounds = (
        center_x - half_window,
        center_y - half_window,
        center_x + half_window,
        center_y + half_window,
    )

    elevation = _sample(dem_path, bounds, "bilinear")
    slope = _sample(ROOT / str(config["slope"]), bounds, "bilinear")
    roughness = _sample(ROOT / str(config["roughness"]), bounds, "bilinear")
    valid = _valid(elevation) & _valid(slope) & _valid(roughness) & (roughness > 0)

    safe_path = config.get("safe")
    if safe_path:
        safe_values = _sample(ROOT / str(safe_path), bounds, "near")
        safe = valid & _valid(safe_values) & (safe_values > 0)
    else:
        safe = valid & (slope <= 3.0)

    if not np.any(valid):
        raise ValueError(f"Selected window contains no valid, non-filled terrain: {site_id}")

    elevation_min = float(np.min(elevation[valid]))
    elevation_max = float(np.max(elevation[valid]))
    elevation_range = max(elevation_max - elevation_min, 1e-6)
    normalized_elevation = np.zeros_like(elevation, dtype=np.float32)
    normalized_elevation[valid] = (elevation[valid] - elevation_min) / elevation_range

    asset = {
        "schema_version": 1,
        "id": site_id,
        "name": config["name"],
        "body": config["body"],
        "source_dem": str(config["dem"]),
        "grid_size": GRID_SIZE,
        "window_m": WINDOW_METRES,
        "center_x_m": center_x,
        "center_y_m": center_y,
        "elevation_min_m": elevation_min,
        "elevation_max_m": elevation_max,
        "slope_scale_deg": SLOPE_SCALE_DEG,
        "roughness_scale_m": ROUGHNESS_SCALE_M,
        "valid_fraction": round(float(np.count_nonzero(valid)) / valid.size, 4),
        "slope_screen_fraction": round(float(np.count_nonzero(safe)) / max(1, np.count_nonzero(valid)), 4),
        "elevation_u8": _quantize(normalized_elevation, 1.0),
        "slope_u8": _quantize(slope, SLOPE_SCALE_DEG),
        "roughness_u8": _quantize(roughness, ROUGHNESS_SCALE_M),
        "valid_mask": valid.astype(np.uint8).ravel().tolist(),
        "slope_screen_mask": safe.astype(np.uint8).ravel().tolist(),
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{site_id}.json"
    output_path.write_text(json.dumps(asset, separators=(",", ":")), encoding="utf-8")
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--grid-size", type=int, default=GRID_SIZE)
    args = parser.parse_args()
    if args.grid_size != GRID_SIZE:
        parser.error("The generated viewer currently expects a 128 × 128 grid")

    gdal.UseExceptions()
    for site_id, config in SITES.items():
        output_path = build_asset(site_id, config, args.output)
        print(f"{site_id}: {output_path} ({output_path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
