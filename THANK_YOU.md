# Thank You

This project would not have been possible without the people, teams, and open
data sources listed below.  Universe Data Booklet is built on top of their free,
public work.

---

## 🛰️ Data & API Providers

### NASA
- **NASA NEO Web API** — Near-Earth Object close-approach data
  (`api.nasa.gov/neo`)
- **NASA DONKI** — Solar storm / geomagnetic data
- **NASA InSight Mars Weather**
- **NASA Solar System Treks** — LRO WAC Mosaic (Moon) & Viking MDIM21 (Mars)
  tile rasters, served through the NASA/JPL Trek WMTS
- **NASA Exoplanet Archive** (via IPAC) — confirmed exoplanet catalog
- **NASA/JPL Small-Body Database**

> NASA data is public domain.  Attribution: "NASA/JPL-Caltech" where applicable.

### USGS
- **USGS Earthquake Hazards Program** — real-time earthquake feed
  (`earthquake.usgs.gov`).  USGS data is public domain.

### Open-Meteo
- **Open-Meteo** — elevation & current-weather API.
  Licensed **CC BY 4.0**.  Cite as: *Open-Meteo (https://open-meteo.com)*.

### Open Notify
- **Open Notify** — live ISS position and "who is in space" endpoints.
  Open-source; see `open-notify.org`.

### ESA / Copernicus
- **ESA / Copernicus DEM** — elevation reference data used by the Planetary
  Explorer terrain comparisons.

### Full Solar System encyclopedia data
The encyclopedia covers the Sun, Mercury, Venus, Earth, the Moon, Mars,
Jupiter, Saturn, Uranus, Neptune, Pluto, Ceres, and 9 moons (Phobos, Deimos,
Io, Europa, Ganymede, Callisto, Titan, Enceladus, Triton).  Physical figures
(mean diameter, mass, gravity, atmosphere, temperatures, orbits, satellite
counts) are compiled from **NASA/JPL-Caltech**, **USGS**, **ESA**, and other
public-domain sources and are suitable for educational use.

---

## 🖼️ Encyclopedia Reference Images

The Planetary Explorer encyclopedia renders a reference photo for every body.
All 21 images are bundled **offline** under
`Project Base/frontend/assets/encyclopedia/`, sourced from **Wikimedia
Commons**.  Each carries its source file, license, and author/credit as
required by that license — even when the app runs fully offline.

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
| Uranus | `Uranus_Voyager2_color_calibrated.png` | **CC0** | Ardenau4 (Voyager 2 / PDS / OPUS) |
| Neptune | `Neptune_Voyager2_color_calibrated.png` | **CC0** | NASA / Voyager 2 / PDS / OPUS / Ardenau4 |
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

#### License obligations honoured
- **CC BY 2.0 (Ganymede)**, **CC BY-SA 2.0 (Enceladus)**, and
  **CC BY-SA 3.0 IGO (Mars)** require attribution to the named author and a link
  to the license.  Attribution is printed on each encyclopedia card and in
  [DEPENDENCIES.md](DEPENDENCIES.md).  CC BY-SA also requires that derivative
  works be shared under the same license — this project does not modify those
  images.
- **CC0 (Uranus, Neptune)** is a public-domain dedication; no further
  obligations, though attribution is still given.
- All images are retrieved from Wikimedia Commons under CC BY / CC BY-SA /
  CC0 / public-domain licenses; see each file's Commons page for the full
  terms.

> **Cite this project:** MDSUWasi, *Universe Data Booklet* (integrated with
> Project Base — Planetary Explorer), 2026.

---

## 💻 Open-Source Libraries

| Library | Authors | License |
|---|---|---|
| **Three.js** (r160) | mrdoob and the Three.js authors | MIT |
| **Chart.js** (4.4.0) | Chart.js Contributors | MIT |
| **jsPDF** (2.5.1) | James Hall & jsPDF Team | MIT |
| **jsPDF-AutoTable** (3.5.28) | Simon Bengtsson | MIT |
| **Leaflet** (1.9.4) | Vladimir Agafonkin & Leaflet contributors | MIT |
| **GSAP** (3.12.5) | GreenSock | Standard License |

Full license texts and copyright notices are bundled with the libraries under
`src/frontend/lib/` and `Project Base/frontend/lib/`, and summarised in
[DEPENDENCIES.md](DEPENDENCIES.md).

---

## 🙏 Acknowledgments

- The NASA, USGS, Open-Meteo, Open Notify, and ESA/Copernicus teams for making
  planetary and Earth science data freely available.
- The maintainers of Three.js, Chart.js, jsPDF, Leaflet, and GSAP for building
  and sustaining these libraries under permissive licenses.
- Every educator, student, and curious explorer who uses or contributes to this
  project.

> Made with 💜 for Curiosity & 💜 for Universe.