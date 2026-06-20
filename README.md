# 🌌 Universe Data Booklet

> **An interactive, privacy-first explorer for Near-Earth Asteroids and Exoplanets.**  
> *Built for students, educators. Powered by NASA, secured by design.*

![Security](https://img.shields.io/badge/Security-Audited-blue)
![License](https://img.shields.io/badge/License-MIT-green)

Universe Data Booklet transforms raw astronomical data into an intuitive, animated experience. Whether you are tracking potentially hazardous asteroids or analyzing the habitability of distant exoplanets, this tool provides real-time insights with **zero latency** thanks to its intelligent local caching architecture.

---

## ✨ Key Features

### 🔭 **Habitability Engine**
Calculates the "Water Probability" for exoplanets based on orbital period, stellar luminosity, and equilibrium temperature. Get instant feedback on whether a planet could support liquid water.

### 📊 **Dual-Dataset Analysis**
Seamlessly switch between two massive datasets:
- **Near-Earth Asteroids (NEO):** Tracking of objects within Earth's orbit.
- **Confirmed Exoplanets:** A catalog of thousands of discovered worlds with calculated Earth Similarity Index (ESI).

### 🎨 **Immersive Visualization**
- **3D Galaxy View:** Interactive WebGL rendering of celestial bodies using Three.js.
- **Dynamic Charts:** Real-time bar charts powered by Chart.js to visualize size and velocity distributions.
- **Theme Switcher:** Toggle between "Neon Void," "Solar Flare," and "Lab White" themes for any environment.

---

## 🚀 Scalability: Handling Thousands of Users

One of the biggest challenges in public API projects is hitting rate limits when traffic spikes. Universe Data Booklet solves this with a **Smart Caching Layer**:

### How It Works
1.  **Single Fetch, Infinite Users:** When the first user requests data, the Python backend fetches it from the **NASA Public API**.
2.  **Intelligent Caching:** The data is stored locally on the server (`data/`) with a timestamp.
3.  **Automatic Refresh:** The cache remains valid for **7 days** (configurable). All subsequent users receive this cached data instantly.
4.  **Zero API Burden:** Even if 10,000 users visit your site, you only hit the NASA API **once every 7 days**, completely bypassing standard rate limits.

> **Result:** Your showcase remains fast, free, and accessible to unlimited users without paying for premium API tiers.

---


## 🛠 Technology Stack

- **Backend:** Python 3.x (Standard Library `http.server`, `urllib`, `json`)
- **Frontend:** HTML5, CSS3 (Custom Animations), Vanilla JavaScript (ES6+)
- **Visualization:** Three.js (3D), Chart.js (Analytics), jsPDF (Reporting)
- **Data:** NASA NEO Web API & JPL Small-Body Database (CSV)
- **Deployment:** Run anywhere with Python 3.6+ (Linux, macOS, Windows/WSL)

---

## 📁 Project Structure

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

## 🚀 Quick Start Guide

# Prerequisites

Python 3.x installed
Internet connection (for initial data fetch)

# Installation


Clone the repository:
git clone <your-repo-url>
cd UniverseDataBooklet


Configure Environment:

Create a .env file in the root directory (if missing) and add your API key:

SERVER_PORT=8081

NASA_API_KEY=YOUR_NASA_API_KEY_HERE

DEBUG_MODE=false


Start the Server:
python src/backend/server.py


Access the App:
Open your browser and navigate to http://localhost:8081.



# 🧪 Usage Examples
Checking Habitability

Navigate to the Exoplanets tab.
Enter a planet name (e.g., Kepler-186f) in the "Habitability Scanner".
Click Scan to see its Earth Similarity Index and water probability.

Exporting Reports

Filter your data table by category.
Click the PDF Report button (top right) to generate a downloadable summary of the current view.


# 🤝 Contributing
This is an educational project designed to demonstrate secure, scalable web development. Feel free to fork, modify, and improve!

Fork the Project
Create your Feature Branch (git checkout -b feature/AmazingFeature)
Commit your Changes (git commit -m 'Add some AmazingFeature')
Push to the Branch (git push origin feature/AmazingFeature)
Open a Pull Request


# 📜 License
Distributed under the MIT License. See LICENSE for more information.
# 🙏 Acknowledgments

NASA: For providing free, open-access space data APIs.
Three.js, Chart.js, jsPDF: For powerful, open-source visualization libraries.



# Built with ❤️ for the stars.
