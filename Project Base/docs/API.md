# API Manifest — Planetary Explorer

Single source of truth for every API used by Planetary Explorer.

## Own endpoints (backend)

| # | Method + path | Purpose | Implements | Served by |
|---|---|---|---|---|
| 1 | `GET /api/health` | Server + cache status probe | `backend/server.py:AppHandler.do_GET` | `backend/server.py` |
| 2 | `GET /api/sites` | Committed 5-site summary JSON (area, roughness) | `backend/api/routes.py:sites_payload` | `backend/server.py` |
| 3 | `GET /api/patches` | Patch-level records for Patch Explorer | `backend/api/routes.py:patches_payload` | `backend/server.py` |
| 4 | `GET /api/scale-sensitivity` | 12 m lunar fingerprints + 90 m reference | `backend/api/routes.py:scale_sensitivity_payload` | `backend/server.py` |
| 5 | `GET /api/elevation?latitude=..&longitude=..` | Proxies Open-Meteo elevation (3x3 grid) | `backend/api/elevation.py:fetch_elevation` | `backend/server.py` |
| 6 | `GET /api/weather?lat=..&lon=..` | Proxies Open-Meteo current weather | `backend/api/weather.py:fetch_weather` | `backend/server.py` |
| 7 | `GET /api/tiles/{moon\|mars}/{z}/{row}/{column}.jpg` | Proxies NASA Trek WMTS tiles | `backend/api/tiles.py:fetch_tile` | `backend/server.py` |
| 8 | `GET /api/encyclopedia` | All encyclopedia data (planets, moons, sites) | `backend/api/routes.py:encyclopedia_payload` | `backend/server.py` |
| 9 | `GET /api/encyclopedia/planets` | List of planetary bodies | `backend/api/routes.py:planets_payload` | `backend/server.py` |
| 10 | `GET /api/encyclopedia/moons` | List of moons | `backend/api/routes.py:moons_payload` | `backend/server.py` |
| 11 | `GET /api/encyclopedia/sites` | Diverse terrain candidate sites (all bodies) | `backend/api/routes.py:sites_payload_v2` | `backend/server.py` |
| 12 | `GET /api/encyclopedia/sites/{body}` | Sites filtered by body | `backend/api/routes.py:sites_by_body_payload` | `backend/server.py` |
| 13 | `GET /api/encyclopedia/planet/{id}` | Single planet entry | `backend/api/routes.py:planet_payload` | `backend/server.py` |
| 14 | `GET /api/encyclopedia/moon/{id}` | Single moon entry | `backend/api/routes.py:moon_payload` | `backend/server.py` |
| 15 | `GET /api/encyclopedia/site/{id}` | Single terrain site entry | `backend/api/routes.py:site_payload` | `backend/server.py` |
| 16 | `GET /api/nasa/apod` | NASA Astronomy Picture of the Day | `backend/api/routes.py:apod_payload` | `backend/server.py` |
| 17 | `GET /api/nasa/earth-events` | Earth natural events (EONET) | `backend/api/routes.py:earth_events_payload` | `backend/server.py` |
| 18 | `GET /api/nasa/mars-weather` | InSight Mars weather report | `backend/api/routes.py:mars_weather_payload` | `backend/server.py` |
| 19 | `GET /api/nasa/space-weather` | Space weather notifications (DONKI) | `backend/api/routes.py:space_weather_payload` | `backend/server.py` |
| 20 | `GET /api/space/iss` | Current ISS position (Open Notify) | `backend/api/routes.py:iss_position_payload` | `backend/server.py` |
| 21 | `GET /api/space/astronauts` | Who is in space (Open Notify) | `backend/api/routes.py:astronauts_payload` | `backend/server.py` |
| 22 | `GET /api/earth/earthquakes` | Recent earthquakes worldwide (USGS) | `backend/api/routes.py:earthquakes_payload` | `backend/server.py` |

All upstream calls pass through the shared cache in `backend/api/cache.py:CacheStore`.

## Browser-side calls

| # | What | Where | Endpoint |
|---|---|---|---|
| B1 | Site metrics refresh | `frontend/js/modules/api/site-metrics.js` | `GET /api/sites` |
| B2 | Patch Explorer data | `frontend/js/modules/patches/patch-explorer.js` | `GET /api/patches` |
| B3 | Scale Sensitivity data | `frontend/js/modules/scale/scale-sensitivity.js` | `GET /api/scale-sensitivity` |
| B4 | Discovery Lab elevation | `frontend/js/modules/discovery/discovery.js:fetchGrid` | `GET /api/elevation` |
| B5 | Encyclopedia data | `frontend/js/modules/encyclopedia/encyclopedia.js` | `GET /api/encyclopedia` |
| B6 | Realtime data | `frontend/js/modules/realtime/realtime.js` | Multiple `/api/nasa/*`, `/api/space/*`, `/api/earth/*` |
| B7 | Earth basemap tiles | `frontend/js/modules/map/basemaps.js` | direct (not proxied) |
| B8 | Moon/Mars basemap tiles | `frontend/js/modules/map/map-viewer.js` | `GET /api/tiles/...` |

## External services (free, public, no paid account required)

| # | Service | Used by | Purpose | Licence |
|---|---|---|---|---|
| E1 | Open-Meteo Elevation API | `backend/api/elevation.py` | 3x3 elevation grid | CC BY 4.0 |
| E2 | Open-Meteo Forecast API | `backend/api/weather.py` | Current temperature + wind | CC BY 4.0 |
| E3 | NASA Solar System Treks (WMTS) | `backend/api/tiles.py` | Moon LRO WAC, Mars Viking MDIM21 | Public Domain |
| E4 | NASA APOD | `backend/api/nasa.py` | Astronomy Picture of the Day | NASA terms (DEMO_KEY) |
| E5 | NASA EONET | `backend/api/nasa.py` | Earth natural events | NASA terms (DEMO_KEY) |
| E6 | NASA InSight Weather | `backend/api/nasa.py` | Mars weather | NASA terms (DEMO_KEY) |
| E7 | NASA DONKI | `backend/api/nasa.py` | Space weather notifications | NASA terms (DEMO_KEY) |
| E8 | Open Notify ISS | `backend/api/opennotify.py` | Current ISS position | Open Notify terms |
| E9 | Open Notify Astronauts | `backend/api/opennotify.py` | Who is in space | Open Notify terms |
| E10 | USGS Earthquakes | `backend/api/earth_events.py` | Recent earthquakes worldwide | USGS terms |
| E11 | Esri World Imagery | `frontend/js/modules/map/basemaps.js` | Earth satellite basemap | Esri terms |
| E12 | USGS The National Map | `frontend/js/modules/map/basemaps.js` | Earth imagery basemap | Public Domain |
| E13 | OpenStreetMap | `frontend/js/modules/map/basemaps.js` | Earth street basemap | ODbL |
| E14 | CARTO | `frontend/js/modules/map/basemaps.js` | Earth dark basemap | CARTO terms |

## Cache policy

| Entry type | Fresh TTL | Stale TTL | Eviction |
|---|---|---|---|
| Elevation (E1) | 30 days | 365 days | LRU by insertion time |
| Weather (E2) | 15 minutes | 30 days | LRU by insertion time |
| NASA tiles (E3) | never (immutable) | never | LRU by insertion time |
| Static assets | 30 days | 365 days | LRU by insertion time |
| NASA / Open Notify / USGS APIs (E4-E10) | 15 minutes | 30 days | LRU by insertion time |

Store bound: 128 MiB total, 5 MiB per entry. Stale data is served when an upstream request fails.
