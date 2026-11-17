# Credits

_Last updated: 16 November 2026_

This file credits every data source, API, bundled dependency, font, and local image asset used by **Universe Data Booklet** (including its integrated **Planetary Explorer** feature, kept under `Project Base/`).

The application code is MIT licensed. Third-party data, images, and libraries remain under their own licenses; this file records those sources and attribution requirements.

---

## Quick reference

| Category | Sources |
|---|---|
| Live data & APIs | NASA (NEO, EONET, InSight, DONKI), NASA Exoplanet Archive/IPAC, USGS, Open-Meteo, Open Notify, NASA Trek WMTS |
| Terrain / reference data | USGS Astrogeology (LRO South Pole DEM, MRO CTX), ESA/Copernicus DEM GLO-30 |
| Earth basemaps | Esri World Imagery, USGS The National Map, OpenStreetMap, CARTO |
| Encyclopedia images | Wikimedia Commons (NASA/ESA/JPL/MPS/DLR/PSI, Rosetta/OSIRIS, Hubble, Voyager, Cassini, MESSENGER, MGS, LRO, Dawn, Juno) |
| Bundled frontend libraries | Three.js, Chart.js, jsPDF, jsPDF-AutoTable, Leaflet, GSAP |
| Fonts | Google Fonts: Space Grotesk, JetBrains Mono |
| Offline tooling | Python, NumPy, SciPy, GDAL, SQLite |

---

## 1. Data sources and APIs

### 1.1 Universe Data Booklet

| Source | What it provides | Endpoint / usage | Credit / license |
|---|---|---|---|
| **NASA Near-Earth Object (NEO) Web API** | Near-Earth Asteroid close-approach data | `https://api.nasa.gov/neo/rest/v1/feed` — used by `src/backend/client.py` and `scripts/fetch_data.py` | NASA open data (public domain). Uses `DEMO_KEY` by default. |
| **NASA Exoplanet Archive / IPAC** | Confirmed exoplanet catalog (`pscompPSC` table) | `https://exoplanetarchive.ipac.caltech.edu/` — `scripts/fetch_data.py`; local CSV `src/data/exoplanets.csv` | NASA/IPAC public data. |
| **NASA/JPL Small-Body Database** | Asteroid / small-body reference data credited in the project documentation | Referenced in `README.md`, `DEPENDENCIES.md`, and `THANK_YOU.md` as part of the NASA/JPL data family | NASA/JPL-Caltech public data. |

> **Note on the map-view exoplanet simulation:** Hostnames and confirmed-planet attributes (radius, mass, ESI, orbital period, discovery method) come from the NASA Exoplanet Archive catalog above. The bundled catalog does not include parallax distances, so host-star sky positions in the 3D map view are illustrative/original (placed across a simulated Milky Way), not real astrometric coordinates. Each exoplanet orbits its own host star rather than a single central Sun.

### 1.2 Planetary Explorer / Project Base

