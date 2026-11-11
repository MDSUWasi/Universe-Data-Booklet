# Project-Base — Planetary Explorer
## Complete Technical Documentation

---

## 1. Overview

**Project-Base (Planetary Explorer)** is a client-side research web application for exploring, comparing, and planning across planetary terrain sites on Earth, the Moon, and Mars. It is a browser-first tool that:

- Browses an encyclopedia of planets, moons, and diverse terrain candidate sites.
- Displays live space data from free public APIs (ISS position, astronauts, Mars weather, space weather, Earth natural events, earthquakes, NASA APOD).
- Compares terrain metrics (roughness, slope, area) across catalogued sites using matched-scale DEM analysis.
- Runs a Discovery Lab that screens any Earth coordinate for local slope/relief using the Open-Meteo elevation API.
- Designs mission concepts with a wizard-style planner that ranks every site by science, cost, and risk viability.
- Renders 3D terrain windows from local DEM data via Three.js.
- Serves a backend proxy/cache layer (Python `http.server` + SQLite) for upstream API calls and NASA tile WMTS proxying.

**Key design principle:** not tied to any single landing base. Every planetary body lists multiple candidate regions so exploration is diverse, not single-site.

**License:** MIT (see `LICENSE`).

---

## 2. Repository Structure

```
Project ELMO/
├── backend/
│   ├── server.py              # Thin HTTP layer / routing / static file server
│   ├── build_terrain_assets.py # CLI tool to build 3D terrain window JSON assets from GDAL rasters
│   ├── test_server.py         # Unit tests for CacheStore
│   ├── test_data_endpoints.py # Unit tests for /api/sites, /api/patches, /api/scale-sensitivity
│   └── test_terrain_assets.py # Unit tests for terrain asset generation
│   └── api/
│       ├── __init__.py        # Package init, ROOT path, re-exports public names
│       ├── cache.py           # SQLite byte-bounded cache store + shared fetch helper
│       ├── elevation.py       # Open-Meteo elevation proxy (Discovery Lab)
│       ├── weather.py         # Open-Meteo current-weather proxy
│       ├── tiles.py           # NASA Trek WMTS tile proxy (Moon / Mars)
│       ├── routes.py          # Data endpoints backed by committed CSVs + encyclopedia + NASA APIs
│       ├── encyclopedia.py    # Static planetary data (planets, moons, terrain sites)
│       ├── nasa.py            # NASA free APIs (APOD, EONET, InSight weather, DONKI)
│       ├── opennotify.py      # Open Notify (ISS position, astronauts)
│       └── earth_events.py    # USGS earthquake feed
├── frontend/
│   ├── index.html             # Single-page application shell + all modals
│   ├── css/
│   │   ├── style.css          # Base styles + theme structure (1917 lines)
│   │   └── themes/
│   │       ├── theme-light.css
│   │       ├── theme-dark.css
│   │       └── theme-planetary.css
│   └── js/
│       ├── app.js             # Bootstrap / page-level wiring (loaded last)
│       └── modules/
│           ├── core/
│           │   ├── data.js        # Bundled site data + helpers (window.SITE_DATA)
│           │   ├── ui.js          # Modal manager
│           │   ├── sidebar.js     # Sidebar navigation
│           │   ├── theme.js       # Theme switcher (light/dark/planetary)
│           │   ├── cache.js       # Browser localStorage discovery cache
│           │   ├── toast.js       # Toast notifications
│           │   └── starfield.js   # Full-screen animated starfield
│           ├── discovery/
│           │   └── discovery.js   # Discovery Lab: coordinate screening
│           ├── map/
│           │   ├── basemaps.js      # Basemap + NASA Trek layer definitions
│           │   ├── map-viewer.js    # Leaflet atlas init + layer switching
│           │   ├── map-viewer-2.js  # Site list, markers, detail panel
│           │   └── map-viewer-3.js  # Detail panel + terrain-lab opener
│           ├── selector/
│           │   └── selector.js      # Base Site Selector (weighted ranking)
│           ├── calculator/
│           │   └── calculator.js    # Terrain Comparison Calculator
│           ├── planner/
│           │   ├── planner.js       # Mission Planner wizard UI
│           │   ├── planner-math.js  # Mission scoring math (science/cost/risk)
│           │   └── planner-pdf.js   # Mission Planner PDF export (jsPDF)
│           ├── comparator/
│           │   └── comparator.js    # Full Comparison table + cross-body matches
│           ├── terrain/
│           │   ├── terrain-lab-1.js # 3D Terrain Lab init + Three.js setup
│           │   ├── terrain-lab-2.js # Pointer interaction + resize
│           │   └── terrain-lab-3.js # Asset loading, validation, geometry, render
│           ├── patches/
│           │   └── patch-explorer.js # Patch Explorer: committed patch records
│           ├── scale/
│           │   └── scale-sensitivity.js # 12m vs 90m roughness window comparison
│           ├── api/
│           │   └── site-metrics.js   # Optional server-side site metrics refresh
│           ├── encyclopedia/
│           │   └── encyclopedia.js   # Planetary Encyclopedia browser
│           └── realtime/
│               └── realtime.js       # Realtime Dashboard (ISS, weather, events, quakes)
├── frontend/assets/terrain/       # Pre-built 128x128 terrain window JSON assets
│   ├── axel.json
│   ├── jezero.json
│   ├── kerguelen.json
│   ├── mcmurdo.json
│   └── moon.json
├── data/
│   ├── earth/
│   │   └── Copernicus_DSM_10_S77_00_E162_00.xml   # Copernicus DEM metadata (gitignored .tif)
│   ├── raw/
│   │   ├── lunar_fingerprints.csv                 # 12m lunar fingerprint samples (tracked)
│   │   └── .gitkeep
│   ├── thermal/ (.gitkeep)
│   ├── moon/ (gitignored .tif DEMs)
│   └── mars/ (gitignored .tif DEMs)
├── docs/
│   ├── API.md                                       # Full API manifest
│   └── moon_southpole_summary.txt                   # Lunar South Pole analog analysis report
├── output/
│   ├── reports/
│   │   ├── all_sites_comparison.csv     # Tracked: 5-site summary (area, roughness)
│   │   ├── all_sites_comparison.txt     # Tracked: comparison text report
│   │   ├── site_comparison.csv          # Tracked: patch-level records
│   │   ├── site_comparison.txt          # Tracked: detailed analysis text
│   │   └── mars_comparison.txt          # Tracked: Mars comparison text
│   └── charts/ (.gitkeep)
├── scripts/
│   ├── final_compare.py         # Patch-level terrain analysis (gdaldem + scipy)
│   └── merge_all_sites.py       # Merge Moon/Earth/Mars results into summary table
├── .gitignore                   # Tracks code+docs, ignores data+generated output
├── LICENSE                      # MIT License
└── documentation.md             # This document
```

