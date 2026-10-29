#!/bin/bash
# ============================================================
#  verify_project.sh
#  Planetary Research 2026 - "Identifying Terrestrial Analogs For
#  Lunar And Martian Bases"  ::  repository auditor
#
#  DOES:    inventories repo, checks every expected file,
#           re-reads raster headers + stats with GDAL,
#           cross-checks numbers against recorded values,
#           flags missing / empty / duplicate / junk files,
#           optionally quarantines junk (NEVER deletes).
#  CANNOT:  invent work that was never done, judge the
#           science, or create an app / frontend / backend.
#
#  USAGE:
#    ./verify_project.sh                  full audit
#    ./verify_project.sh --fast           skip raster statistics
#    ./verify_project.sh --hash           add SHA256 manifest
#    ./verify_project.sh --clean          quarantine junk
#    ./verify_project.sh --clean --yes    no confirmation prompt
# ============================================================

set -u
BASE="${HOME}/spaceapps-2026"
FAST=0; CLEAN=0; HASH=0; YES=0
for a in "$@"; do
  case "$a" in
    --fast)  FAST=1 ;;
    --clean) CLEAN=1 ;;
    --hash)  HASH=1 ;;
    --yes)   YES=1 ;;
    *) printf 'unknown option: %s\n' "$a"; exit 2 ;;
  esac
done

mkdir -p "$BASE"
STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT="${BASE}/audit_report_${STAMP}.txt"
exec > >(tee "$REPORT") 2>&1

PASS=0; WARN=0; FAIL=0
ok()   { printf '  [ OK ]  %s\n' "$1"; PASS=$((PASS+1)); }
warn() { printf '  [WARN]  %s\n' "$1"; WARN=$((WARN+1)); }
bad()  { printf '  [FAIL]  %s\n' "$1"; FAIL=$((FAIL+1)); }
info() { printf '  [info]  %s\n' "$1"; }
hdr()  { printf '\n=== %s ===\n' "$1"; }

need() {
  if [ -f "$1" ]; then ok "$2"; return 0
  else bad "$2 -- MISSING: ${1#$BASE/}"; return 1; fi
}

gsize() { gdalinfo "$1" 2>/dev/null | awk '/^Size is/{gsub(/,/,"",$3); print $3"x"$4; exit}'; }

gstat() { gdalinfo -stats "$1" 2>/dev/null | awk -F= -v k="$2" '$1 ~ k {gsub(/ /,"",$2); print $2; exit}'; }

numclose() {
  local v="$1" e="$2" t="$3" l="$4" r
  r=$(awk -v v="$v" -v e="$e" -v t="$t" 'BEGIN{d=v-e; if(d<0)d=-d; print (d<=t)?"1":"0"}')
  if [ "$r" = "1" ]; then
    ok "$(printf '%s = %.4f (expected %.4f +/- %.4f)' "$l" "$v" "$e" "$t")"
  else
    bad "$(printf '%s = %.4f (expected %.4f +/- %.4f)' "$l" "$v" "$e" "$t")"
  fi
}

printf '############################################################\n'
printf '#  PLANETARY RESEARCH 2026 :: PROJECT AUDIT\n'
printf '#  root   : %s\n' "$BASE"
printf '#  stamp  : %s\n' "$STAMP"
printf '#  mode   : %s\n' "$([ "$FAST" = 1 ] && echo fast || echo full)"
printf '############################################################\n'
[ "$FAST" = "0" ] && info "raster statistics enabled -- first run may take a few minutes"

# ------------------------------------------------------------
hdr "1. ENVIRONMENT"
for t in gdalinfo gdaldem gdalwarp gdal_calc.py ogrinfo ogr2ogr aws bash; do
  if command -v "$t" >/dev/null 2>&1; then ok "found: $t"; else warn "not on PATH: $t"; fi
