<h1 align="center"> 🌌 Universe Data Booklet</h1>

> **An interactive explorer for Near-Earth Asteroids and Exoplanets.**  
> *Built for students, educators.*

![License](https://img.shields.io/badge/License-MIT-green)

Universe Data Booklet transforms raw astronomical data into an intuitive and graphical experience. Whether you are tracking potentially hazardous asteroids or analyzing the habitability of distant exoplanets, this tool provides insights with **zero latency** thanks to its intelligent local caching architecture.

---

<h2 align="center">✨ Key Features</h2>

### 📊 **Dual-Dataset Analysis**
Seamlessly switch between two massive datasets:
- **Near-Earth Asteroids (NEO):** Tracking of objects within Earth's orbit.
- **Confirmed Exoplanets:** A catalog of thousands of discovered worlds with calculated Earth Similarity Index (ESI).

### 🎨 **Immersive Visualization**
- **Dynamic Charts:** Real-time bar charts powered by Chart.js to visualize size and velocity distributions.
- **Theme Switcher:** Toggle between "Neon" and "Solar" themes for any environment.

---

<h2 align="center"> 🚀 Handling Thousands of Users</h2>

One of the biggest challenges in public API projects is hitting rate limits when traffic spikes. Universe Data Booklet solves this with a **Smart Caching Layer**:

### How It Works
1.  **Single Fetch, Infinite Users:** When the first user requests data, the Python backend fetches it from the **NASA Public API**.
2.  **Intelligent Caching:** The data is stored locally on the server (`data/`) with a timestamp.
3.  **Automatic Refresh:** The cache remains valid for **30 days** (configurable). All subsequent users receive this cached data instantly.
4.  **Zero API Burden:** Even if 10,000+ users visits the site, the site hit the NASA API **once every 30 days**, completely solving the standard rate limits.

---


## 🛠 Technology Stack

- **Backend:** Python 3.13 (Standard Library `http.server`, `urllib`, `json`)
- **Frontend:** HTML5, CSS3 (Custom Animations), Vanilla JavaScript (ES6+)
- **Visualization:** Chart.js (Analytics), jsPDF (Reporting)
- **Data:** NASA NEO Web API & JPL Small-Body Database (CSV)
- **Deployment:** Run anywhere with Python 3.6+ (Linux, macOS, Windows/WSL)
- **Screen:** Use screen wider than 10 inch. If using mobile phone, then set the browser to desktop site. 

---

<h2 align="center"> 📁 Project Structure</h2>

```
UniverseDataBooklet/
├── data/                  # Cached JSON data & static CSVs
├── src/
│   ├── backend/           # Python logic (Server, Cache, API Client)
│   └── frontend/          # UI, Animations, JS Logic
│       ├── lib/           # Local copies of Three.js, Chart.js, jsPDF
│       └── ...            # Source files
├── docs/                  # Scientific methodology
├── tests/                 # Unit tests
├── .env                   # Environment variables (DO NOT COMMIT)
├── .gitignore             # Secure exclusion rules
└── README.md              # This file
```

<h2 align="center"> 🚀 Quick Start Guide</h2>

### Prerequisites

Python 3.13 installed
Internet connection (for initial data fetch)

### Installation


1) Clone the repository: git clone https://github.com/MDSUWasi/Universe-Data-Booklet.git

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


### 📜 License
Distributed under the MIT License. See LICENSE for more information.

### 🙏 Acknowledgments

NASA: For providing free, open-access space data APIs.

Three.js, Chart.js, jsPDF: For powerful, open-source visualization libraries.





---- 
# Built with ❤️ for the stars.