---

## 3. Datasets

### 3.1 Local (Committed / Tracked) Datasets

| File | Description | Format | Size / Scope |
|------|-------------|--------|--------------|
| `output/reports/all_sites_comparison.csv` | 5-site summary: area, mean roughness, p95 roughness, max roughness | CSV | Moon, McMurdo, Kerguelen, Axel Heiberg, Jezero |
| `output/reports/site_comparison.csv` | Patch-level records: per-site patches with slope, roughness, zero_frac, filled flags | CSV | 26 patch records across Moon/Earth/Mars |
| `output/reports/all_sites_comparison.txt` | Human-readable comparison text report | TXT | Findings + ratios to Moon |
| `output/reports/site_comparison.txt` | Detailed patch analysis text | TXT | Valid coverage, flat %, per-patch metrics |
| `output/reports/mars_comparison.txt` | Mars-specific comparison text | TXT | Mars terrain analysis |
| `data/raw/lunar_fingerprints.csv` | 12 m roughness fingerprint samples (3 patches near Shackleton) | CSV | 3 patches: area 0.400–0.521 km², roughness 0.293–0.325 m |
| `frontend/assets/terrain/*.json` | Pre-built 128×128 terrain window assets (elevation, slope, roughness, valid mask, slope-screen mask) | JSON | 5 assets: moon, mcmurdo, axel, kerguelen, jezero |
| `docs/moon_southpole_summary.txt` | Phase 3 lunar South Pole analog analysis | TXT | 3 viable landing zones near Shackleton |

### 3.2 Local (Gitignored / Regenerable) Datasets

These are **not** committed but are referenced by build scripts:

| Path | Description | Source | How to Regenerate |
|------|-------------|--------|-------------------|
| `data/earth/*.tif` | Earth DEMs (McMurdo, Axel Heiberg, Kerguelen) | Copernicus GLO-30 via AWS Open Data | `gdalwarp` / download from ESA |
| `data/moon/*.tif` | Moon DEM (South Pole, 30 m) | USGS LRO South Pole DEM (4 m/pixel source) | USGS Astrogeology |
| `data/mars/*.tif` | Mars DEM (Jezero, 30 m) | USGS MRO CTX Controlled DTM | USGS Astrogeology |
| `output/**/*.tif` | Derived slope/roughness/safe rasters | Computed with GDAL | `scripts/final_compare.py` |
| `.cache/planetary-explorer/cache.sqlite3` | SQLite upstream response cache | Runtime-generated | Server runs populate it |
| `.cache/planetary-analog/cache.sqlite3` | Secondary analog cache | Runtime-generated | — |

### 3.3 External (Live) Datasets / Services

All free, public, no paid account required:

