<h5 align="right"><i>Last README Update: 11 November 2026</i></h4>
<h1 align="center"> 🌌 Universe Data Booklet</h1>

> **An interactive data explorer for Near-Earth Asteroids, Exoplanets, and planetary terrain.**  
> *Built for students, educators and for study purpose* 

<h3>
<p style="color:red"><b><u>I cannot gurrantee that all the data and calculations are accurate and correct. So, Please recheck before any serious use</b></u></p>
</h3>

![License](https://img.shields.io/badge/License-MIT-green)

![Hackatime](https://hackatime.hackclub.com/api/v1/badge/U0B5XFH01GQ/MDSUWasi/Universe-Data-Booklet)


Universe Data Booklet is an interactive astronomy and planetary-science website (its name says "booklet" but it is a web app) that transforms raw space data into an intuitive, graphical experience. It is **not limited to exoplanets and asteroids** -- it also embeds the **Planetary Explorer** research tool for terrain across Earth, the Moon, and Mars. Whether you are tracking potentially hazardous asteroids, analyzing the habitability of distant exoplanets, or screening candidate landing sites for slope and roughness, this tool provides insights with **zero latency** thanks to its intelligent local caching architecture.

---

<h2 align="center">✨ Key Features</h2>

### 📊 **Multi-Dataset Analysis**
Universe Data Booklet covers three domains, not just two:
- **🪐 Planetary Explorer (Project Base):** A browser-first research app for exploring, comparing, and planning across planetary terrain sites on Earth, the Moon, and Mars. Embedded as a **native in-page tab** (select the **🪐 Planetary Explorer** tab, or open `/pb/` standalone). Features an encyclopedia of the **full Solar System** — the **Sun** (with a direct-viewing eye-safety warning), Mercury, Venus, Earth, the Moon, Mars, Jupiter, Saturn, Uranus, Neptune, **Pluto**, **Ceres**, and 9 moons (Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Enceladus, Triton) — each with a bundled reference photo, a Leaflet map atlas with NASA Trek WMTS basemaps, a 3D Terrain Lab (Three.js), a Discovery Lab that screens any Earth coordinate for slope/relief, a Mission Planner wizard, terrain comparison, patch explorer, scale sensitivity, and a realtime dashboard -- all backed by a SQLite upstream-cache proxy (Open-Meteo, NASA, USGS, Open Notify).
- **Near-Earth Asteroids (NEO):** Tracking of objects within Earth's orbit. (It fetches new data every **7 days** and keeps cached data for 90 days.)
- **Confirmed Exoplanets:** A catalog of thousands (around 6,000 exoplanets) of discovered worlds with calculated Earth Similarity Index (ESI). (Currently, this data is not updated in realtime; the site uses a CSV dataset for this.)

### 🎨 **Immersive Visualization & Features**
- **Dynamic Charts:** Real-time bar charts pop up powered by Chart.js to visualize size and velocity distributions.
- **3D Interactive View:** Explore objects as 3D spheres (Three.js) (pop up) with orbit rings and drag-to-rotate camera. Exoplanets and Asteroids have 2 different 3D view. Asteroids have a solar system simulation type 3D view.
- **Theme Switcher:** Toggle between **Cream**,**Neon**, **Solar**, and **Lab** themes (persisted in localStorage).
- **Detail Modal:** Click any row for a deep-dive into the object's data.
- **Search & Stats:** Client-side search across the NEO and exoplanet datasets plus live stat cards.
- **Map View:** A visual map for locating both data. (Make sure to press the "more" button before viewing the map for exoplanets. because there are approximately 6,000 exoplanets and all of those data are not shown at once untill the more button is clicked and the Map view works on how many data is present on the interface.)
- **Study & Research Mode:** A tab for study section. There user can practice flashcards, quiz, challenge etc. This section also comes with other features like:- *Discover:* This mode gives user the ability to work on data which are present in the data set but not specifically indicated. *Compare:* Here users can compare at leat 2 expolanets/ asteroids in a diagram.

- **PDF Download:** Users can download the data loaded in the interphase as PDF inside their device. System will automatically create, edit and formate the PDF. To use this feature user must load all data in the site first (For example 50 exoplanets list are shown by default but the user want to download the PDF data of 100 exoplanets, then user have to click on load more once and then 100 exoplanets data will be shown) then click on PDF download button. Soon after this the PDF will get downloaded. 

### 🛡️ **Security & Privacy**
- Secure HTTP headers (X-Frame-Options, XSS protection, nosniff, CORS allow-list, Referrer-Policy).
- Path-traversal & encoded-traversal protection on static files.
- Sanitized user inputs (no raw HTML injection) & hidden internal errors in production.

<h4><p style="color:gray">[I have tried my best to ensure security. But this is a solo project (currently) if there is still any issue, please let me know]</p></h4>
---

<h2 align="center"> 🚀 Handling Thousands of Users (The best part)</h2>

One of the biggest challenges in public API projects is hitting rate limits when traffic spikes. Universe Data Booklet solves this with a **Smart Caching Layer**:

### How It Works
1.  **Single Fetch, Infinite Users:** When the first user requests data, the Python backend fetches it from the **NASA Public API**.
2.  **Intelligent Caching:** The data is stored locally on the server (`src/data/`) with a timestamp.
3.  **Automatic Refresh:** The cache remains valid for **7 days** (configurable). All subsequent users receive this cached data instantly.
4.  **Zero API Burden:** Even if 10,000+ users visits the site, the site hit the NASA API **once every 7 days**, completely solving the standard rate limits.

<h6>And, do not worry about storage. The site will automatically delete cache data which are older than 90 days. (This is because, I want to have the old data saved for some times before it is gone. This is because if we need the old data then this site have the saved version, But I can't gurrantee that it will be saved for 90 days.)</h6>
---


## 🛠 Technology Stack

- **Backend:** Python 3.13 (Standard Library `http.server`, `urllib`, `json`)
- **Frontend:** HTML5, CSS3 (Custom Animations), Vanilla JavaScript (ES6+)
- **Visualization:** Chart.js, jsPDF (Analytics & Reporting), annimation.js(It's name already told it's work by default.)
- **Integrated Feature:** **Project Base — Planetary Explorer** (Leaflet, Three.js, GSAP, Chart.js, jsPDF; SQLite upstream cache) served from the same server at `/pb/` and embedded as a native in-page tab.
- **All JS/CSS dependencies are bundled offline** under `src/frontend/lib/` and `Project Base/frontend/lib/` -- no CDN required after first load.
- **Data:** NASA NEO Web API & JPL Small-Body Database (CSV); Planetary terrain from LRO, Copernicus DEM, MRO CTX (via the Planetary Explorer feature)
- **Deployment:** Run anywhere with Python 3.6+ (Linux, macOS, Windows/WSL)
- **Screen:** Use screen wider than 10 inch. If using mobile phone, then set the browser to desktop site. Currently this site have no capabilities to be run on Phone (I mean the deployed site, not the source code). The mobile version may be available in the future updates (But I can't tell on which version)

---

<h2 align="center"> 🚀 Quick Start Guide (For those who are using the source code directly)</h2>

### Prerequisites

Python 3.13 installed
Internet connection (for initial data fetch)

### Installation


1) Clone the repository: git clone https://github.com/MDSUWasi/Universe-Data-Booklet.git  ```Or just download the source as .zip if you don't want it to be downloaded with all git history and git data```

2) cd Universe-Data-Booklet


3) Create a .env file in the root directory (if missing) and add your API key:
4) SERVER_PORT=8081
5) NASA_API_KEY=YOUR_NASA_API_KEY_HERE
6) DEBUG_MODE=false


