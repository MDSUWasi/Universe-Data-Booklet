#!/usr/bin/env bash
# cleanup.sh - remove broken scripts, archive superseded ones.
# Nothing is deleted outright except files proven to be fabricated or corrupt.
set -uo pipefail

BASE="${SPACEAPPS_BASE:-$HOME/spaceapps-2026}"
STAMP="$(date +%Y%m%d_%H%M%S)"
ARCH="$HOME/Documents/spaceapps-superseded-$STAMP"
cd "$BASE" || exit 1

echo "============================================================"
echo "  CLEANUP"
echo "  archive: $ARCH"
echo "============================================================"
mkdir -p "$ARCH/scripts"

# --- DELETE: fabricated content, must never be committed -------------
echo ""
echo "[ removing fabricated / corrupt files ]"
for bad in scripts/fetch_mars_data.sh; do
  if [ -e "$bad" ]; then
    echo "  DELETED  $bad   (contained invented URLs)"
    rm -f "$bad"
  fi
done

# --- ARCHIVE: superseded but historically useful ---------------------
echo ""
echo "[ archiving superseded scripts ]"
for old in scripts/mars_fetch.sh scripts/analyze_earth.sh \
           scripts/analog_comparator.sh scripts/search_earth.sh \
           scripts/reorganize.sh; do
  if [ -e "$old" ]; then
    mv "$old" "$ARCH/scripts/" 2>/dev/null && echo "  archived $old"
  fi
done

# --- housekeeping ----------------------------------------------------
echo ""
echo "[ housekeeping ]"
find . -name '__pycache__' -type d -not -path './.git/*' -exec rm -rf {} + 2>/dev/null
find . -name '*.aux.xml' -type f -not -path './.git/*' -delete 2>/dev/null
find . -name '*.pyc' -type f -delete 2>/dev/null
find . -name '.manifest_*' -type f -delete 2>/dev/null
echo "  cleared __pycache__, *.aux.xml, *.pyc, .manifest_*"

# --- stale audit reports ---------------------------------------------
for f in audit_report_*.txt audit_report_*.html; do
  [ -e "$f" ] && mv "$f" "$ARCH/" 2>/dev/null && echo "  archived $f"
done

echo ""
echo "============================================================"
echo "  scripts now present:"
ls -1 scripts/ 2>/dev/null | sed 's/^/    /'
echo "============================================================"
echo "  archive: $ARCH"
echo "  next   : git rm --cached scripts/fetch_mars_data.sh"
echo "============================================================"