| Service | Purpose | Endpoint | Licence |
|---------|---------|----------|---------|
| Open-Meteo Elevation API | 3×3 elevation grid for Discovery Lab | `api.open-meteo.com/v1/elevation` | CC BY 4.0 |
| Open-Meteo Forecast API | Current temperature + wind | `api.open-meteo.com/v1/forecast` | CC BY 4.0 |
| NASA Solar System Treks (WMTS) | Moon LRO WAC Mosaic, Mars Viking MDIM21 tiles | `trek.nasa.gov/tiles/...` | Public Domain |
| NASA APOD | Astronomy Picture of the Day | `api.nasa.gov/planetary/apod` | NASA terms (DEMO_KEY) |
| NASA EONET | Earth natural events (wildfires, storms, volcanoes) | `eonet.gsfc.nasa.gov/api/v3/events` | NASA terms (DEMO_KEY) |
| NASA InSight Weather | Mars weather (sol reports) | `api.nasa.gov/insight_weather/` | NASA terms (DEMO_KEY) |
| NASA DONKI | Space weather notifications (CME, flares, G-storms) | `api.nasa.gov/DONKI/` | NASA terms (DEMO_KEY) |
| Open Notify ISS | Current ISS latitude/longitude | `api.open-notify.org/iss-now.json` | Open Notify terms |
| Open Notify Astronauts | Who is in space right now | `api.open-notify.org/astros.json` | Open Notify terms |
| USGS Earthquakes | Recent earthquakes worldwide | `earthquake.usgs.gov/fdsnws/event/1/query` | USGS terms |
| Esri World Imagery | Earth satellite basemap | `server.arcgisonline.com` | Esri terms |
| USGS The National Map | Earth imagery basemap | `basemap.nationalmap.gov` | Public Domain |
| OpenStreetMap | Earth street basemap | `openstreetmap.org` | ODbL |
| CARTO | Earth dark basemap | `basemaps.cartocdn.com` | CARTO terms |

### 3.4 How Datasets Are Added

1. **Terrain DEMs:** Placed in `data/{earth,moon,mars}/` as GeoTIFF `.tif` files (gitignored). Processed with GDAL (`gdalwarp`, `gdaldem slope`, `gdaldem roughness`) to produce slope and roughness rasters in `output/analysis/` or `output/earth/` / `output/mars/`.
2. **Patch analysis:** `scripts/final_compare.py` reads slope + roughness rasters at a common 30 m grid, applies a ≤3° slope mask, labels contiguous patches with `scipy.ndimage.label`, computes per-patch area/roughness/slope, and writes `output/reports/site_comparison.csv`.
3. **All-sites summary:** `scripts/merge_all_sites.py` combines Moon/Earth/Mars results into `output/reports/all_sites_comparison.csv` (5 sites).
4. **Terrain window assets:** `backend/build_terrain_assets.py` samples 3 km windows from DEMs at 128×128 grid, quantizes elevation/slope/roughness to uint8, and writes JSON assets to `frontend/assets/terrain/`.
5. **Frontend bundled data:** `frontend/js/modules/core/data.js` hardcodes `SITE_DATA` mirroring `all_sites_comparison.csv` so the app works offline without the server.
6. **Encyclopedia data:** `backend/api/encyclopedia.py` hardcodes `PLANETS`, `MOONS`, `SITES` dictionaries served via `/api/encyclopedia/*`. The encyclopedia now covers the **full Solar System**: the **Sun** (with a direct-viewing eye-safety warning), Mercury, Venus, Earth, the Moon, Mars, Jupiter, Saturn, Uranus, Neptune, **Pluto**, **Ceres**, and 9 moons (Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Enceladus, Triton). Each entry carries a bundled reference image (Wikimedia Commons, cached offline under `frontend/assets/encyclopedia/`).

---

## 4. API Documentation

### 4.1 Backend Endpoints (served by `backend/server.py`)

| # | Method + Path | Purpose | Implemented In |
|---|---------------|---------|----------------|
| 1 | `GET /api/health` | Server + cache status probe | `server.py:do_GET` |
| 2 | `GET /api/sites` | Committed 5-site summary JSON | `routes.py:sites_payload` |
| 3 | `GET /api/patches` | Patch-level records for Patch Explorer | `routes.py:patches_payload` |
| 4 | `GET /api/scale-sensitivity` | 12 m lunar fingerprints + 90 m reference | `routes.py:scale_sensitivity_payload` |
| 5 | `GET /api/elevation?latitude=..&longitude=..` | Proxies Open-Meteo elevation (3×3 grid) | `elevation.py:fetch_elevation` |
| 6 | `GET /api/weather?lat=..&lon=..` | Proxies Open-Meteo current weather | `weather.py:fetch_weather` |
| 7 | `GET /api/tiles/{moon|mars}/{z}/{row}/{column}.jpg` | Proxies NASA Trek WMTS tiles | `tiles.py:fetch_tile` |
| 8 | `GET /api/encyclopedia` | All encyclopedia data | `routes.py:encyclopedia_payload` |
| 9 | `GET /api/encyclopedia/planets` | List of planetary bodies | `routes.py:planets_payload` |
| 10 | `GET /api/encyclopedia/moons` | List of moons | `routes.py:moons_payload` |
| 11 | `GET /api/encyclopedia/sites` | Diverse terrain candidate sites (all bodies) | `routes.py:sites_payload_v2` |
| 12 | `GET /api/encyclopedia/sites/{body}` | Sites filtered by body | `routes.py:sites_by_body_payload` |
| 13 | `GET /api/encyclopedia/planet/{id}` | Single planet entry | `routes.py:planet_payload` |
| 14 | `GET /api/encyclopedia/moon/{id}` | Single moon entry | `routes.py:moon_payload` |
| 15 | `GET /api/encyclopedia/site/{id}` | Single terrain site entry | `routes.py:site_payload` |
| 16 | `GET /api/nasa/apod` | NASA Astronomy Picture of the Day | `routes.py:apod_payload` |
| 17 | `GET /api/nasa/earth-events` | Earth natural events (EONET) | `routes.py:earth_events_payload` |
| 18 | `GET /api/nasa/mars-weather` | InSight Mars weather report | `routes.py:mars_weather_payload` |
| 19 | `GET /api/nasa/space-weather` | Space weather notifications (DONKI) | `routes.py:space_weather_payload` |
| 20 | `GET /api/space/iss` | Current ISS position (Open Notify) | `routes.py:iss_position_payload` |
| 21 | `GET /api/space/astronauts` | Who is in space (Open Notify) | `routes.py:astronauts_payload` |
| 22 | `GET /api/earth/earthquakes` | Recent earthquakes worldwide (USGS) | `routes.py:earthquakes_payload` |

