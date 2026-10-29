#!/usr/bin/env bash
# mars_stac.sh - discover and download a Mars DTM via the USGS STAC API.
# Every URL is resolved at runtime. Nothing is hardcoded.
#
#   ./mars_stac.sh                          list candidates, download index 0
#   INDEX=3 ./mars_stac.sh                  download candidate 3
#   COLL=mro_hirise_socet_dtms ./mars_stac.sh
#   BBOX=77.0,17.8,78.2,19.0 ./mars_stac.sh
set -uo pipefail

BASE="${SPACEAPPS_BASE:-$HOME/spaceapps-2026}"
export MDATA="$BASE/data/mars"
mkdir -p "$MDATA"

python3 - << 'PYEOF'
import json, os, sys, urllib.request

ROOT  = "https://stac.astrogeology.usgs.gov/api"
COLL  = os.environ.get("COLL", "mro_ctx_controlled_usgs_dtms")
BBOX  = [float(x) for x in os.environ.get("BBOX", "77.0,17.8,78.2,19.0").split(",")]
INDEX = int(os.environ.get("INDEX", "0"))
MDATA = os.environ["MDATA"]
UA    = {"User-Agent": "spaceapps-2026/1.0", "Accept": "application/json"}

def post(url, payload):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers=dict(UA, **{"Content-Type": "application/json"}))
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode())

print("=" * 68)
print("  MARS DTM DISCOVERY")
print("=" * 68)
print("  collection : %s" % COLL)
print("  bbox       : %s" % BBOX)
print("")

try:
    res = post(ROOT + "/search", {"collections": [COLL], "bbox": BBOX, "limit": 50})
except Exception as exc:
    print("  search failed: %s" % exc)
    sys.exit(1)

feats = res.get("features", [])
print("  items returned by API : %d" % len(feats))

cands = []
skipped = 0
for ft in feats:
    assets = ft.get("assets") or {}
    dtm = assets.get("dtm")
    if not dtm:
        skipped += 1
        continue
    href = dtm.get("href", "")
    if "/mars/" not in href:
        skipped += 1
        continue
    size = dtm.get("file:size") or dtm.get("size") or ""
    cands.append({"id": ft.get("id"), "href": href, "size": size})

print("  non-Mars or asset-less items skipped : %d" % skipped)
print("  usable Mars DTM candidates           : %d" % len(cands))
print("")

if not cands:
    print("  Nothing usable. Try another collection:")
    print("    COLL=mro_hirise_socet_dtms ./mars_stac.sh")
    sys.exit(2)

for i, c in enumerate(cands):
    mb = ""
    try:
        mb = "  (%.1f MB)" % (int(c["size"]) / 1048576.0)
    except Exception:
        pass
    print("  [%d] %s%s" % (i, c["id"], mb))
    print("      %s" % c["href"])

if INDEX >= len(cands):
    print("")
    print("  INDEX=%d out of range (0-%d)" % (INDEX, len(cands) - 1))
    sys.exit(3)

pick = cands[INDEX]
print("")
print("  selected [%d] %s" % (INDEX, pick["id"]))

dest = os.path.join(MDATA, "%s_dtm.tif" % pick["id"])
if os.path.exists(dest) and os.path.getsize(dest) > 5242880:
    print("  already present: %s" % dest)
    sys.exit(0)

print("  downloading to %s" % dest)
req = urllib.request.Request(pick["href"], headers={"User-Agent": UA["User-Agent"]})
try:
    with urllib.request.urlopen(req, timeout=300) as r:
        clen = r.headers.get("Content-Length")
        total = int(clen) if clen else 0
        done = 0
        tmp = dest + ".part"
        with open(tmp, "wb") as fh:
            while True:
                chunk = r.read(262144)
                if not chunk:
                    break
                fh.write(chunk)
                done += len(chunk)
                if total:
                    sys.stdout.write("\r    %5.1f%%  %6.1f / %6.1f MB" %
                                     (100.0 * done / total,
                                      done / 1048576.0, total / 1048576.0))
                else:
                    sys.stdout.write("\r    %6.1f MB" % (done / 1048576.0))
                sys.stdout.flush()
        sys.stdout.write("\n")
    os.replace(tmp, dest)
except Exception as exc:
    print("")
    print("  download failed: %s" % exc)
    for f in (dest + ".part", dest):
        if os.path.exists(f):
            os.remove(f)
    sys.exit(4)

print("  saved: %s  (%.1f MB)" % (dest, os.path.getsize(dest) / 1048576.0))

with open(dest, "rb") as fh:
    magic = fh.read(4)
if magic[:2] not in (b"II", b"MM"):
    print("  WARNING: no TIFF signature (%r) - probably an HTML error page" % magic)
    sys.exit(5)
print("  TIFF signature OK")
PYEOF

echo ""
echo "  next: ~/spaceapps-2026/scripts/mars_process.sh"
