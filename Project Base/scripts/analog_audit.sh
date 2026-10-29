#!/usr/bin/env bash
# spaceapps_audit.sh - inventory, integrity check, junk report for the Planetary Research repo.
#
#   ./spaceapps_audit.sh           report only  (nothing is touched)
#   ./spaceapps_audit.sh --clean   also MOVE junk into _quarantine_<stamp>/
#
# Nothing is ever deleted. Undo a cleanup with:
#   cd ~/spaceapps-2026 && cp -r _quarantine_<stamp>/* .

BASE="${SPACEAPPS_BASE:-$HOME/spaceapps-2026}"
STAMP="$(date +%Y%m%d_%H%M%S)"

MODE="report"
case "${1:-}" in
  --clean|-c) MODE="clean" ;;
  "")         ;;
  *) echo "Unknown option: $1   (use --clean, or no argument for report-only)"; exit 2 ;;
esac

if [ ! -d "$BASE" ]; then
  echo "ERROR: repo not found at $BASE"
  echo "Override with:  SPACEAPPS_BASE=/path/to/repo $0"
  exit 1
fi
cd "$BASE" || exit 1

TXT="$BASE/audit_report_$STAMP.txt"
HTML="$BASE/audit_report_$STAMP.html"
QUAR="$BASE/_quarantine_$STAMP"
JUNKLIST="$BASE/.junklist_$STAMP"

: > "$TXT"
out() { printf '%s\n' "$*" | tee -a "$TXT"; }
hr()  { out "------------------------------------------------------------"; }
sec() { out ""; hr; out "  $*"; hr; }
sz()  { du -sh "$1" 2>/dev/null | cut -f1; }

# ============================================================
sec "PLANETARY RESEARCH 2026 - REPOSITORY AUDIT"
out "  date  : $(date)"
out "  repo  : $BASE"
out "  mode  : $MODE"
if [ "$MODE" = "report" ]; then
  out "  note  : report only - nothing will be changed"
else
  out "  note  : CLEAN mode - junk will be MOVED, not deleted"
fi