All upstream calls pass through the shared SQLite cache in `backend/api/cache.py:CacheStore`.

### 4.2 Cache Policy (`backend/api/cache.py`)

| Entry Type | Fresh TTL | Stale TTL (served on upstream failure) | Eviction |
|------------|-----------|----------------------------------------|----------|
| Elevation (Open-Meteo) | 30 days | 365 days | FIFO by insertion time |
| Weather (Open-Meteo) | 15 minutes | 30 days | FIFO by insertion time |
| NASA tiles (Solar System Treks) | Never (immutable) | Never | FIFO by insertion time |
| NASA / Open Notify / USGS APIs | 15 minutes | 30 days | FIFO by insertion time |

**Store bounds:** 128 MiB total, 5 MiB per single entry. Oldest entries evicted first when limit exceeded.

---

## 5. Source Code Architecture & Interconnections

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      BROWSER (Frontend)                          │
│  index.html  →  CSS themes  →  JS modules (classic scripts)    │
│                                                                   │
│  Core: data, ui, sidebar, theme, cache, toast, starfield       │
│  Features: discovery, map, selector, calculator, planner,      │
│            comparator, terrain, patches, scale, site-metrics,   │
│            encyclopedia, realtime                               │
│                                                                   │
│  Communication: window.<Module> global registry + fetch()      │
│                 to /api/* endpoints                             │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Python http.server)                │
│  server.py: AppHandler (SimpleHTTPRequestHandler)               │
│  Routes /api/* → backend/api/* modules                          │
│                                                                   │
│  api/cache.py    → SQLite byte-bounded cache (STORE singleton)  │
│  api/elevation.py → Open-Meteo elevation proxy                  │
│  api/weather.py   → Open-Meteo weather proxy                    │
│  api/tiles.py     → NASA Trek WMTS tile proxy                   │
│  api/routes.py    → CSV-backed + encyclopedia + NASA API routes │
│  api/encyclopedia.py → Static planets/moons/sites data          │
│  api/nasa.py      → APOD, EONET, InSight, DONKI                 │
│  api/opennotify.py → ISS position, astronauts                   │
│  api/earth_events.py → USGS earthquakes                         │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL PUBLIC APIs (free)                    │
│  Open-Meteo, NASA (APOD/EONET/InSight/DONKI), Open Notify,      │
│  USGS Earthquakes, NASA Solar System Treks (WMTS)               │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Module Interconnections

All frontend modules are **independent classic scripts** that register themselves on `window`. They communicate only through the `window.<Module>` global registry. `index.html` loads them in dependency order (core first, then features, then `app.js` last).

**Core modules (loaded first, provide shared services):**
- `data.js` — `window.SITE_DATA`, `window.PLANET_COLORS`, `window.SITES`, `window.fmt`, `window.setText`
- `ui.js` — `window.UI` — modal open/close/overlay handler; triggers feature module init when a modal opens
- `sidebar.js` — `window.Sidebar` — hamburger toggle, resize handling, map invalidation
- `theme.js` — `window.Theme` — light/dark/planetary switching, persists to localStorage
- `cache.js` — `window.Cache` — browser localStorage discovery cache (300 entries, 7-day TTL)
- `toast.js` — `window.Toast` — transient notifications
- `starfield.js` — `window.Starfield` — full-screen animated background

**Feature modules (each self-contained):**
- `discovery.js` — depends on `Cache`, `SITE_DATA`, `fmt`; calls `/api/elevation`
- `map/` (`basemaps.js`, `map-viewer.js`, `map-viewer-2.js`, `map-viewer-3.js`) — `window.MapViewer`; depends on `SITE_DATA`, `PLANET_COLORS`, `basemaps`, `trekLayers`; calls `/api/tiles/*`
- `selector.js` — `window.Selector`; depends on `SITE_DATA`; weighted re-ranking
- `calculator.js` — `window.Calculator`; depends on `SITE_DATA`; Chart.js bar chart
- `planner/` (`planner.js`, `planner-math.js`, `planner-pdf.js`) — `window.Planner`; wizard UI + scoring + jsPDF export; depends on `SITE_DATA`
- `comparator.js` — `window.Comparator`; sortable table + cross-body similarity; depends on `SITE_DATA`, `PLANET_COLORS`
- `terrain/` (`terrain-lab-1/2/3.js`) — `window.TerrainLab`; Three.js 3D rendering; loads `assets/terrain/{id}.json`
- `patches/patch-explorer.js` — `window.PatchExplorer`; calls `/api/patches`
- `scale/scale-sensitivity.js` — `window.ScaleSensitivity`; calls `/api/scale-sensitivity`
- `api/site-metrics.js` — `window.SiteMetrics`; calls `/api/sites` to refresh bundled metrics
- `encyclopedia/encyclopedia.js` — `window.Encyclopedia`; calls `/api/encyclopedia`
- `realtime/realtime.js` — `window.Realtime`; calls `/api/nasa/*`, `/api/space/*`, `/api/earth/*`

**Bootstrap (`app.js`):** loaded last; initializes `Sidebar`, `Starfield`, `Cache`, `Toast`, `Selector`, `Theme`; wires page-level button handlers (Discovery analyze/random, Map retry, Planner back/next/pdf); fetches encyclopedia stats for hero.

### 5.3 Backend Module Responsibilities

- **`server.py`**: `ThreadingHTTPServer` on `127.0.0.1:8000`. `AppHandler` routes GET paths to handlers, serves static frontend files, returns JSON payloads. Re-exports test-compatible aliases (`_sites`, `_patches`, `_scale_sensitivity`, `_read_csv`).
- **`api/__init__.py`**: Package root, defines `ROOT` (repo root), re-exports all public names used by `server.py` and tests.
- **`api/cache.py`**: `CacheStore` class — SQLite WAL database, byte-bounded (128 MiB), FIFO eviction, `get_or_fetch` with TTL/stale-ttl logic. Module-level `STORE` singleton. `cache_key()` helper (SHA-256). `fetch()` bounded upstream GET.
- **`api/elevation.py`**: Open-Meteo elevation proxy. Validates coordinates (±90/±180), max 100 coords, builds URL, caches with 30-day TTL / 365-day stale.
- **`api/weather.py`**: Open-Meteo current weather proxy. Validates lat/lon, fetches `temperature_2m` and `wind_speed_10m`, 15-minute TTL / 30-day stale.
- **`api/tiles.py`**: NASA Trek WMTS tile proxy. Moon = LRO WAC Mosaic, Mars = Viking MDIM21. Validates tile paths (zoom ≤ 6, row/col bounds). Cached as immutable (no age refresh).
- **`api/routes.py`**: Aggregates all endpoints. Reads committed CSVs (`all_sites_comparison.csv`, `site_comparison.csv`, `lunar_fingerprints.csv`) for data endpoints; delegates encyclopedia to `encyclopedia.py`; delegates NASA/Open Notify/USGS calls to respective modules.
- **`api/encyclopedia.py`**: Static data — 5 planets (Earth, Moon, Mars, Jupiter, Saturn), 2 moons (Phobos, Deimos), 17 terrain sites (6 Earth, 4 Moon, 5 Mars) with physical properties, colors, descriptions.
- **`api/nasa.py`**: APOD, EONET, InSight Mars weather, DONKI space weather. Uses `DEMO_KEY`. Cached via shared store.
- **`api/opennotify.py`**: ISS position, astronauts in space.
- **`api/earth_events.py`**: USGS earthquake feed (GeoJSON, min magnitude 2.5, limit 30).

---

## 6. Core Functionality: What It Does and How It Works

### 6.1 Core Purpose

Project-Base is a **planetary terrain research and comparison atlas**. Its core work is:

1. **Catalogue terrain sites** across Earth, Moon, and Mars with comparable metrics (area, mean roughness, p95 roughness, max roughness, slope discipline) computed at a matched 30 m grid / 90 m roughness window.
2. **Enable exploration** of those sites through an interactive map (Leaflet), encyclopedia browser, and 3D terrain lab (Three.js).
3. **Support mission planning** by ranking sites against user-weighted criteria (smoothness, hazard tolerance, area demand, slope discipline) and scoring science/cost/risk viability.
4. **Provide live space context** via free public APIs so users have current ISS position, Mars weather, space weather, and Earth events alongside terrain data.
5. **Screen arbitrary Earth coordinates** for local slope/relief suitability (Discovery Lab).

### 6.2 Feature-by-Feature Breakdown

#### A. Map View (Leaflet Atlas)
- Interactive map with layer switching: Earth (Esri Satellite, USGS National Map, OpenStreetMap, Carto Dark basemaps), Moon (LRO WAC Mosaic via NASA Trek proxy), Mars (Viking MDIM21 via NASA Trek proxy).
- 5 catalogued site markers with colored pins (Earth=green, Moon=gold, Mars=coral).
- Clicking a marker or site card shows a detail panel: area, mean roughness, p95 roughness, site class, description, and action buttons (Focus on map, Compare, View 3D terrain).
- Double-click on map zooms to nearest site. Hover shows nearest-site tooltip.
- Basemap cycling (Earth only), fit-all bounds, search filter, retry tiles.

#### B. Planetary Encyclopedia
- Three tabs: Planets, Moons, Terrain Sites.
- Planets: Earth, Moon (listed as satellite), Mars, Jupiter, Saturn — with physical data (diameter, mass, gravity, distance, orbital period, temperature, atmosphere, satellites).
- Moons: Phobos, Deimos — with orbit distance, period, density, albedo, shape.
- Sites: grouped by body (Earth/Moon/Mars), each with area, roughness, similarity %, site class, description, live-weather availability flag.
- Data fetched from `/api/encyclopedia`.

#### C. Discovery Lab (Coordinate Screening)
- User enters any Earth latitude/longitude.
- Samples a 3×3 elevation grid (~278 m spacing) via `/api/elevation` (Open-Meteo, proxied through server cache).
- Computes local slope, mean relief, p95 relief, elevation range in-browser.
- Pass/fail verdict against ≤3° slope screen.
- Browser-side localStorage cache (300 entries, 7-day TTL) avoids repeat requests.
- "Surprise Me" picks a random Earth site from `SITE_DATA`.

#### D. Realtime Dashboard
- Fetches 8 live endpoints in parallel via `Promise.all`:
  - ISS position (Open Notify)
  - Astronauts in space (Open Notify)
  - NASA APOD (image + explanation)
  - Mars weather (InSight latest sol)
  - Space weather / DONKI (last 7 days)
  - Earth natural events / EONET (last 20)
  - Recent earthquakes / USGS (min M2.5, limit 30)
- Each result shows cache state (HIT/MISS/STALE). Silent failure tolerance (offline-friendly).
- Refresh button re-fetches all.

#### E. Base Site Selector (Weighted Ranking)
- Four adjustable weights: Smoothness (low roughness), Hazard tolerance (p95), Area demand, Slope strictness (≤3° discipline).
- Scores every catalogued site: `score = normRough×smooth + normHazard×hazard + normArea×area + normSlope×slope`.
- Normalized: area/500, 5−meanRough, 6−p95Rough, slopeDiscipline.
- Re-ranks instantly on slider change. Shows top pick highlighted.

#### F. Terrain Comparison Calculator
- Adjusted Euclidean distance in terrain-metric space (mean roughness, p95 roughness) vs Moon reference.
- Similarity = `max(0, 100 − distance × 15)`.
- Chart.js bar chart of all sites' similarity to Moon.
- Adjustable sliders for target roughness, p95 ceiling, slope gate, area gate (UI controls; chart currently shows Moon-similarity baseline).

#### G. Full Comparison
- Sortable table of all 5 sites: name, body, area, mean rough, p95 rough, site class.
- Filter by body (All/Earth/Moon/Mars). Click column headers to sort.
- Cross-body pairwise similarity matrix: `max(0, 100 − |roughA − roughB| × 10)`.
- Chart.js bar chart.

#### H. 3D Terrain Lab (Three.js)
- Loads pre-built 128×128 terrain window JSON assets from `frontend/assets/terrain/{id}.json`.
- Each asset: elevation_u8, slope_u8, roughness_u8, valid_mask, slope_screen_mask (all 16,384 cells), plus metadata (source DEM, window size, center, valid fraction, slope-screen fraction, elevation range).
- Three display modes: Elevation, Slope, Roughness, Safe (≤3° slope screen).
- Vertical exaggeration slider (1–10×). Pointer drag to rotate, wheel to zoom.
- Three.js `BufferGeometry` with vertex colors, `MeshStandardMaterial`, vertexColors enabled.
- Asset validation: checks `schema_version === 1`, `grid_size === 128`, all grid arrays length 16,384.
- Generation guard: `_loadGen` counter prevents stale in-flight loads from overwriting newer geometry.

#### I. Patch Explorer
- Fetches `/api/patches` (committed patch-level records from `site_comparison.csv`).
- Filter by planetary body (All/Moon/Earth/Mars) and classification (All/Non-filled/Filled).
- Table: site, body, area, slope mean, centre X/Y, roughness mean/p95/max, zero fraction, flag.
- Filled-surface flags shown as recorded (water/ice regions flagged, not hidden).
- Notes that Mars patch classifications are not in this checkout (Jezero only in summary report).

#### J. Scale Sensitivity
- Fetches `/api/scale-sensitivity`.
- Plots 3 lunar 12 m fingerprint patches beside the 90 m main reference (Shackleton).
- Bar chart: mean roughness and p95 roughness for each patch + reference.
- Explicit warning: different roughness windows are not directly comparable scores.

#### K. Mission Planner (Wizard + PDF)
- 4-step wizard: Mission Type (Exploration/Resource Survey/Scientific Outpost), Duration (1 Week/1 Month/6 Months), Team Size (Solo/2-Person/Full Crew), Target Site (all catalogued sites).
- Scoring (`planner-math.js`):
  - **Terrain risk** = `round((min(1, meanRough/5)×0.6 + (1−slopeDiscipline)×0.4) × 100)`
  - **Mission cost** = `min(100, round((crew × days × distanceFactor) / 40))` where distanceFactor: Earth=1, Mars=4, Moon=8
  - **Science value** = `max(0, round(base + area/25 − meanRough×4))` capped with bonuses/penalties
  - **Viability** = `science×0.4 + (100−cost)×0.3 + (100−risk)×0.3`
- Ranks all sites, displays table with best pick highlighted.
- PDF export via jsPDF: mission brief, viability ranking table, recommendation.

---

## 7. Data Flow: End-to-End Examples

### 7.1 Discovery Lab Coordinate Lookup
1. User enters lat/lng in Discovery Lab modal.
2. `discovery.js:analyze()` checks `window.Cache.lookup()` (localStorage).
3. If cache hit → render cached result. If miss → fetch `/api/elevation?latitude=..&longitude=..`.
4. Backend `server.py` routes to `elevation.py:fetch_elevation()`.
5. `elevation.py` validates coords, builds Open-Meteo URL, calls `cache.py:STORE.get_or_fetch()`.
6. Cache miss → upstream HTTP fetch via `cache.py:fetch()`, validated, stored, returned.
7. Backend returns JSON `{elevation: [9 values]}`.
8. Frontend computes slope/relief metrics, renders result, stores in localStorage cache.

### 7.2 Map View Tile Loading
1. User opens Map modal, selects Moon layer.
2. `map-viewer.js:switchLayer('moon')` sets tileLayer URL to `/api/tiles/moon/{z}/{y}/{x}.jpg`.
3. Leaflet requests tiles. Backend `server.py` routes to `tiles.py:fetch_tile()`.
4. `tiles.py` validates path (zoom ≤ 6), builds NASA Trek WMTS URL, fetches via cache (immutable TTL).
5. Tile returned as JPEG with `Cache-Control: public, max-age=31536000, immutable`.

### 7.3 Encyclopedia Data Load
1. User opens Encyclopedia modal.
2. `encyclopedia.js:load()` fetches `/api/encyclopedia`.
3. Backend `routes.py:encyclopedia_payload()` returns `{planets, moons, sites}` from hardcoded dictionaries.
4. Frontend renders tabbed cards with physical data, colors, descriptions.

### 7.4 Mission Planner Scoring
1. User completes 4-step wizard.
2. `planner.js:finish()` calls `planner-math.js:rankSites(plan)`.
3. For each site: computes terrainRisk, missionCost, scienceValue, viability score.
4. Sorts best-first, renders table with best pick highlighted.
5. PDF export available via `planner-pdf.js:savePdf()`.

---

## 8. How to Run

### 8.1 Prerequisites
- Python 3.13+ (for backend)
- Modern browser with ES6+ support (for frontend)
- GDAL 3.10.3 + NumPy + SciPy (only needed for `build_terrain_assets.py` and `final_compare.py`, not for running the app)

### 8.2 Running the Backend Server
```bash
cd /path/to/Project ELMO
python3 -m backend.server
# or
python3 backend/server.py
```
Server listens on `http://127.0.0.1:8000/`. Serves `frontend/` as static files and `/api/*` endpoints.

### 8.3 Running the Frontend
Open `frontend/index.html` in a browser, or use the backend server (recommended so `/api/*` endpoints work). The app loads CDN libraries (Leaflet, Chart.js, GSAP, Three.js, jsPDF) — internet connection required for CDN assets and live API calls.

### 8.4 Running Tests
```bash
cd /path/to/Project ELMO
python3 -m unittest backend/test_server.py
python3 -m unittest backend/test_data_endpoints.py
python3 -m unittest backend/test_terrain_assets.py
```

### 8.5 Building Terrain Assets (requires GDAL)
```bash
cd /path/to/Project ELMO
python3 backend/build_terrain_assets.py
# Outputs to frontend/assets/terrain/{site_id}.json
```

### 8.6 Running Terrain Analysis (requires GDAL + SciPy)
```bash
cd /path/to/Project ELMO
python3 scripts/final_compare.py
# Outputs patch-level analysis to output/reports/site_comparison.csv/txt
python3 scripts/merge_all_sites.py
# Merges into output/reports/all_sites_comparison.csv/txt
```
Note: `final_compare.py` references `~/spaceapps-2026` by default via `SPACEAPPS_BASE` env var.

---

## 9. Catalogued Terrain Sites

### 9.1 Earth Sites (6)

| Site | Region | Area (km²) | Mean Rough (m) | p95 Rough (m) | Site Class | Live Weather |
|------|--------|------------|----------------|---------------|------------|--------------|
| McMurdo Dry Valleys | Antarctica | 250.242 | 2.294 | 3.865 | strong polar site | Yes |
| Axel Heiberg Island | Canadian Arctic | 81.175 | 2.232 | 3.611 | strong polar site | Yes |
| Kerguelen Islands | Southern Indian Ocean | 1.241 | 1.352 | 3.946 | weak site | Yes |
| Atacama Desert | Chile | 140.0 | 1.875 | 3.410 | arid site | Yes |
| Iceland Highlands | Iceland | 95.0 | 2.650 | 4.080 | volcanic site | Yes |
| Death Valley | California, USA | 78.0 | 1.540 | 2.890 | arid site | Yes |

### 9.2 Moon Sites (4)

| Site | Region | Area (km²) | Mean Rough (m) | p95 Rough (m) | Site Class | Live Weather |
|------|--------|------------|----------------|---------------|------------|--------------|
| Shackleton (Lunar South Pole) | South Pole | 3.875 | 2.462 | 4.138 | lunar baseline | No |
| Tycho Crater | Southern near side | 12.5 | 3.120 | 5.480 | young impact site | No |
| Mare Serenitatis | Near side | 45.0 | 1.890 | 3.210 | mare site | No |
| Montes Apenninus | Near side | 8.0 | 4.340 | 7.120 | highland site | No |

### 9.3 Mars Sites (5)

| Site | Region | Area (km²) | Mean Rough (m) | p95 Rough (m) | Site Class | Live Weather |
|------|--------|------------|----------------|---------------|------------|--------------|
| Jezero Crater | Western Isidis Planitia | 506.277 | 2.110 | 3.744 | martian reference | No |
| Gusev Crater | Southern hemisphere | 210.0 | 2.780 | 4.520 | lakebed site | No |
| Gale Crater | Near equator | 300.0 | 2.450 | 3.980 | mound site | No |
| Eos Chasma | Valles Marineris | 180.0 | 3.910 | 6.230 | canyon site | No |
| Hellas Planitia | Southern hemisphere | 600.0 | 1.760 | 2.940 | impact basin site | No |

### 9.4 Planets (Encyclopedia)
Earth, Moon, Mars, Jupiter, Saturn — with full physical data (diameter, mass, gravity, escape velocity, distance, orbital period, rotation, temperature, atmosphere, satellites).

### 9.5 Moons (Encyclopedia)
Phobos, Deimos (both of Mars) — with orbit distance, period, density, albedo, shape.

---

## 10. Key Algorithms & Formulas

### 10.1 Roughness Computation
- 3×3 pixel window: `roughness = max − min` in the window.
- Computed at common 30 m grid → 90 m effective window everywhere (matched scale).
- p95 roughness = 95th percentile of per-patch roughness values.

### 10.2 Slope Screening
- Safe terrain: slope ≤ 3°.
- Contiguous patches labeled via 8-connectivity (`scipy.ndimage.label`).
- Patches < 0.05 km² ignored ("crumbs").

### 10.3 Similarity Score (Calculator)
```
distance = sqrt((meanRough − moon.meanRough)² + (p95Rough − moon.p95Rough)²)
similarity = max(0, 100 − distance × 15)
```

### 10.4 Cross-Body Similarity (Comparator)
```
sim = max(0, 100 − |meanRoughA − meanRoughB| × 10)
```

### 10.5 Mission Planner Scoring
```
terrainRisk    = round((min(1, meanRough/5) × 0.6 + (1 − slopeDiscipline) × 0.4) × 100)
missionCost    = min(100, round((crew × days × distanceFactor) / 40))
scienceValue   = max(0, round(base + area/25 − meanRough × 4))
viability      = round(science × 0.4 + (100 − cost) × 0.3 + (100 − risk) × 0.3)
```
Distance factors: Earth=1.0, Mars=4.0, Moon=8.0.

### 10.6 Base Site Selector Scoring
```
normArea    = area / 500
normRough   = 5 − meanRough
normHazard  = 6 − p95Rough
normSlope   = slopeDiscipline
score       = normRough×smooth + normHazard×hazard + normArea×area + normSlope×slope
```

---

## 11. Data Provenance & Attribution

Full provenance is documented in `frontend/index.html` Credits modal and `docs/API.md`.

**Datasets:**
- LRO South Pole DEM — USGS Astrogeology / NASA (public domain)
- Copernicus DEM GLO-30 — ESA / Airbus via AWS Open Data (free, attribution required)
- MRO CTX Controlled DTM — USGS Astrogeology / NASA (public domain; attribution recommended)
- Derived slope/roughness rasters — computed locally with GDAL (inherit source terms)

**Live services:**
- Open-Meteo Elevation & Forecast APIs — CC BY 4.0
- NASA Solar System Treks (WMTS) — Public Domain
- Esri World Imagery — Esri terms
- USGS The National Map — Public Domain
- OpenStreetMap — ODbL
- CARTO — CARTO terms

**Libraries (CDN):**
- Leaflet 1.9.4 — BSD-2-Clause
- Chart.js 4.4.3 — MIT
- GSAP 3.12.5 — MIT (standard license)
- Three.js 0.160.0 — MIT
- jsPDF 2.5.1 — MIT

**Offline tooling:** GDAL 3.10.3, Python 3.13, NumPy, SciPy.

---

## 12. Git History Note

The repository history was rewritten to replace all occurrences of "ELMO"/"elmo" with "Project-Base" across all commits, files, and commit messages using `git-filter-repo --replace-text`. The remote `origin` points to `https://github.com/MDSUWasi/Project-ELMO.git` and must be force-pushed (`git push --force --mirror origin`) to publish the rewritten history.

---

## 13. Summary: What This Project Is Supposed to Do

Project-Base is a **planetary exploration research tool** that:

1. **Catalogues** diverse terrain candidate sites across Earth, Moon, and Mars with comparable, matched-scale metrics.
2. **Enables exploration** through interactive maps, encyclopedia browsing, and 3D terrain visualization.
3. **Supports analog research** by comparing terrestrial sites to lunar/Martian terrain at identical measurement scales (30 m grid, 90 m roughness window).
4. **Assists mission planning** by scoring sites against weighted criteria (science value, cost proxy, terrain risk).
5. **Provides live space context** via free public APIs without requiring API keys or user accounts.
6. **Runs entirely client-side** for the UI, with a lightweight Python backend for API proxying and caching — no tracking, no user data storage, no analytics.

It is **not** a mission-critical engineering tool. All terrain metrics, rankings, and mission scores are research estimates for informational purposes only.