done
info "GDAL   : $(gdalinfo --version 2>/dev/null)"
info "bash   : ${BASH_VERSION}"
info "disk   : $(df -h "$HOME" | awk 'NR==2{print $4" free of "$2" ("$5" used)"}')"

# ------------------------------------------------------------
hdr "2. REPOSITORY INVENTORY"
if [ -d "$BASE" ]; then ok "project root exists"; else bad "project root missing"; fi
info "total size: $(du -sh "$BASE" 2>/dev/null | cut -f1)"
for d in data data/moon data/earth data/mars output output/maps output/earth \
         output/shapes output/analysis output/generation scripts logs; do
  if [ -d "$BASE/$d" ]; then
    n=$(find "$BASE/$d" -type f 2>/dev/null | wc -l)
    s=$(du -sh "$BASE/$d" 2>/dev/null | cut -f1)
    info "$(printf '%-20s %5s files  %8s' "$d/" "$n" "$s")"
  else
    info "$(printf '%-20s (does not exist)' "$d/")"
  fi
done

# ------------------------------------------------------------
hdr "3. MOON DATA"
MD="$BASE/data/moon"; MM="$BASE/output/maps"
need "$MD/test_southpole.tif"        "lunar south pole DEM (4 m/px)"
need "$MM/southpole_slope.tif"       "lunar slope raster"
need "$MM/southpole_roughness.tif"   "lunar roughness (native 4 m)"
need "$MM/southpole_hillshade.tif"   "lunar hillshade"
need "$MM/southpole_safe_3deg.tif"   "lunar safe mask (<=3 deg)"
need "$MD/moon_30m.tif"              "lunar DEM resampled to 30 m"
need "$MM/moon_rough_30m.tif"        "lunar roughness at 30 m (scale matched)"
need "$BASE/output/shapes/safe_zone_viz.shp" "safe-zone polygons"

sz=$(gsize "$MD/test_southpole.tif")
if [ "$sz" = "16264x16874" ]; then ok "DEM size $sz as expected"
else warn "DEM size $sz (expected 16264x16874)"; fi

sz=$(gsize "$MD/moon_30m.tif")
if [ "$sz" = "2169x2250" ]; then ok "30 m DEM size $sz as expected"
else warn "30 m DEM size $sz (expected 2169x2250)"; fi

if [ -f "$BASE/output/shapes/safe_zone_viz.shp" ]; then
  fc=$(ogrinfo -so "$BASE/output/shapes/safe_zone_viz.shp" safe_zone_viz 2>/dev/null \
       | awk -F': ' '/Feature Count/{print $2; exit}')
  if [ -n "${fc:-}" ]; then info "safe-zone polygon features: $fc"
  else warn "could not read feature count from shapefile"; fi
fi

if [ "$FAST" = "0" ]; then
  v=$(gstat "$MM/southpole_slope.tif" STATISTICS_MAXIMUM)
  numclose "${v:-0}" 67.02 0.05 "lunar slope max (deg)"
  v=$(gstat "$MM/southpole_slope.tif" STATISTICS_MEAN)
  numclose "${v:-0}" 12.27 0.05 "lunar slope mean (deg)"
  v=$(gstat "$MM/southpole_safe_3deg.tif" STATISTICS_VALID_PERCENT)
  numclose "${v:-0}" 1.134 0.050 "safe terrain share of tile (pct)"
else
  info "raster statistics skipped (--fast)"
fi

# ------------------------------------------------------------
hdr "4. EARTH ANALOG DATA"
ED="$BASE/data/earth"; EO="$BASE/output/earth"
need "$ED/Copernicus_DSM_COG_10_S77_00_E162_00_DEM.tif" "McMurdo raw Copernicus tile"
need "$ED/mcmurdo_3031.tif"          "McMurdo reprojected (EPSG:3031)"
need "$EO/mcmurdo_slope.tif"         "McMurdo slope"
need "$EO/mcmurdo_roughness.tif"     "McMurdo roughness"
need "$ED/Copernicus_DSM_COG_10_S49_00_E069_00_DEM.tif" "Kerguelen raw Copernicus tile"
need "$EO/kerguelen_proj.tif"        "Kerguelen reprojected (EPSG:32742)"
need "$EO/kerguelen_slope.tif"       "Kerguelen slope"
need "$EO/kerguelen_roughness.tif"   "Kerguelen roughness"

