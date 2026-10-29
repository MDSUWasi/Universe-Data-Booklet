#!/usr/bin/env bash
# reorganize.sh - tidy the Planetary Research repo and write data_source.md
BASE="${SPACEAPPS_BASE:-$HOME/spaceapps-2026}"
STAMP="$(date +%Y%m%d_%H%M%S)"
NOW="$(date '+%Y-%m-%d %H:%M %Z')"
DEST="$HOME/Documents/spaceapps-2026-archive-$STAMP"
APPLY=0
[ "${1:-}" = "--apply" ] && APPLY=1
[ -d "$BASE" ] || { echo "ERROR: no repo at $BASE"; exit 1; }
cd "$BASE" || exit 1
MANIFEST="$BASE/.manifest_$STAMP"
keep() {
  case "$1" in
    data/moon/test_southpole.tif)     return 0 ;;
    data/moon/moon_30m.tif)           return 0 ;;
    data/earth/*)                     return 0 ;;
    output/analysis/*)                return 0 ;;
    output/reports/*)                 return 0 ;;
    output/shapes/*)                  return 0 ;;
    output/earth/*)                   return 0 ;;
    output/maps/southpole_slope.tif)      return 0 ;;
    output/maps/southpole_hillshade.tif)  return 0 ;;
    output/maps/southpole_roughness.tif)  return 0 ;;
    output/maps/southpole_safe_3deg.tif)  return 0 ;;
    scripts/earth_site.sh)            return 0 ;;
    scripts/spaceapps_audit.sh)       return 0 ;;
    scripts/final_compare.py)         return 0 ;;
    scripts/reorganize.sh)            return 0 ;;
    verify_project.sh)                return 0 ;;
    lunar_fingerprints.csv)           return 0 ;;
    moon_southpole_summary.txt)       return 0 ;;
    data_source.md)                   return 0 ;;
    README.md)                        return 0 ;;
    .gitignore)                       return 0 ;;
    .git|.git/*)                      return 0 ;;
    docs|docs/*)                      return 0 ;;
    logs|logs/*)                      return 0 ;;
    qgis|qgis/*)                      return 0 ;;
    *)                                return 1 ;;
  esac
}
echo "============================================================"
echo "  REPO REORGANISE  -  $NOW"
echo "  repo   : $BASE"
echo "  archive: $DEST"
echo "  mode   : $([ $APPLY -eq 1 ] && echo APPLY || echo PREVIEW)"
echo "============================================================"
: > "$MANIFEST"
n_keep=0; n_move=0; moved_bytes=0
while IFS= read -r -d '' f; do
  rel="${f#./}"
  if keep "$rel"; then
    n_keep=$((n_keep+1))
  else
    n_move=$((n_move+1))
    sz=$(stat -c%s "$f" 2>/dev/null || echo 0)
    moved_bytes=$((moved_bytes+sz))
    printf '%s\n' "$rel" >> "$MANIFEST"
  fi
done < <(find . -type f -not -path './.git/*' -not -name '.manifest_*' -print0)
echo ""
echo "  files kept    : $n_keep"
echo "  files to move : $n_move  ($((moved_bytes/1024/1024)) MB)"
echo ""
echo "  --- to be archived ---"
while IFS= read -r rel; do
  printf '    %s\n' "$rel"
done < "$MANIFEST"
if [ "$APPLY" -eq 0 ]; then
  echo ""
  echo "  PREVIEW ONLY - nothing changed."
  echo "  Re-run with --apply to perform the move."
  rm -f "$MANIFEST"
  exit 0
fi
echo ""
echo "  moving..."
mkdir -p "$DEST"
while IFS= read -r rel; do
  [ -e "$rel" ] || continue
  mkdir -p "$DEST/$(dirname "$rel")"
  if mv "$rel" "$DEST/$rel" 2>/dev/null; then
    printf '    moved  %s\n' "$rel"
  else
    printf '    FAILED %s\n' "$rel"
  fi
done < "$MANIFEST"
cp "$MANIFEST" "$DEST/MANIFEST.txt" 2>/dev/null
rm -f "$MANIFEST"
printf '%s\n' \
  '#!/usr/bin/env bash' \
  "DEST=\"$DEST\"" \
  "BASE=\"$BASE\"" \
  'cd "$DEST" || exit 1' \
  'find . -mindepth 1 -not -name UNDO.sh -not -name MANIFEST.txt -print0 | while IFS= read -r -d "" f; do' \
  '  rel="${f#./}"' \
  '  mkdir -p "$BASE/$(dirname "$rel")"' \
  '  mv -f "$f" "$BASE/$rel"' \
  'done' \
  'echo "Restored to $BASE"' \
  > "$DEST/UNDO.sh"
chmod +x "$DEST/UNDO.sh"
probe() {
  [ -f "$1" ] || { echo "  (absent)"; return; }
  gdalinfo -json "$1" 2>/dev/null | python3 -c '
import json,sys
try: d=json.load(sys.stdin)
except Exception: print("  (unreadable)"); raise SystemExit
sz=d.get("size",[0,0]); gt=d.get("geoTransform",[0,0,0,0,0,0])
b=d.get("bands",[{}])[0]
crs=(d.get("coordinateSystem") or {}).get("wkt","")
units="deg" if "GEOGCRS" in crs else "m"
print("  %d x %d px | %.4f %s/px | %s | nodata=%s" % (
  sz[0], sz[1], abs(gt[1]), units, b.get("type","?"), b.get("noDataValue","none")))
'
}
{
  echo "# Data Sources - Planetary Research 2026"
  echo ""
  echo "**Project:** Identifying Terrestrial Analogs for Lunar and Martian Bases"
  echo "**Repository:** \`$BASE\`"
  echo "**Generated:** $NOW"
  echo ""
  echo "## Summary"
  echo ""
  echo "| # | Dataset | Role | Access | Licence |"
  echo "|---|---|---|---|---|"
  echo "| 1 | LRO South Pole DEM (USGS Astrogeology) | Lunar terrain | Open, no login | USGS/NASA public domain |"
  echo "| 2 | Copernicus DEM GLO-30 (ESA/Airbus via AWS) | Earth terrain | Open, no login | Free, attribution required |"
  echo "| 3 | Slope and roughness rasters | Analysis | Computed locally | Inherit source terms |"
  echo ""
  echo "No commercial, restricted or paid dataset was used anywhere in this project."
  echo ""
  echo "---"
  echo ""
  echo "## 1. Lunar terrain"
  echo ""
  echo "- **Product:** Moon LRO South Pole DEM"
  echo "- **Provider:** USGS Astrogeology Science Center, Astropedia"
  echo "- **URL:** https://astrogeology.usgs.gov/search/map/moon_lro_south_pole_dem"
  echo "- **Collection method:** direct HTTPS download from the product page. No account, no credentials, no approval step."
  echo "- **Underlying instruments:** Lunar Reconnaissance Orbiter - LROC stereo imagery and LOLA laser altimetry"
  echo "- **Licence:** USGS / NASA. Public domain. No registration or attribution required; citation is good practice."
  echo ""
  echo "**Local file:** \`data/moon/test_southpole.tif\`"
  echo ""
  echo "\`\`\`"
  probe "$BASE/data/moon/test_southpole.tif"
  echo "\`\`\`"
  echo ""
  echo "**Derived:** \`data/moon/moon_30m.tif\` - resampled to a 30 m grid with"
  echo "\`gdalwarp -tr 30 30 -r average\`, so that roughness is measured over the same"
  echo "ground distance as the Earth data."
  echo ""
  echo "---"
  echo ""
  echo "## 2. Earth terrain"
  echo ""
  echo "- **Product:** Copernicus DEM GLO-30 (COP-DEM_GLO-30-DGED)"
  echo "- **Provider:** ESA / Airbus, distributed through the AWS Open Data programme"
  echo "- **Bucket:** \`s3://copernicus-dem-30m/\` (region \`eu-central-1\`)"
  echo "- **Registry:** https://registry.opendata.aws/copernicus-dem/"
  echo "- **Readme:** https://copernicus-dem-30m.s3.amazonaws.com/readme.html"
  echo "- **Collection method:** anonymous S3 copy, \`aws s3 cp --no-sign-request\`. No credentials required."
  echo "- **Licence:** free and open, including commercial use, with attribution to ESA / Copernicus."
  echo ""
  echo "**Tiles retrieved:**"
  echo ""
  echo "| Site | S3 prefix | Local file |"
  echo "|---|---|---|"
  echo "| McMurdo Dry Valleys, Antarctica | \`Copernicus_DSM_COG_10_S77_00_E162_00_DEM\` | \`data/earth/Copernicus_DSM_COG_10_S77_00_E162_00_DEM.tif\` |"
  echo "| Kerguelen Islands, sub-Antarctic | \`Copernicus_DSM_COG_10_S49_00_E069_00_DEM\` | \`data/earth/kerguelen/Copernicus_DSM_COG_10_S49_00_E069_00_DEM.tif\` |"
  echo "| Axel Heiberg Island, Canadian Arctic | \`Copernicus_DSM_COG_10_N79_00_W090_00_DEM\` | \`data/earth/axel_heiberg/Copernicus_DSM_COG_10_N79_00_W090_00_DEM.tif\` |"
  echo ""
  echo "**Projection used for analysis:** each tile was reprojected to metres before"
  echo "any slope calculation."
  echo ""
  echo "| Site | EPSG | Projection |"
  echo "|---|---|---|"
  echo "| McMurdo | 3031 | Antarctic Polar Stereographic |"
  echo "| Axel Heiberg | 3413 | Arctic Polar Stereographic |"
  echo "| Kerguelen | 32742 | UTM zone 42S |"
  echo ""
  echo "---"
  echo ""
  echo "## 3. Derived products"
  echo ""
  echo "All slope and roughness rasters were computed locally from the DEMs above:"
  echo ""
  echo "\`\`\`"
  echo "gdaldem slope     <dem> <out> -alg Horn -compute_edges"
  echo "gdaldem roughness <dem> <out> -compute_edges"
  echo "\`\`\`"
  echo ""
  echo "**Known data-quality caveat:** the Copernicus DEM fills water bodies and"
  echo "implausible surfaces with flat values. Large contiguous patches with a"
  echo "roughness of exactly zero are filled surfaces, not terrain."
  echo ""
  echo "---"
  echo ""
  echo "## 4. Accounts registered but not used for data retrieval"
  echo ""
  echo "**NASA Earthdata** (https://urs.earthdata.nasa.gov) - account created and applications"
  echo "authorised. No data was downloaded through this account for the current analysis."
  echo ""
  echo "---"
  echo ""
  echo "## 5. Not yet incorporated"
  echo ""
  echo "- Thermal / illumination data for the lunar South Pole"
  echo "- Volatile (water ice) products"
  echo "- Mars terrain data"
  echo ""
  echo "---"
  echo ""
  echo "## 6. Reproducibility"
  echo ""
  echo "Every product in this repository can be regenerated from the two open sources"
  echo "listed above, using only GDAL and Python."
} > "$BASE/data_source.md"
echo ""
echo "============================================================"
echo "  DONE"
echo "============================================================"
echo "  kept in repo : $n_keep files"
echo "  archived     : $n_move files"
echo "  archive dir  : $DEST"
echo "  undo         : bash $DEST/UNDO.sh"
echo "  data_source  : $BASE/data_source.md"
echo "============================================================"
