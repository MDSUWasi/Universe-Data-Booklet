# Universe-Data-Booklet

# 🌌 Universe Data Booklet

> **An interactive, privacy-focused explorer for Near-Earth Asteroids and Exoplanets.**

**Universe Data Booklet** is a local-first web application designed to analyze celestial data, estimate planetary habitability, and visualize cosmic proximity. Built for students, educators, and amateur astronomers, it transforms raw NASA/JPL data into an intuitive, animated experience.

---

## 🚀 Features

- **🔭 Habitability Engine**: Calculates the "Water Probability" for exoplanets based on orbital period, stellar luminosity, and equilibrium temperature.
- **📊 Dual-Dataset Analysis**: Simultaneously visualizes:
  - **Near-Earth Asteroids** (from `asteroids.json`)
  - **Confirmed Exoplanets** (from `exoplanets.csv`)
- **🎨 Immersive UI**: A modern, responsive interface with smooth animations and data-driven visualizations.
- **🔒 Privacy-First**: Runs entirely on your local machine. No data is sent to external servers unless explicitly requested for live updates.
- **🎓 Educational Mode**: Simplified explanations for students alongside detailed metrics for researchers.

---

## 🛠 Technology Stack

- **Backend**: Python 3.x (Data processing, calculations, API handling)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Visualization**: Custom CSS Animations & JS Canvas (No heavy frameworks required for speed)
- **Version Control**: Git
- **OS**: Linux (Debian), macOS, or Windows (via WSL)

---

## 📁 Project Structure

```text
UniverseDataBooklet/
├── data/                  # Local datasets (asteroids.json, exoplanets.csv)
├── src/
│   ├── backend/           # Python logic (calculations, data loading)
│   └── frontend/          # HTML, CSS, JS (UI and animations)
├── tests/                 # Unit tests for habitability algorithms
├── docs/                  # Methodology and scientific references
├── assets/                # Images and animation assets
├── .gitignore             # Git exclusion rules
└── README.md              # This file