ax=$(find "$BASE" \( -iname '*axel*' -o -iname '*heiberg*' \) -type f -print 2>/dev/null | head -10)
if [ -n "$ax" ]; then
  ok "Axel Heiberg files present:"
  while read -r f; do printf '            %s\n' "${f#$BASE/}"; done <<< "$ax"
else
  warn "no Axel Heiberg files found (site was analysed earlier -- check it was kept)"
fi

if [ "$FAST" = "0" ]; then
  v=$(gstat "$EO/kerguelen_roughness.tif" STATISTICS_MEAN)
  numclose "${v:-0}" 1.2684 0.02 "Kerguelen whole-tile roughness mean (m)"
fi

# ------------------------------------------------------------
hdr "5. MARS DATA"
mars=$(find "$BASE" \( -iname '*mars*' -o -iname '*mola*' -o -iname '*hirise*' \
       -o -iname '*ctx*' -o -iname '*themis*' \) -print 2>/dev/null | head -20)
if [ -z "$mars" ]; then
  bad "NO MARS DATA FOUND ANYWHERE IN THE REPOSITORY"
  info "the challenge title names Mars; no Mars work was performed."
  info "before ting, either add a Mars section or state clearly"
  info "in the write-up that the study is lunar-only."
else
  ok "Mars-related files found:"
  while read -r f; do printf '            %s\n' "${f#$BASE/}"; done <<< "$mars"
fi

# ------------------------------------------------------------
hdr "6. DOCUMENTS AND SCRIPTS"
for f in moon_southpole_summary.txt lunar_fingerprints.csv final_.txt README.md; do
  if [ -f "$BASE/$f" ]; then ok "document present: $f"; else warn "document missing: $f"; fi
