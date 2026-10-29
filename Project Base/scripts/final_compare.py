#!/usr/bin/env python3
"""
final_compare.py - apples-to-apples terrain comparison for Planetary Research 2026.

Every raster is brought to a common 30 m grid first, so gdaldem's 3x3
roughness window spans the same ground distance (90 m) everywhere.
Comparing roughness over 12 m windows (4 m lunar DEM) against 90 m
windows (30 m Earth DEMs) is not a valid comparison; this removes that bias.

Outputs:
  output/reports/analog_comparison.csv
  output/reports/analog_comparison.txt
"""

import os
import sys
import csv
import subprocess

import numpy as np
from osgeo import gdal
from scipy import ndimage

gdal.UseExceptions()

BASE = os.environ.get("SPACEAPPS_BASE", os.path.expanduser("~/spaceapps-2026"))
ANA  = os.path.join(BASE, "output", "analysis")
REP  = os.path.join(BASE, "output", "reports")
os.makedirs(ANA, exist_ok=True)
os.makedirs(REP, exist_ok=True)

SLOPE_MAX     = 3.0     # degrees, landing-safety threshold
MIN_PATCH_KM2 = 0.05    # ignore crumbs smaller than this
TOP_N         = 5


def gdaldem(kind, src, dst):
    """Run gdaldem, returning (ok, message)."""
    cmd = ["gdaldem", kind, src, dst, "-compute_edges"]
    if kind == "slope":
        cmd += ["-alg", "Horn"]
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode == 0, (p.stderr or "").strip()[-300:]


def tile_mean(path):
    """Cheap whole-raster mean of band 1, honouring nodata."""
    if not os.path.exists(path):
        return None
    ds = gdal.Open(path)
    b = ds.GetRasterBand(1)
    a = b.ReadAsArray().astype(np.float64)
    nod = b.GetNoDataValue()
    ds = None
    ok = np.isfinite(a)
    if nod is not None:
        ok &= (a != float(nod))
    return float(a[ok].mean()) if ok.any() else None


def analyse(label, slope_path, rough_path):
    """Patch-level statistics within the <=SLOPE_MAX mask."""
    if not os.path.exists(slope_path):
        return {"label": label, "status": "MISSING slope: %s" % slope_path}
    if not os.path.exists(rough_path):
        return {"label": label, "status": "MISSING roughness: %s" % rough_path}

    sds = gdal.Open(slope_path)
    rds = gdal.Open(rough_path)
    gt = sds.GetGeoTransform()
    px_m2 = abs(gt[1] * gt[5])
    sb, rb = sds.GetRasterBand(1), rds.GetRasterBand(1)
    snod, rnod = sb.GetNoDataValue(), rb.GetNoDataValue()
    slope = sb.ReadAsArray().astype(np.float64)
    rough = rb.ReadAsArray().astype(np.float64)
    sds = None
    rds = None

    valid = np.isfinite(slope) & np.isfinite(rough)
    if snod is not None:
        valid &= (slope != float(snod))
    if rnod is not None:
        valid &= (rough != float(rnod))
    valid &= (slope >= 0.0)

    flat = valid & (slope <= SLOPE_MAX)
    n_valid = int(valid.sum())
    n_flat = int(flat.sum())

    lab, n_lab = ndimage.label(flat, structure=np.ones((3, 3), dtype=np.int8))
    counts = np.bincount(lab.ravel())
    counts[0] = 0
    order = np.argsort(counts)[::-1]

    patches = []
    for idx in order:
        c = int(counts[idx])
        if c == 0:
            break
        area = c * px_m2 / 1e6
        if area < MIN_PATCH_KM2:
            break                       # descending order, safe to stop
        ys, xs = np.where(lab == idx)
        rv = rough[ys, xs]
        sv = slope[ys, xs]
        cx = gt[0] + (xs.mean() + 0.5) * gt[1]
        cy = gt[3] + (ys.mean() + 0.5) * gt[5]
        zero_frac = float((rv <= 0.0).mean())
        patches.append({
            "area_km2":   round(float(area), 4),
            "cx":         round(float(cx), 1),
            "cy":         round(float(cy), 1),
            "slope_mean": round(float(sv.mean()), 3),
            "r_mean":     round(float(rv.mean()), 4),
            "r_med":      round(float(np.median(rv)), 4),
            "r_p95":      round(float(np.percentile(rv, 95)), 4),
            "r_max":      round(float(rv.max()), 4),
            "zero_frac":  round(zero_frac, 4),
            "filled":     bool(zero_frac > 0.5),
        })
        if len(patches) >= TOP_N:
            break

    return {
        "label": label,
        "status": "ok",
        "valid_pct": round(100.0 * n_valid / flat.size, 2),
        "flat_pct_of_valid": round(100.0 * n_flat / n_valid, 3) if n_valid else 0.0,
        "flat_km2": round(n_flat * px_m2 / 1e6, 2),
        "n_patches": int(n_lab),
        "patches": patches,
    }


