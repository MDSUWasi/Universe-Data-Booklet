#!/usr/bin/env bash
# mars_process.sh - slope, roughness and patch analysis for a Mars DEM.
# Refuses to compare across mismatched measurement windows.
set -uo pipefail

BASE="${SPACEAPPS_BASE:-$HOME/spaceapps-2026}"
MDATA="$BASE/data/mars"
OUT="$BASE/output/earth"
ANA="$BASE/output/analysis"
REP="$BASE/output/reports"
mkdir -p "$OUT" "$ANA" "$REP"

GRID="${GRID:-30}"
LAT=18.4
LON=77.6

echo "============================================================"
echo "  MARS PROCESSING"
echo "============================================================"

DEM=$(find "$MDATA" -name '*.tif' -size +1M 2>/dev/null | head -1)
if [ -z "$DEM" ]; then
  echo "  No usable DEM in $MDATA"
  echo "  Run mars_fetch.sh first, or download manually."
  exit 1
fi
echo "  source: $DEM"

# --- validate it is really a raster ----------------------------------
if ! gdalinfo "$DEM" >/dev/null 2>&1; then
  echo "  ERROR: gdalinfo cannot open this file. Not a valid raster."
  head -c 200 "$DEM" | tr -d '\0'; echo
  exit 1
fi

native=$(gdalinfo "$DEM" 2>/dev/null | awk '
  /Pixel Size/ {gsub(/[(),]/,""); print ($3<0?-$3:$3); exit}')
native=${native:-0}
echo "  native pixel size: ${native}"

# --- guard against the scale confound --------------------------------
if awk "BEGIN{exit !($native > 150)}"; then
  echo ""
  echo "  *** SCALE WARNING ***"
  echo "  This DEM is ${native} per pixel. Your Moon and Earth products are"
  echo "  on a 30 m grid, where the 3x3 roughness window spans 90 m."
  echo "  Comparing them directly would repeat the exact error this project"
  echo "  already corrected."
  echo ""
  echo "  Either obtain a finer Mars DTM (CTX at 20 m is ideal), or re-grid"
  echo "  every site. To re-grid everything to this resolution:"
  echo ""
  echo "      GRID=\$(printf '%.0f' $native) $0 --regrid-all"
  echo ""
  exit 2
fi

# --- reproject to a metric Mars grid ---------------------------------
PROJ="+proj=eqc +lat_ts=${LAT} +lat_0=0 +lon_0=${LON} +x_0=0 +y_0=0 +a=3396190 +b=3376200 +units=m +no_defs"
MJOB="$MDATA/mars_${GRID}m.tif"

echo ""
echo "[ reprojecting to Mars equirectangular, ${GRID} m grid ]"
echo "  note: a/b are the IAU Mars ellipsoid axes (3396.19 / 3376.20 km)"
gdalwarp -overwrite -t_srs "$PROJ" -tr "$GRID" "$GRID" -r bilinear \
         -co COMPRESS=LZW -co TILED=YES "$DEM" "$MJOB" 2>&1 | tail -3

[ -f "$MJOB" ] || { echo "  gdalwarp failed"; exit 1; }
echo "  -> $MJOB"

# --- slope and roughness ---------------------------------------------
echo ""
echo "[ computing slope and roughness ]"
gdaldem slope     "$MJOB" "$OUT/mars_slope_${GRID}m.tif"     -alg Horn -compute_edges 2>&1 | tail -1
gdaldem roughness "$MJOB" "$OUT/mars_roughness_${GRID}m.tif" -compute_edges            2>&1 | tail -1

# --- patch analysis --------------------------------------------------
echo ""
echo "[ patch analysis ]"
python3 - "$OUT/mars_slope_${GRID}m.tif" "$OUT/mars_roughness_${GRID}m.tif" \
        "$REP/mars_comparison.txt" << 'PYEOF'
import sys, os
import numpy as np
from osgeo import gdal
from scipy import ndimage
gdal.UseExceptions()

slope_p, rough_p, out_p = sys.argv[1], sys.argv[2], sys.argv[3]
SLOPE_MAX, MIN_KM2, TOP_N = 3.0, 0.05, 5

def load(p):
    ds = gdal.Open(p); b = ds.GetRasterBand(1)
    a = b.ReadAsArray().astype(np.float64)
    nod = b.GetNoDataValue(); gt = ds.GetGeoTransform()
    return a, nod, gt

slope, snod, gt = load(slope_p)
rough, rnod, _  = load(rough_p)
px = abs(gt[1] * gt[5])

valid = np.isfinite(slope) & np.isfinite(rough)
if snod is not None: valid &= (slope != float(snod))
if rnod is not None: valid &= (rough != float(rnod))
valid &= (slope >= 0)

flat = valid & (slope <= SLOPE_MAX)
nv, nf = int(valid.sum()), int(flat.sum())

lab, nl = ndimage.label(flat, structure=np.ones((3,3), np.int8))
counts = np.bincount(lab.ravel()); counts[0] = 0
order = np.argsort(counts)[::-1]

lines = []
def emit(s=""):
    print(s); lines.append(s)

emit("=" * 72)
emit("  MARS PATCH ANALYSIS")
emit("=" * 72)
emit("  slope raster : %s" % os.path.basename(slope_p))
emit("  valid cover  : %.2f%%" % (100.0*nv/flat.size))
emit("  flat (<=3deg): %.3f%% of valid = %.2f km2" % (
    100.0*nf/nv if nv else 0, nf*px/1e6))
emit("  patches      : %d" % nl)
emit("")

rows = []
for idx in order:
    c = int(counts[idx])
    if c == 0: break
    area = c*px/1e6
    if area < MIN_KM2: break
    ys, xs = np.where(lab == idx)
    rv = rough[ys, xs]; sv = slope[ys, xs]
    zf = float((rv <= 0).mean())
    emit("   %d. %9.3f km2 | slope %.2f | rough mean %.3f  p95 %.3f  max %.3f%s"
         % (len(rows)+1, area, sv.mean(), rv.mean(),
            np.percentile(rv,95), rv.max(),
            "  <-- FILLED" if zf > 0.5 else ""))
    rows.append((area, rv.mean(), np.percentile(rv,95), rv.max(), zf))
    if len(rows) >= TOP_N: break

good = [r for r in rows if r[4] <= 0.5]
if good:
    a, rm, p95, mx, _ = good[0]
    emit("")
    emit("  BEST NON-FILLED PATCH")
    emit("    area %.3f km2 | rough mean %.3f  p95 %.3f  max %.3f" % (a, rm, p95, mx))
    emit("")
    emit("  Compare against the 30 m table in output/reports/analog_comparison.txt")
    emit("  Only valid if this raster is also on a 30 m grid.")
else:
    emit("")
    emit("  Every patch was flagged as filled - this DEM may be a hillshade")
    emit("  or a masked product rather than true elevation.")

with open(out_p, "w") as fh:
    fh.write("\n".join(lines) + "\n")
emit("")
emit("  written: %s" % out_p)
PYEOF

echo ""
echo "============================================================"
echo "  MARS PROCESSING COMPLETE"
echo "============================================================"
echo "  grid      : ${GRID} m"
echo "  slope     : $OUT/mars_slope_${GRID}m.tif"
echo "  roughness : $OUT/mars_roughness_${GRID}m.tif"
echo "  report    : $REP/mars_comparison.txt"
echo "============================================================"