done
shopt -s nullglob
for s in "$BASE"/*.sh "$BASE"/scripts/*.sh; do
  if bash -n "$s" 2>/dev/null; then ok "script parses: ${s#$BASE/}"
  else bad "script has a syntax error: ${s#$BASE/}"; fi
done
shopt -u nullglob

# ------------------------------------------------------------
hdr "7. APPLICATION LAYER (frontend / backend)"
app=$(find "$BASE" \( -name 'package.json' -o -name 'requirements.txt' -o -name 'app.py' \
      -o -name 'index.html' -o -name '*.jsx' -o -name '*.tsx' -o -name 'Dockerfile' \
      -o -name '*.vue' -o -name 'main.go' \) -print 2>/dev/null | head -20)
if [ -z "$app" ]; then
  warn "no frontend or backend artefacts found"
  info "there is no web app, API or UI in this repository."
  info "the deliverable is a data analysis + ranking, not software."
else
  ok "application files found:"
  while read -r f; do printf '            %s\n' "${f#$BASE/}"; done <<< "$app"
fi

# ------------------------------------------------------------
hdr "8. JUNK / DUPLICATE / LEFTOVER SCAN"
JUNK="$(mktemp)"
find "$BASE" -path '*/_quarantine/*' -prune -o -type f \
  \( -name '*.tmp' -o -name '*.part' -o -name '*.crdownload' -o -name '*.download' \
  -o -name '*~' -o -name '.DS_Store' -o -name 'Thumbs.db' -o -name '*.original' \
  -o -name '*.bak' \) -print >> "$JUNK" 2>/dev/null
find "$BASE" -path '*/_quarantine/*' -prune -o -type f -size 0 -print >> "$JUNK" 2>/dev/null
sort -u "$JUNK" -o "$JUNK"
nj=$(wc -l < "$JUNK")
if [ "$nj" -eq 0 ]; then
  ok "no junk files detected"
else
  warn "$nj junk file(s) detected:"
  while read -r f; do
    printf '            %s (%s)\n' "${f#$BASE/}" "$(du -h "$f" 2>/dev/null | cut -f1)"
  done < "$JUNK"
fi

for f in /tmp/top3.shp /tmp/top3.dbf /tmp/top3.shx /tmp/top3_rough.tif /tmp/top3.xyz \
         /tmp/patch_centers.txt /tmp/slope_stats.txt /tmp/rough_stats.txt; do
  [ -e "$f" ] && warn "leftover in /tmp: $f ($(du -h "$f" 2>/dev/null | cut -f1))"
done
if [ -f /tmp/safe_zones.xyz ]; then
  warn "/tmp/safe_zones.xyz still on disk -- the multi-GB dump that filled your disk earlier"
fi
if [ -d "$HOME/~" ]; then
  warn "stray directory \$HOME/~ exists (tilde-expansion bug from an earlier command)"
fi

dups=$(find "$BASE" -path '*/_quarantine/*' -prune -o -type f -size +1M \
       -printf '%s\t%f\n' 2>/dev/null | sort | awk -F'\t' 'p==$0{c++} {p=$0} END{print c+0}')
if [ "$dups" -gt 0 ]; then
  warn "$dups large file(s) share an identical name and byte size (possible duplicates)"
else
  ok "no obvious large duplicates"
fi

# ------------------------------------------------------------
if [ "$HASH" = "1" ]; then
  hdr "9. CHECKSUM MANIFEST"
  MAN="$BASE/manifest_${STAMP}.sha256"
  find "$BASE" -path '*/_quarantine/*' -prune -o -type f -size -50M -print0 2>/dev/null \
    | xargs -0 sha256sum > "$MAN" 2>/dev/null
  ok "manifest written: ${MAN#$BASE/} ($(wc -l < "$MAN") files)"
fi

# ------------------------------------------------------------
if [ "$CLEAN" = "1" ]; then
  hdr "10. QUARANTINE"
  Q="$BASE/_quarantine/$STAMP"
  if [ "$nj" -eq 0 ]; then
    info "nothing to quarantine"
  else
    GO=1
    if [ "$YES" != "1" ]; then
      printf '  Move %s junk file(s) into %s ? [y/N] ' "$nj" "${Q#$BASE/}"
      read -r ans
      case "$ans" in y|Y|yes|YES) ;; *) GO=0 ;; esac
    fi
    if [ "$GO" = "1" ]; then
      mkdir -p "$Q"
      while read -r f; do
        rel="${f#$BASE/}"
        mkdir -p "$Q/$(dirname "$rel")"
        mv "$f" "$Q/$rel" && printf '  moved: %s\n' "$rel"
      done < "$JUNK"
      ok "junk quarantined under ${Q#$BASE/} (nothing was deleted)"
    else
      info "quarantine aborted"
    fi
  fi
fi
rm -f "$JUNK"

# ------------------------------------------------------------
hdr "SUMMARY"
printf '  passed   : %d\n' "$PASS"
printf '  warnings : %d\n' "$WARN"
printf '  failures : %d\n' "$FAIL"
printf '  report   : %s\n' "$REPORT"

RET=0
if [ "$FAIL" -gt 0 ]; then
  printf '\n  RESULT: INCOMPLETE -- %d hard failure(s) above must be resolved.\n' "$FAIL"
  RET=1
elif [ "$WARN" -gt 0 ]; then
  printf '\n  RESULT: COMPLETE WITH CAVEATS -- %d warning(s) above.\n' "$WARN"
else
  printf '\n  RESULT: ALL CHECKS PASSED.\n'
fi
sleep 0.3
exit $RET
