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
| **NASA DONKI** | `https://api.nasa.gov/DONKI` | NASA public domain |
| **NASA InSight Mars Weather** | `https://api.nasa.gov/insight_weather/` | NASA public domain |
| **NASA Solar System Treks (WMTS)** | Moon: LRO WAC Mosaic; Mars: Viking MDIM21 | NASA/JPL-Caltech public-domain rasters |
| **Open Notify** | ISS position & "who is in space" | Open Notify (open source) |
| **USGS Earthquakes** | `https://earthquake.usgs.gov/fdsnws/event/1/query` | USGS public domain |
| **Open-Meteo** | Elevation & current weather | **CC BY 4.0** — cite as "Open-Meteo (https://open-meteo.com)" |
| **Encyclopedia figures** | Compiled from NASA/USGS & ESA public sources | Public-domain / open data |

### Encyclopedia Reference Images (bundled offline)

The Planetary Explorer encyclopedia renders a reference photo for every body
(21 images, cached offline under
`Project Base/frontend/assets/encyclopedia/`, sourced from Wikimedia Commons).
Each entry below carries the **source file**, **license**, and **author/credit**
as required by that license — even when the app runs fully offline.

| Body | Wikimedia Commons source file | License | Author / Credit |
|---|---|---|---|
| Sun | `Sun_Releases_X1_5_Flare_on_August_7,_2023_(SVS14417_-_Aug_7_X1pt5_Flare_171-131_SDO).gif` | NASA image (public domain) | NASA/SDO |
| Mercury | `Mercury_in_color_-_Prockter07_centered.jpg` | Public domain | NASA (MESSENGER / Prockter) |
| Venus | `Venus_from_Mariner_10.jpg` | Public domain | NASA/JPL-Caltech (Mariner 10) |
| Earth | `The_Earth_seen_from_Apollo_17.jpg` | Public domain | NASA/Apollo 17 crew |
| Moon | `LRO_WAC_Nearside_Mosaic.jpg` | Public domain | NASA/GSFC/Arizona State University (LRO) |
| Mars | `OSIRIS_Mars_true_color.jpg` | **CC BY-SA 3.0 IGO** | ESA & MPS for OSIRIS Team (Rosetta) |
| Jupiter | `Portrait_of_Jupiter_from_Cassini.jpg` | Public domain | NASA/JPL/Space Science Institute (Cassini) |
| Saturn | `Saturn_global_view_from_Cassini,_rings_open_Better_Colour.png` | Public domain | NASA / JPL-Caltech / SSI / color composite by Gordan Ugarkov (Cassini) |
| Uranus | `Uranus_Voyager2_color_calibrated.png` | **CC0** (public domain dedication) | Ardenau4 (Voyager 2 / PDS / OPUS) |
| Neptune | `Neptune_Voyager2_color_calibrated.png` | **CC0** (public domain dedication) | NASA / Voyager 2 / PDS / OPUS / Ardenau4 |
| Pluto | `Pluto_in_3-D.jpg` | Public domain | NASA/Johns Hopkins University Applied Physics Laboratory (Hubble) |
| Ceres | `Ceres_-_RC3_-_Haulani_Crater_(22381131691)_(cropped).jpg` | Public domain | NASA/JPL-Caltech/UCLA/MPS/DLR/PSI (Dawn) |
| Io | `Io_comparison_with_Earth_and_Moon.png` | Public domain | NASA / SwRI / MSSS / Jason Perry (Galileo) |
| Europa | `PIA19048_realistic_color_Europa_mosaic_edited.jpg` | Public domain | NASA / JPL-Caltech / SETI Institute (Galileo) |
| Ganymede | `Ganymede_-_Perijove_34_Composite.jpg` | **CC BY 2.0** | NASA/JPL-Caltech/SwRI/MSSS/Kevin M. Gill (Juno) |
| Callisto | `Callisto-scarp.jpg` | Public domain | NASA (Galileo) |
| Titan | `Titan_in_front_of_the_ring_and_Saturn.jpg` | Public domain | Cassini Imaging Team, NASA/JPL-Caltech/Space Science Institute |
| Enceladus | `Enceladus_with_Saturn_(20901575102).jpg` | **CC BY-SA 2.0** | NASA/JPL-Caltech/Space Science Institute (Cassini) |
| Triton | `PIA00340_Montage_of_Neptune_and_Triton.jpg` | Public domain | NASA, JPL (Voyager 2) |
| Phobos | `Phobos_PIA10369.jpg` | Public domain | NASA/JPL-Caltech/University of Arizona (MGS) |
| Deimos | `NASA-Deimos-MarsMoon-20090221.jpg` | Public domain | NASA/JPL/University of Arizona (MGS) |

#### License obligations for the bundled images
- **CC BY 2.0 (Ganymede)** and **CC BY-SA 2.0 (Enceladus)** and
  **CC BY-SA 3.0 IGO (Mars)** require **attribution** to the named author and a
  link to the license.  Attribution is printed on each encyclopedia card and in
  this file.  CC BY-SA also requires that derivative works be shared under the
  same license — this project does not modify those images.
- **CC0 (Uranus, Neptune)** is a public-domain dedication; no further
  obligations, though attribution is still given.
- **Public-domain / NASA images** may be used freely; NASA/JPL-Caltech
  attribution is given as a courtesy.
- All images are **retrieved from Wikimedia Commons under CC BY / CC BY-SA /
  CC0 / public-domain licenses**; see each file's
  [Commons page](https://commons.wikimedia.org) for the full terms.

---

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