5) Start the Server: python src/backend/server.py


5) Access the App: Open your browser and navigate to http://localhost:8081.

**Note: The source code uses public api by default. If anyone want to use this source code, they they have to update it with their own API.**



### 🤝 Contributing
This is an educational project designed to demonstrate secure, scalable web development. Feel free to fork, modify, and improve!

Fork the Project
Create your Feature Branch (git checkout -b feature/AmazingFeature)
Commit your Changes (git commit -m 'Add some AmazingFeature')
Push to the Branch (git push origin feature/AmazingFeature)
Open a Pull Request


### 📜 Legal & Privacy
- **[Terms & Conditions](/terms)** — educational-use disclaimer, acceptable use, third-party data licences, limitation of liability.
- **[Privacy Policy](/privacy)** — no accounts, no cookies, no analytics, no trackers; only `localStorage` preferences on your device.
- **[Dependencies](/dependencies)** — every bundled library, data source, and encyclopedia image with licence and author.
- **[Credits](CREDITS.md)** — a consolidated credit for every data source, API, bundled dependency, font, and local image asset (including the Project Base/Planetary Explorer feature).
- **[Thank You](/thank-you)** — citations for NASA, USGS, Open-Meteo, Open Notify, ESA/Copernicus, and the open-source library authors.

### 📜 License
Distributed under the MIT License (Because I want to give the others the many possible permissions. It is am educational project. So, please those who use the site and source please use it for good purpose. And also if anyone use my source please let me know how this helped you.).

### 🙏 Acknowledgments & Thank You
- Full citations for every data source and library: see **[THANK_YOU.md](THANK_YOU.md)**.
- Complete credits for every data source, API, bundled dependency, font, and local image: see **[CREDITS.md](CREDITS.md)**.
- Bundled dependencies, licenses, and data-source attributions: see **[DEPENDENCIES.md](DEPENDENCIES.md)** (renamed from `THIRD_PARTY_LICENSES.md`). See LICENSE for more information.

- NASA: For providing free, open-access space data APIs.
- Three.js, Chart.js, jsPDF: For powerful, open-source visualization libraries.



---
<h2 align="center"><u>Current Status</u></h3>
<h4 align="center"> Under <p style="color:green">Active</p> Development</h3>

---
---
# Built with ❤️ for Curiosity & ❤️ for Universe.
---