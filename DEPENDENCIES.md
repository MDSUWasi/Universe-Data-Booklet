# Dependencies

This project bundles open-source libraries and relies on free public data
feeds.  Every JavaScript/CSS dependency is shipped **offline** under
`src/frontend/lib/` (Universe Data Booklet) and
`Project Base/frontend/lib/` (Planetary Explorer) so the apps work with no
network connection after the first load.

---

## Bundled Frontend Libraries

| Library | Version | License | Source | Usage |
|---|---|---|---|---|
| **Three.js** | r160 (MIT) | MIT | `mrdoob/three.js` | 3D visualization of celestial bodies & terrain (both apps) |
| **Chart.js** | 4.4.0 (MIT) | MIT | `chartjs/Chart.js` | Data analytics & histograms (Universe Data Booklet) |
| **jsPDF** | 2.5.1 (MIT) | MIT | `parallax/jsPDF` | PDF report generation (both apps) |
| **jsPDF-AutoTable** | 3.5.28 (MIT) | MIT | `simonbengtsson/jsPDF-AutoTable` | Table formatting in PDF reports (Universe Data Booklet) |
| **GSAP** | 3.12.5 | GreenSock Standard License | `greensock.com/gsap` | Animations (Planetary Explorer) |
| **Leaflet** | 1.9.4 (MIT) | MIT | `leafletjs/Leaflet` | Interactive map atlas with NASA Trek basemaps (Planetary Explorer) |

### License notes
- **Three.js, Chart.js, jsPDF, jsPDF-AutoTable, Leaflet** are MIT licensed. The full
  MIT text is reproduced at the bottom of this file.
- **GSAP** is distributed under the [GreenSock Standard
  License](https://greensock.com/standard-license/).  It is free for most uses;
  see the GSAP license terms before commercial redistribution.

---

## Data Sources

All data is fetched at runtime from free, public APIs and cached locally. No
paid accounts are required.

### Universe Data Booklet
| Source | Endpoint | License / Attribution |
|---|---|---|
| **NASA NEO Web API** | `https://api.nasa.gov/neo/rest/v1/feed` | NASA open data (public domain); uses NASA `DEMO_KEY` by default |
| **NASA JPL Small-Body Database** | Exoplanet/asteroid catalog CSV | NASA/JPL-Caltech public data |
| **NASA Exoplanet Archive** | `https://exoplanetarchive.ipac.caltech.edu` (pscompPSC table) | NASA/IPAC public data |

### Planetary Explorer (Project Base)
| Source | Endpoint | License / Attribution |
|---|---|---|
| **NASA Astronomy Picture of the Day (APOD)** | `https://api.nasa.gov/planetary/apod` | NASA public domain |
| **NASA DONKI** | `https://api.nasa.gov/DONKI` | NASA public domain |
| **NASA InSight Mars Weather** | `https://api.nasa.gov/insight_weather/` | NASA public domain |
| **NASA Solar System Treks (WMTS)** | Moon: LRO WAC Mosaic; Mars: Viking MDIM21 | NASA/JPL-Caltech public-domain rasters |
| **Open Notify** | ISS position & "who is in space" | Open Notify (open source) |
| **USGS Earthquakes** | `https://earthquake.usgs.gov/fdsnws/event/1/query` | USGS public domain |
| **Open-Meteo** | Elevation & current weather | **CC BY 4.0** — cite as "Open-Meteo (https://open-meteo.com)" |
| **Encyclopedia figures** | Compiled from NASA/USGS & ESA public sources | Public-domain / open data |

### Cached / committed datasets
- `src/data/exoplanets.csv`, `src/data/asteroids.json`, `src/data/cached_asteroids.json`
  (Universe Data Booklet, regenerable from the sources above)
- `Project Base/output/reports/*.csv`, `Project Base/data/raw/lunar_fingerprints.csv`,
  `Project Base/frontend/assets/terrain/*.json` (Planetary Explorer, compiled
  from NASA/USGS public data)

---

## MIT License Text

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.