# ============================================================
sec "1. REPOSITORY OVERVIEW"
out "  total files : $(find "$BASE" -type f -not -path "$BASE/.git/*" 2>/dev/null | wc -l)"
out "  total size  : $(sz "$BASE")"
out ""
out "  directory layout (depth 2):"
find "$BASE" -maxdepth 2 -type d -not -path "$BASE/.git*" 2>/dev/null \
  | sed "s|$BASE|.|" | sort | sed 's/^/    /' | tee -a "$TXT"

# ============================================================
sec "2. REQUIRED ARTEFACTS"
REQUIRED=(
  "data/moon/test_southpole.tif"
  "output/maps/southpole_slope.tif"
  "output/maps/southpole_hillshade.tif"
  "output/maps/southpole_roughness.tif"
  "output/maps/southpole_safe_3deg.tif"
  "output/shapes/safe_zone_viz.shp"
  "output/shapes/safe_zone_viz.dbf"
  "output/shapes/safe_zone_viz.prj"
  "data/moon/moon_30m.tif"
  "output/maps/moon_roughness_30m.tif"
  "scripts/earth_site.sh"
)
miss_req=0
for f in "${REQUIRED[@]}"; do
  if [ -e "$BASE/$f" ]; then
    out "  [ OK ]  $f"
  else
    out "  [MISS]  $f"
    miss_req=$((miss_req+1))
  fi
done
out ""
out "  missing required: $miss_req of ${#REQUIRED[@]}"

OPTIONAL=(
  "output/maps/southpole_safe_5deg.tif"
  "data/earth/mcmurdo_3031.tif"
  "output/earth/mcmurdo_slope.tif"
  "output/earth/mcmurdo_roughness.tif"
  "data/earth/kerguelen/Copernicus_DSM_COG_10_S49_00_E069_00_DEM.tif"
  "output/earth/kerguelen_slope.tif"
  "output/earth/kerguelen_roughness.tif"
  "data/earth/axel_heiberg"
  "lunar_fingerprints.csv"
  "moon_southpole_summary.txt"
  "project_log.txt"
)
out ""
out "  optional / expected-but-unconfirmed:"
for f in "${OPTIONAL[@]}"; do
  if [ -e "$BASE/$f" ]; then out "  [ OK ]  $f"; else out "  [ -- ]  $f"; fi
done

# ============================================================
sec "3. SCRIPT SYNTAX CHECK  (bash -n)"
nsh=0; nbad=0
while IFS= read -r s; do
  nsh=$((nsh+1))
  if err=$(bash -n "$s" 2>&1); then
    out "  [ OK ]     ${s#$BASE/}"
  else
    nbad=$((nbad+1))
    out "  [ BROKEN ] ${s#$BASE/}"
    printf '%s\n' "$err" | sed 's/^/               /' | tee -a "$TXT"
  fi
done < <(find "$BASE" -name '*.sh' -not -path "$BASE/.git/*" -not -path "$QUAR/*" 2>/dev/null | sort)
out ""
out "  $nsh script(s) scanned, $nbad broken"

# ============================================================
sec "4. PYTHON ENVIRONMENT"
PY="$(command -v python3 2>/dev/null)"
if [ -z "$PY" ]; then
  out "  python3 NOT FOUND on PATH"
else
  out "  interpreter : $PY"
  out "  version     : $("$PY" -V 2>&1)"
  for mod in numpy scipy osgeo; do
    if "$PY" -c "import $mod" >/dev/null 2>&1; then
      out "  $mod : OK"
    else
      out "  $mod : MISSING"
    fi
  done
  out ""
  out "  reminder: the GDAL python binding is imported as 'from osgeo import gdal'."
  out "            'import gdal' is a different, unrelated package and will fail."
fi

# ============================================================
sec "5. RASTER SANITY CHECK  (filled-surface artefacts)"
if command -v gdalinfo >/dev/null 2>&1; then
  out "  gdalinfo : $(gdalinfo --version 2>&1)"
  out ""
  nrast=0; nsusp=0
  while IFS= read -r r; do
    nrast=$((nrast+1))
    info=$(gdalinfo -approx_stats "$r" 2>/dev/null)
    mx=$(printf '%s\n' "$info" | grep 'STATISTICS_MAXIMUM' | cut -d= -f2)
    mn=$(printf '%s\n' "$info" | grep 'STATISTICS_MEAN'    | cut -d= -f2)
    vp=$(printf '%s\n' "$info" | grep 'STATISTICS_VALID_PERCENT' | cut -d= -f2)
    [ -z "$mx" ] && mx="?"
    flag=""
    case "$mx" in
      0|0.0|0.00|0.000) flag="  <-- SUSPECT: all-zero, likely filled water/ice"; nsusp=$((nsusp+1)) ;;
    esac
    out "  ${r#$BASE/}"
    out "      max=$mx  mean=$mn  valid=${vp}%$flag"
  done < <(find "$BASE/output" -name '*roughness*.tif' 2>/dev/null | sort)
  out ""
  out "  $nrast roughness raster(s) checked, $nsusp flagged"
else
  out "  gdalinfo not available - skipped"
fi

# ============================================================
sec "6. CHALLENGE COVERAGE"
out "  checklist derived from the challenge title and public description:"
out "  'Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars'"
out "  Paste the exact challenge text to refine this list."
out ""
CHECKS=(
  "Lunar candidate sites quantified|output/shapes/safe_zone_viz.shp"
  "Lunar slope metric|output/maps/southpole_slope.tif"
  "Lunar roughness metric|output/maps/moon_roughness_30m.tif"
  "Earth analog DEM downloaded|data/earth"
  "Earth slope/roughness computed|output/earth"
  "Written summary / report|moon_southpole_summary.txt"
  "Version control in use|.git"
  "Temperature / illumination dimension|output/thermal"
  "Ice / volatile dimension|output/ice"
  "Mars site analysis|output/mars"
)
nok=0; ntot=0
for c in "${CHECKS[@]}"; do
  label="${c%%|*}"; path="${c##*|}"
  ntot=$((ntot+1))
  if [ -e "$BASE/$path" ]; then
    out "  [ HAVE ]  $label"
    nok=$((nok+1))
  else
    out "  [ GAP  ]  $label"
  fi
done
out ""
out "  coverage: $nok of $ntot"

# ============================================================
sec "7. JUNK INVENTORY"
: > "$JUNKLIST"
find "$BASE" -type f \
  \( -name '*.xyz' -o -name '*.tmp' -o -name '*.bak' -o -name '*~' \
     -o -name '*.swp' -o -name '.DS_Store' -o -name '*.pyc' \
     -o -name '*.sh.original' -o -name '*.sh.new' \) \
  -not -path "$BASE/.git/*" -not -path "$QUAR/*" \
  -not -name "audit_report_*" -not -name ".junklist_*" \
  -print0 >> "$JUNKLIST" 2>/dev/null

find "$BASE" -type d \
  \( -name 'PREVIEW' -o -name 'AUXFILES' -o -name 'INFO' \) \
  -not -path "$BASE/.git/*" -not -path "$QUAR/*" \
  -print0 >> "$JUNKLIST" 2>/dev/null

find "$BASE" -type f -empty \
  -not -path "$BASE/.git/*" -not -path "$QUAR/*" \
  -not -name "audit_report_*" -not -name ".junklist_*" \
  -print0 >> "$JUNKLIST" 2>/dev/null

njunk=$(tr -cd '\0' < "$JUNKLIST" | wc -c)
if [ "$njunk" -eq 0 ]; then
  out "  no junk found"
else
  out "  $njunk item(s) flagged:"
  while IFS= read -r -d '' j; do
    if [ -d "$j" ]; then
      out "    [dir ]  ${j#$BASE/}   ($(sz "$j"))"
    elif [ ! -s "$j" ]; then
      out "    [0byte] ${j#$BASE/}"
    else
      out "    [file]  ${j#$BASE/}   ($(sz "$j"))"
    fi
  done < "$JUNKLIST"
fi

out ""
out "  leftovers outside the repo:"
for f in /tmp/safe_zones.xyz /tmp/slope_stats.txt /tmp/rough_stats.txt; do
  if [ -e "$f" ]; then out "    present  $f  ($(sz "$f"))"; else out "    absent   $f"; fi
done

# ============================================================
if [ "$MODE" = "clean" ]; then
  sec "8. CLEANUP"
  if [ "$njunk" -eq 0 ]; then
    out "  nothing to move"
  else
    mkdir -p "$QUAR"
    moved=0
    while IFS= read -r -d '' item; do
      [ -e "$item" ] || continue
      rel="${item#$BASE/}"
      dest="$QUAR/$rel"
      mkdir -p "$(dirname "$dest")"
      if mv "$item" "$dest" 2>/dev/null; then
        out "  moved: $rel"
        moved=$((moved+1))
      else
        out "  FAILED to move: $rel"
      fi
    done < "$JUNKLIST"
    out ""
    out "  moved $moved item(s) to:"
    out "    $QUAR"
    out ""
    out "  inspect : ls -R $QUAR"
    out "  undo    : cd $BASE && cp -r _quarantine_$STAMP/* ."
    out "  purge   : rm -rf $QUAR"
  fi
fi

# ============================================================
sec "SUMMARY"
out "  required missing : $miss_req"
out "  broken scripts   : $nbad"
out "  challenge gaps   : $((ntot-nok)) of $ntot"
out "  junk items       : $njunk"
out ""
out "  text report : $TXT"
out "  html report : $HTML"
if [ "$MODE" = "clean" ]; then out "  quarantine  : $QUAR"; fi

# ---------- build HTML ----------
{
  printf '<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8">\n'
  printf '<title>Planetary Research Audit %s</title>\n' "$STAMP"
  printf '<style>body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#151119;color:#e9e5f2;margin:0;padding:28px;line-height:1.55}h1{color:#6d4aff;margin-top:0}pre{white-space:pre-wrap;word-break:break-word;font-size:13px}</style>\n'
  printf '</head><body><h1>Planetary Research Repo Audit &mdash; %s</h1><pre>\n' "$STAMP"
  sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' "$TXT"
  printf '</pre></body></html>\n'
} > "$HTML"

rm -f "$JUNKLIST"
exit 0
