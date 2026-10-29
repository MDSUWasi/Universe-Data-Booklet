#!/usr/bin/env bash
# data_organize.sh - restructure the repo for backend + frontend development.
# Creates skeletons, moves stray outputs, extends .gitignore. Non-destructive.
set -uo pipefail

BASE="${SPACEAPPS_BASE:-$HOME/spaceapps-2026}"
cd "$BASE" || exit 1

echo "============================================================"
echo "  DATA ORGANISE"
echo "============================================================"

# --- 1. canonical data tree ------------------------------------------
echo ""
echo "[ 1. data tree ]"
for d in data/moon data/earth data/mars data/thermal data/raw; do
  mkdir -p "$d"
  [ -z "$(ls -A "$d" 2>/dev/null)" ] && touch "$d/.gitkeep"
  echo "  $d"
done

# --- 2. canonical output tree ----------------------------------------
echo ""
echo "[ 2. output tree ]"
for d in output/analysis output/reports output/shapes output/maps \
         output/earth output/mars output/charts; do
  mkdir -p "$d"
  [ -z "$(ls -A "$d" 2>/dev/null)" ] && touch "$d/.gitkeep"
  echo "  $d"
done

# --- 3. relocate strays ----------------------------------------------
echo ""
echo "[ 3. relocating stray outputs ]"
if compgen -G "output/earth/mars_*" > /dev/null; then
  mv output/earth/mars_* output/mars/ 2>/dev/null && echo "  output/earth/mars_* -> output/mars/"
fi
if [ -f "output/analysis/southpole_safe_3deg.tif" ]; then
  mv output/analysis/southpole_safe_3deg.tif output/maps/ 2>/dev/null \
    && echo "  southpole_safe_3deg.tif -> output/maps/"
fi

# --- 4. backend skeleton ---------------------------------------------
echo ""
echo "[ 4. backend skeleton ]"
mkdir -p backend/api backend/services backend/data
cat > backend/requirements.txt << 'REQ'
flask>=3.0
flask-cors>=4.0
numpy>=1.26
scipy>=1.11
gdal>=3.6
rasterio>=1.3
REQ
cat > backend/app.py << 'APP'
"""Flask entrypoint. Serves the site comparison API and the frontend."""
import json, os
from flask import Flask, jsonify, send_from_directory

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORTS = os.path.join(BASE, "output", "reports")
FRONTEND = os.path.join(BASE, "frontend")

app = Flask(__name__, static_folder=None)


@app.route("/api/sites")
def sites():
    """Return the five-site comparison table as JSON."""
    path = os.path.join(REPORTS, "all_sites_comparison.csv")
    rows = []
    if os.path.exists(path):
        with open(path) as fh:
            header = fh.readline().strip().split(",")
            for line in fh:
                vals = line.strip().split(",")
                if len(vals) == len(header):
                    rows.append(dict(zip(header, vals)))
    return jsonify({"count": len(rows), "sites": rows})


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/")
def index():
    return send_from_directory(FRONTEND, "index.html")


@app.route("/<path:p>")
def static_files(p):
    return send_from_directory(FRONTEND, p)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
APP
echo "  backend/app.py, backend/requirements.txt"

# --- 5. frontend skeleton --------------------------------------------
echo ""
echo "[ 5. frontend skeleton ]"
mkdir -p frontend/css frontend/js frontend/assets
cat > frontend/index.html << 'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Lunar Base Analog Explorer</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header>
    <h1>Lunar Base Analog Explorer</h1>
    <p>Terrain comparison across the Moon, Earth and Mars at a matched 90&nbsp;m window</p>
  </header>

  <main>
    <section id="controls">
      <button id="load">Load site comparison</button>
    </section>
    <section id="results">
      <table id="sites-table">
        <thead>
          <tr><th>Site</th><th>Area (km&sup2;)</th><th>Rough mean (m)</th>
              <th>Rough p95 (m)</th><th>Rough max (m)</th></tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  </main>

  <script src="js/main.js"></script>
</body>
</html>
HTML
cat > frontend/css/style.css << 'CSS'
:root { --purple: #6d4aff; --bg: #151119; --fg: #e9e5f2; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 2rem;
  font-family: ui-sans-serif, system-ui, sans-serif;
  background: var(--bg); color: var(--fg);
}
h1 { color: var(--purple); margin-top: 0; }
table { border-collapse: collapse; width: 100%; margin-top: 1.5rem; }
th, td { border: 1px solid #333; padding: .5rem .75rem; text-align: left; }
th { background: var(--purple); color: #fff; }
button {
  background: var(--purple); color: #fff; border: 0;
  padding: .6rem 1.2rem; border-radius: 6px; cursor: pointer;
}
CSS
cat > frontend/js/main.js << 'JS'
const API = "/api/sites";

async function loadSites() {
  const tbody = document.querySelector("#sites-table tbody");
  tbody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";
  try {
    const res = await fetch(API);
    const data = await res.json();
    tbody.innerHTML = "";
    for (const s of data.sites) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${s.site}</td><td>${s.area_km2}</td>` +
                     `<td>${s.rough_mean_m}</td><td>${s.rough_p95_m}</td>` +
                     `<td>${s.rough_max_m}</td>`;
      tbody.appendChild(tr);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan='5'>Failed: ${err.message}</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("load").addEventListener("click", loadSites);
});
JS
echo "  frontend/index.html, css/style.css, js/main.js"

# --- 6. extend .gitignore --------------------------------------------
echo ""
echo "[ 6. extending .gitignore ]"
cat >> .gitignore << 'IGN'

# -------------------------------------------------------------
# BACKEND / FRONTEND
# -------------------------------------------------------------
node_modules/
package-lock.json
yarn.lock
venv/
.venv/
env/
*.sqlite
*.db
.env
.env.local
dist/
build/
.next/
.cache/
IGN
echo "  appended backend/frontend rules"

echo ""
echo "============================================================"
echo "  STRUCTURE"
echo "============================================================"
find . -maxdepth 2 -type d -not -path './.git*' -not -path './data/*' \
     -not -path './output/*' | sort | sed 's|^\./||' | sed 's/^/  /'
echo "============================================================"
echo "  next: cd backend && python3 -m venv venv && source venv/bin/activate"
echo "        pip install -r requirements.txt && python3 app.py"
echo "============================================================"