| Source | What it provides | Endpoint / usage | Credit / license |
|---|---|---|---|
| **NASA EONET** | Earth natural events (wildfires, storms, volcanoes) | `https://eonet.gsfc.nasa.gov/api/v3/events` | NASA public domain. |
| **NASA InSight Mars Weather** | Mars weather reports | `https://api.nasa.gov/insight_weather/` | NASA public domain. |
| **NASA DONKI** | Space-weather notifications (CME, flares, G-storms) | `https://api.nasa.gov/DONKI/` | NASA public domain. |
| **NASA/JPL Solar System Treks (WMTS)** | Moon LRO WAC Mosaic and Mars Viking MDIM21 basemap tiles | `https://trek.nasa.gov/tiles/...` — `Project Base/backend/api/tiles.py` | NASA/JPL-Caltech, public domain. Credit: "NASA/JPL-Caltech" or "NASA/JPL Solar System Treks". |
| **Open Notify** | Current ISS position and who is in space | `http://api.open-notify.org/iss-now.json`, `http://api.open-notify.org/astros.json` | Open Notify, open source. |
| **USGS Earthquake Hazards Program** | Global earthquake feed | `https://earthquake.usgs.gov/fdsnws/event/1/query` | USGS public domain. |
| **Open-Meteo Elevation API** | Elevation grids used by the Discovery Lab | `https://api.open-meteo.com/v1/elevation` | **CC BY 4.0**. Cite as: **Open-Meteo (https://open-meteo.com)**. |
| **Open-Meteo Forecast API** | Current temperature and wind | `https://api.open-meteo.com/v1/forecast` | **CC BY 4.0**. Cite as: **Open-Meteo (https://open-meteo.com)**. |

### 1.3 Terrain and reference datasets

These are processed offline or bundled as local terrain assets / reports. Regeneration instructions are in `Project Base/documentation.md` and `Project Base/docs/API.md`.

| Dataset | Provider | Usage | Credit / license |
|---|---|---|---|
| **LRO South Pole DEM** (Moon) | NASA / USGS Astrogeology Science Center | Lunar terrain assets and comparison reports; `moon.json`, `lunar_fingerprints.csv`, `moon_southpole_summary.txt` | Public domain. Credit: "NASA/GSFC/Arizona State University" and "USGS Astrogeology". |
| **MRO CTX Controlled DTM** (Mars) | NASA / USGS Astrogeology Science Center | Mars terrain assets and comparison reports; `jezero.json`, `site_comparison.csv` | Public domain. Credit: "Data provided by USGS Astrogeology Science Center". |
| **Copernicus DEM GLO-30** (Earth) | ESA / Airbus (AWS Open Data) | Earth terrain sites (McMurdo, Kerguelen, Axel Heiberg); `Copernicus_DSM_10_S77_00_E162_00.xml` metadata | Free to use with attribution. Credit: **"© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved."** Source: https://registry.opendata.aws/copernicus-dem/ |
| **Derived slope / roughness rasters and 30 m comparison tables** | Computed locally with GDAL, NumPy, and SciPy | `Project Base/output/reports/*.csv`, `*.txt`, and `frontend/assets/terrain/*.json` | Derived works; inherit source-data terms (NASA/USGS/ESA). |

### 1.4 Bundled local data files

| Local file | Source | Regeneration / usage | License / credit |
|---|---|---|---|
| `src/data/exoplanets.csv`, `src/data/exoplanets.json` | NASA Exoplanet Archive/IPAC confirmed exoplanet catalog | Regenerated with `scripts/fetch_data.py`; local CSV/JSON is tracked in the repo. | NASA/IPAC public data. |
| `src/data/asteroids.json`, `src/data/cached_asteroids.json` | NASA NEO Web API feed (runtime cache) | Regenerated from NASA every 7 days; cached asteroid files are gitignored. | NASA public domain. |
| `Project Base/output/reports/*.csv`, `Project Base/output/reports/*.txt` | Derived terrain comparison reports | Computed with `Project Base/scripts/final_compare.py` and `merge_all_sites.py` from LRO/CTX/Copernicus DEMs. | Derived works; inherit source-data terms. |
| `Project Base/data/raw/lunar_fingerprints.csv` | Lunar South Pole 12 m roughness fingerprint samples | Used by Scale Sensitivity (`/api/scale-sensitivity`); derived from LRO data. | Derived from NASA/USGS LRO data. |
| `Project Base/data/earth/Copernicus_DSM_10_S77_00_E162_00.xml` | Copernicus DEM GLO-30 metadata (Airbus/ESA) | Bundled metadata; the corresponding `.tif` DEMs are gitignored and regenerable. | ESA / Airbus, Copernicus. |
| `Project Base/frontend/assets/terrain/*.json`, `src/frontend/assets/terrain/*.json` | Pre-built 128×128 terrain windows | Generated from local DEM rasters by `Project Base/backend/build_terrain_assets.py`; source DEM is recorded in each JSON's `source_dem` field. | Derived from USGS LRO, USGS MRO CTX, and ESA/Copernicus data. |
| `Project Base/.cache/planetary-explorer/cache.sqlite3` | SQLite upstream response cache | Created at runtime from NASA, Open Notify, USGS, and Open-Meteo responses; gitignored. | Contains third-party data; provider terms apply. |

### 1.5 Earth basemaps (Planetary Explorer map atlas)

| Provider | Basemap | License / attribution |
|---|---|---|
| **Esri World Imagery** | Satellite imagery | Esri terms. Credit: "Esri, Maxar, Earthstar Geographics". https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer |
| **USGS The National Map** | Earth imagery basemap | Public domain. https://basemap.nationalmap.gov/ |
| **OpenStreetMap contributors** | Street basemap | **ODbL**. Credit: "© OpenStreetMap contributors". https://www.openstreetmap.org/copyright |
| **CARTO** | Dark basemap | CARTO terms. https://carto.com/ |

---

## 2. Local image assets

All encyclopedia images and the bundled Earth-clouds texture are stored offline under `src/frontend/assets/encyclopedia/` and `Project Base/frontend/assets/encyclopedia/`. They were downloaded from **Wikimedia Commons** with `scripts/fetch_encyclopedia_images.py`; the manifest is in each `assets/encyclopedia/manifest.json`. Attribution is also printed on each Planetary Explorer encyclopedia card.

The table below consolidates the per-file source, license, and author/credit recorded in `DEPENDENCIES.md`, `THANK_YOU.md`, `Project Base/backend/api/encyclopedia.py`, and the bundled manifests.

| Local file(s) | Wikimedia Commons source file | License | Author / credit |
|---|---|---|---|
| `sun.jpg` | `Sun_Releases_X1_5_Flare_on_August_7,_2023_(SVS14417_-_Aug_7_X1pt5_Flare_171-131_SDO).gif` | NASA image (public domain) | NASA/SDO |
| `mercury.jpg` | `Mercury_in_color_-_Prockter07_centered.jpg` | Public domain | NASA (MESSENGER / Prockter) |
| `venus.jpg` | `Venus_from_Mariner_10.jpg` | Public domain | NASA/JPL-Caltech (Mariner 10) |
| `earth.jpg` | Blue Marble 2012 / Apollo 17-era Earth imagery (`Blue_Marble_2012.jpg` / `The_Earth_seen_from_Apollo_17.jpg`) | Public domain | NASA / NASA Apollo 17 crew |
| `moon.jpg` | `Moon_near_side_LRO_WAC.jpg` / `LRO_WAC_Nearside_Mosaic.jpg` | Public domain | NASA/GSFC/Arizona State University (LRO) |
| `mars.jpg` | `OSIRIS_Mars_true_color.jpg` | **CC BY-SA 3.0 IGO** | ESA & MPS for OSIRIS Team (Rosetta) |
| `jupiter.jpg` | `Portrait_of_Jupiter_from_Cassini.jpg` | Public domain | NASA/JPL/Space Science Institute (Cassini) |
| `saturn.jpg` | `Saturn_global_view_from_Cassini,_rings_open_Better_Colour.png` | Public domain | NASA / JPL-Caltech / SSI; color composite by Gordan Ugarkov (Cassini) |
| `uranus.jpg` | `Uranus_Voyager2_color_calibrated.png` | **CC0** | Ardenau4 (Voyager 2 / PDS / OPUS) |
| `neptune.jpg` | `Neptune_Voyager2_color_calibrated.png` | **CC0** | NASA / Voyager 2 / PDS / OPUS / Ardenau4 |
| `pluto.jpg` | `Pluto_in_3-D.jpg` | Public domain | NASA/Johns Hopkins University Applied Physics Laboratory (Hubble) |
| `ceres.jpg` | `Ceres_-_RC3_-_Haulani_Crater_(22381131691)_(cropped).jpg` | Public domain | NASA/JPL-Caltech/UCLA/MPS/DLR/PSI (Dawn) |
| `io.jpg` | `Io_comparison_with_Earth_and_Moon.png` | Public domain | NASA / SwRI / MSSS / Jason Perry (Galileo) |
| `europa.jpg` | `PIA19048_realistic_color_Europa_mosaic_edited.jpg` | Public domain | NASA / JPL-Caltech / SETI Institute (Galileo) |
| `ganymede.jpg` | `Ganymede_-_Perijove_34_Composite.jpg` | **CC BY 2.0** | NASA/JPL-Caltech/SwRI/MSSS/Kevin M. Gill (Juno) |
| `callisto.jpg` | `Callisto-scarp.jpg` | Public domain | NASA (Galileo) |
| `titan.jpg` | `Titan_in_front_of_the_ring_and_Saturn.jpg` | Public domain | Cassini Imaging Team, NASA/JPL-Caltech/Space Science Institute |
| `enceladus.jpg` | `Enceladus_with_Saturn_(20901575102).jpg` | **CC BY-SA 2.0** | NASA/JPL-Caltech/Space Science Institute (Cassini) |
| `triton.jpg` | `PIA00340_Montage_of_Neptune_and_Triton.jpg` | Public domain | NASA, JPL (Voyager 2) |
| `phobos.jpg` | `Phobos_PIA10369.jpg` | Public domain | NASA/JPL-Caltech/University of Arizona (MGS) |
| `deimos.jpg` | `NASA-Deimos-MarsMoon-20090221.jpg` / MGS image | Public domain | NASA/JPL/University of Arizona (MGS) |
| **Earth cloud texture** (`earth_clouds.jpg`) | Earth cloud layer bundled for the 3D globe; source comment records "Solar System Scope / NASA Blue Marble". | NASA-derived image (public domain); confirm upstream terms before commercial redistribution | NASA Blue Marble / Solar System Scope. Used by `src/frontend/js/modules/map/map-viewer.js` and `src/frontend/three_view.js`. |
| `lib/images/marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png` | Leaflet default marker icons | MIT (bundled with Leaflet) | Vladimir Agafonkin / Leaflet contributors |

### License obligations for the bundled images

- **CC BY 2.0 (Ganymede)**, **CC BY-SA 2.0 (Enceladus)**, and **CC BY-SA 3.0 IGO (Mars)** require attribution to the named author and a link to the license. Attribution is printed on each encyclopedia card and repeated above. CC BY-SA also requires derivative works to be shared under the same license; the bundled images are not modified.
- **CC0 (Uranus, Neptune)** is a public-domain dedication; attribution is still given.
- **Public-domain / NASA images** may be used freely; NASA/JPL-Caltech attribution is provided as a courtesy.
- All images are sourced from Wikimedia Commons under CC BY / CC BY-SA / CC BY-SA 3.0 IGO / CC0 / public-domain licenses. See each file's Commons page for full terms: https://commons.wikimedia.org/

---

## 3. Bundled open-source dependencies

All frontend libraries are bundled offline under `src/frontend/lib/` (Universe Data Booklet) and `Project Base/frontend/lib/` (Planetary Explorer). Full license texts are shipped alongside the minified files where space permits.

| Library | UDB version | Planetary Explorer version | License | Author / source | Used for |
|---|---|---|---|---|---|
| **Three.js** | r128 | r160 | MIT | Three.js Authors — https://threejs.org/ | 3D globe, terrain lab, explorer, asteroid/exoplanet views |
| **OrbitControls** (Three.js addon) | r128-era | — | MIT | Three.js Authors — https://threejs.org/ | Camera orbit/zoom/pan controls (`src/frontend/lib/OrbitControls.js`) |
| **Chart.js** | 4.4.0 | 4.4.3 | MIT | Chart.js Contributors — https://www.chartjs.org/ | Analytics, histograms, comparison charts |
| **jsPDF** | 2.5.1 | 2.5.1 | MIT | James Hall & jsPDF contributors — https://github.com/parallax/jsPDF | Mission-plan PDF export (Planetary Explorer) and UDB `js/pdf.js` report helper |
| **jsPDF-AutoTable** | 3.5.28 | — | MIT | Simon Bengtsson — https://github.com/simonbengtsson/jsPDF-AutoTable | Table formatting in PDF reports (`src/frontend/lib/`, UDB only) |
| **Leaflet** | 1.9.4 | 1.9.4 | MIT | Vladimir Agafonkin, CloudMade & Leaflet contributors — https://leafletjs.com/ | Interactive map atlas (basemaps and marker icons) |
| **GSAP** | 3.12.5 | 3.12.5 | GreenSock Standard License | GreenSock — https://gsap.com/ | Animations in Planetary Explorer |

### License notes

- **Three.js, Chart.js, jsPDF, jsPDF-AutoTable, OrbitControls, and Leaflet** are MIT licensed.
- **GSAP** is distributed under the [GreenSock Standard License](https://gsap.com/standard-license/). It is free for most uses; review GSAP's terms before commercial redistribution.
- Bundled license/copyright headers are preserved inside each `lib/*.min.js` file and its `.map` where present.

---

## 4. Fonts

| Font | Source | License |
|---|---|---|
| **Space Grotesk** | Google Fonts — https://fonts.google.com/specimen/Space+Grotesk | SIL Open Font License 1.1 |
| **JetBrains Mono** | Google Fonts — https://fonts.google.com/specimen/JetBrains+Mono | SIL Open Font License 1.1 |

Loaded from `https://fonts.googleapis.com` in `src/frontend/index.html` and `src/frontend/style.css`.

---

## 5. Offline / development tooling

These tools are not bundled at runtime but are used to generate data, terrain assets, and reports.

| Tool | Version | License | Usage |
|---|---|---|---|
| **Python** | 3.13+ | PSF License | Backend (`http.server`, `urllib`, `json`, `sqlite3`, etc.) and build scripts |
| **NumPy** | — | BSD 3-Clause | Numerical processing in `Project Base/scripts/final_compare.py` and `build_terrain_assets.py` |
| **SciPy** | — | BSD 3-Clause | Image/terrain processing (`scipy.ndimage`) in `Project Base/scripts/final_compare.py` |
| **GDAL / OGR** | 3.10.3 | MIT (GDAL) | `gdalwarp`, `gdaldem slope`, `gdaldem roughness`, terrain asset generation |
| **SQLite** | — | Public domain | Upstream response cache (`Project Base/.cache/planetary-explorer/cache.sqlite3`) |
| **Git** | — | GPL-2.0 | Version control; Project Base history merged via `git filter-repo` |

---

## 6. Project authors and repository history

- **Universe Data Booklet** and its integrated **Planetary Explorer (Project Base)** — **MDSUWasi (Md. Shafi Un Wasi)**.
- **Project Base / Planetary Explorer** was originally an independent project (`github.com/MDSUWasi/Project-ELMO.git`) and is now a feature of Universe Data Booklet. See `docs/methodology.md` for the history-merge details.
- Repository: https://github.com/MDSUWasi/Universe-Data-Booklet
- License for application source code: **MIT** — see `LICENSE`.

---

## 7. Referenced documentation

This credits file was compiled from the project's own Markdown and HTML documentation:

- `README.md`
- `DEPENDENCIES.md`
- `THANK_YOU.md`
- `docs/methodology.md`
- `docs/terms.md`
- `docs/privacy.md`
- `Project Base/documentation.md`
- `Project Base/docs/API.md`
- `Project Base/docs/moon_southpole_summary.txt`
- `src/frontend/index.html`
- `src/frontend/pb-index.html`

For more detail, see the live app's `/dependencies`, `/credits`, `/thank-you`, `/terms`, and `/privacy` routes, and the Planetary Explorer "Credits & Provenance" modal.