def main():
    lines = []

    def emit(s=""):
        print(s)
        lines.append(s)

    emit("=" * 74)
    emit("  FINAL TERRAIN COMPARISON")
    emit("  common 30 m grid  |  3x3 roughness window = 90 m everywhere")
    emit("  slope threshold   : <= %.1f deg" % SLOPE_MAX)
    emit("=" * 74)

    # ---- Moon: rebuild 30 m products so everything is internally consistent
    moon_dem = os.path.join(BASE, "data/moon/moon_30m.tif")
    moon_slope = os.path.join(ANA, "moon_slope_30m.tif")
    moon_rough = os.path.join(ANA, "moon_roughness_30m.tif")

    emit("")
    emit("[ Moon 30 m products ]")
    if os.path.exists(moon_dem):
        for kind, dst in (("slope", moon_slope), ("roughness", moon_rough)):
            if os.path.exists(dst):
                emit("   reuse  %s" % os.path.basename(dst))
            else:
                ok, msg = gdaldem(kind, moon_dem, dst)
                emit("   build  %s  -> %s" % (os.path.basename(dst), "ok" if ok else msg))
    else:
        emit("   !! %s not found - Moon will be skipped" % moon_dem)

    # ---- old vs new roughness, to expose any resampling artefact
    old = os.path.join(BASE, "output/maps/moon_roughness_30m.tif")
    m_old, m_new = tile_mean(old), tile_mean(moon_rough)
    emit("")
    emit("[ Consistency check - Moon roughness, whole tile ]")
    emit("   existing output/maps/moon_roughness_30m.tif : %s" %
         ("%.3f m" % m_old if m_old is not None else "absent"))
    emit("   rebuilt  output/analysis/moon_roughness_30m.tif : %s" %
         ("%.3f m" % m_new if m_new is not None else "absent"))
    if m_old is not None and m_new is not None:
        d = abs(m_old - m_new) / max(m_new, 1e-9) * 100.0
        emit("   difference: %.1f%%  %s" % (
            d, "<- INVESTIGATE" if d > 5.0 else "(consistent)"))

    # ---- site list
    sites = [("Moon South Pole", moon_slope, moon_rough)]
    for label, key in (("McMurdo Dry Valleys", "mcmurdo"),
                       ("Kerguelen Islands", "kerguelen"),
                       ("Axel Heiberg Island", "axel_heiberg")):
        sites.append((label,
                      os.path.join(BASE, "output/earth/%s_slope.tif" % key),
                      os.path.join(BASE, "output/earth/%s_roughness.tif" % key)))

    results = []
    for label, sp, rp in sites:
        emit("")
        emit("[ analysing %s ]" % label)
        try:
            r = analyse(label, sp, rp)
        except Exception as exc:
            r = {"label": label, "status": "ERROR: %s" % exc}
        results.append(r)
        if r.get("status") != "ok":
            emit("   %s" % r.get("status"))
            continue
        emit("   valid coverage   : %.2f%%" % r["valid_pct"])
        emit("   flat (<=3 deg)   : %.3f%% of valid = %.2f km2" %
             (r["flat_pct_of_valid"], r["flat_km2"]))
        emit("   contiguous patches: %d" % r["n_patches"])
        for i, p in enumerate(r["patches"], 1):
            tag = "  <-- FILLED (water/ice)" if p["filled"] else ""
            emit("     %d. %8.3f km2 | slope %.2f | rough mean %.3f  p95 %.3f  max %.3f%s"
                 % (i, p["area_km2"], p["slope_mean"],
                    p["r_mean"], p["r_p95"], p["r_max"], tag))

    # ---- comparison table, best non-filled patch per site
    emit("")
    emit("=" * 74)
    emit("  COMPARISON - best non-filled contiguous patch, all at 90 m window")
    emit("=" * 74)
    emit("%-26s %10s %9s %9s %9s" %
         ("site", "area km2", "r_mean", "r_p95", "r_max"))
    emit("-" * 74)
    rows = []
    for r in results:
        if r.get("status") != "ok":
            emit("%-26s %10s" % (r["label"], "n/a"))
            continue
        good = [p for p in r["patches"] if not p["filled"]]
        if not good:
            emit("%-26s %10s" % (r["label"], "all filled"))
            continue
        best = good[0]
        emit("%-26s %10.3f %9.3f %9.3f %9.3f" %
             (r["label"], best["area_km2"], best["r_mean"],
              best["r_p95"], best["r_max"]))
        rows.append({"site": r["label"], **best})

    if rows:
        ref = next((x for x in rows if x["site"].startswith("Moon")), None)
        if ref:
            emit("")
            emit("  ratio vs Moon (r_mean):")
            for x in rows:
                if x is ref:
                    continue
                emit("    %-24s %.2fx %s" %
                     (x["site"], ref["r_mean"] / max(x["r_mean"], 1e-9),
                      "rougher than Moon" if ref["r_mean"] > x["r_mean"]
                      else "smoother than Moon"))

    emit("")
    emit("  NOTE: ratios compare the best non-filled patch per site. They are")
    emit("  not a site-wide average and should be described as such in any write-up.")

    # ---- write outputs
    csv_path = os.path.join(REP, "analog_comparison.csv")
    with open(csv_path, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["site", "area_km2", "centre_x", "centre_y", "slope_mean_deg",
                    "rough_mean_m", "rough_p95_m", "rough_max_m", "zero_frac", "filled"])
        for r in results:
            if r.get("status") != "ok":
                continue
            for p in r["patches"]:
                w.writerow([r["label"], p["area_km2"], p["cx"], p["cy"],
                            p["slope_mean"], p["r_mean"], p["r_p95"],
                            p["r_max"], p["zero_frac"], p["filled"]])

    txt_path = os.path.join(REP, "analog_comparison.txt")
    with open(txt_path, "w") as fh:
        fh.write("\n".join(lines) + "\n")

    emit("")
    emit("  csv  : %s" % csv_path)
    emit("  text : %s" % txt_path)


if __name__ == "__main__":
    main()
