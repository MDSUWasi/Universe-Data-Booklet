#!/bin/bash
# Usage: ./earth_site.sh <site_name> <input_dem.tif> <epsg_code>
set -e

SITE="$1"; DEM="$2"; EPSG="$3"
BASE="$HOME/spaceapps-2026"
WORK="$BASE/data/earth"; OUT="$BASE/output/earth"
mkdir -p "$OUT"

PROJ="$WORK/${SITE}_epsg${EPSG}.tif"

echo "=== $SITE (EPSG:$EPSG) ==="
echo "[1/4] reprojecting to metres..."
gdalwarp -t_srs "EPSG:$EPSG" -tr 30 30 -r bilinear -co COMPRESS=LZW \
  -overwrite "$DEM" "$PROJ" 2>&1 | tail -1

echo "[2/4] slope..."
gdaldem slope "$PROJ" "$OUT/${SITE}_slope.tif" -alg Horn -compute_edges 2>&1 | tail -1

echo "[3/4] roughness..."
gdaldem roughness "$PROJ" "$OUT/${SITE}_roughness.tif" -compute_edges 2>&1 | tail -1

echo "[4/4] patch analysis..."
python3 - "$SITE" "$OUT/${SITE}_slope.tif" "$OUT/${SITE}_roughness.tif" << 'PY'
import sys
from osgeo import gdal
import numpy as np
from scipy import ndimage
gdal.UseExceptions()

site, sf, rf = sys.argv[1], sys.argv[2], sys.argv[3]
sds = gdal.Open(sf); rds = gdal.Open(rf)
gt  = sds.GetGeoTransform()
slope = sds.GetRasterBand(1).ReadAsArray()
rough = rds.GetRasterBand(1).ReadAsArray()
px = abs(gt[1]*gt[5])

mask = (slope >= 0) & (slope <= 3)
print("  flat (<=3 deg): %.2f%%  = %.1f km2" % (100*mask.mean(), mask.sum()*px/1e6))

lab, n = ndimage.label(mask)
counts = np.bincount(lab.ravel()); counts[0] = 0
top = np.argsort(counts)[::-1][:5]
print("  patches: %d" % n)
for i, idx in enumerate(top, 1):
    sel = (lab == idx)
    rv = rough[sel]; rv = rv[np.isfinite(rv)]
    flag = "  <-- SUSPECT (all-zero)" if rv.max() == 0 else ""
    print("  %d. %.3f km2 | rough mean %.2f  p95 %.2f  max %.2f%s"
          % (i, counts[idx]*px/1e6, rv.mean(), np.percentile(rv,95), rv.max(), flag))
PY
echo "  -> $OUT/${SITE}_slope.tif"
