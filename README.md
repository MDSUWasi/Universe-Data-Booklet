<h1 align="center"> 🌌 Universe Data Booklet</h1>

> **An interactive explorer for Near-Earth Asteroids and Exoplanets.**  
> *Built for students, educators and for study purpose* ``` I cannot gurrantee that all the data and calculations are accurate and correct. So, Please recheck before any serious use```


Universe Data Booklet transforms raw astronomical data into an intuitive and graphical experience. Whether you are tracking potentially hazardous asteroids or analyzing the habitability of distant exoplanets, this tool provides insights with **zero latency** thanks to its intelligent local caching architecture.

---

<h2 align="center">✨ Key Features</h2>

### 📊 **Dual-Dataset Analysis**
Seamlessly switch between two massive datasets:
- **Near-Earth Asteroids (NEO):** Tracking of objects within Earth's orbit. (It fetches data only once in 30 Days)
- **Confirmed Exoplanets:** A catalog of thousands of discovered worlds with calculated Earth Similarity Index (ESI). (Currently, this data is not updated in realtime, The site uses csv dataset for this)

### 🎨 **Immersive Visualization**
- **Dynamic Charts:** Real-time bar charts pop up powered by Chart.js to visualize size and velocity distributions.
- **3D Interactive View:** Explore objects as 3D spheres (Three.js) (pop up) with orbit rings and drag-to-rotate camera. Exoplanets and Asteroids have 2 different 3D view. Asteroids have a solar system simulation type 3D view.
- **Theme Switcher:** Toggle between **Cream**,**Neon**, **Solar**, and **Lab** themes (persisted in localStorage).
- **Detail Modal:** Click any row for a deep-dive into the object's data.
- **Search & Stats:** Client-side search across both datasets plus live stat cards.
- **Map View:** A visual map for locating both data. (Make sure to press the "more" button before viewing the map for exoplanets. because there are approximately 6,000 exoplanets and all of those data are not shown at once untill the more button is clicked and the Map view works on how many data is present on the interface.)
- **Study Mode:** A tab for study section. There user can practice flashcards, quiz, challenge, Compare etc.
- **Research Mode:** This mode gives user the ability to work on data which are present in the data but not specially sayed or identified.

### 🛡️ **Security & Privacy**
- Secure HTTP headers (X-Frame-Options, XSS protection, nosniff, CORS allow-list, Referrer-Policy).
- Path-traversal & encoded-traversal protection on static files.
- Sanitized user inputs (no raw HTML injection) & hidden internal errors in production.

[I have tried my best to ensure security. But this is a solo project if there is still any issue, please let me know]
---

<h2 align="center"> 🚀 Handling Thousands of Users (The best part)</h2>

One of the biggest challenges in public API projects is hitting rate limits when traffic spikes. Universe Data Booklet solves this with a **Smart Caching Layer**:

### How It Works
1.  **Single Fetch, Infinite Users:** When the first user requests data, the Python backend fetches it from the **NASA Public API**.
2.  **Intelligent Caching:** The data is stored locally on the server (`src/data/`) with a timestamp.
3.  **Automatic Refresh:** The cache remains valid for **30 days** (configurable). All subsequent users receive this cached data instantly.
4.  **Zero API Burden:** Even if 10,000+ users visits the site, the site hit the NASA API **once every 30 days**, completely solving the standard rate limits.

And, do not worry about storage. The site will automatically delete cache data which are older than 90 days. (This is because, I want to have the old data saved for some times before it is gone. This is because if we need the old data then this site have the saved version, But I can't gurrantee that it will be saved for 90 days.)
---


## 🛠 Technology Stack

- **Backend:** Python 3.13 (Standard Library `http.server`, `urllib`, `json`)
- **Frontend:** HTML5, CSS3 (Custom Animations), Vanilla JavaScript (ES6+)
- **Visualization:** Chart.js (Analytics), jsPDF (Reporting), annimation.js(It's name already told it's work by default.)
- **Data:** NASA NEO Web API & JPL Small-Body Database (CSV)
- **Deployment:** Run anywhere with Python 3.6+ (Linux, macOS, Windows/WSL)
- **Screen:** Use screen wider than 10 inch. If using mobile phone, then set the browser to desktop site. Currently this site have no capabilities to be run on Phone (I mean the deployed site, not the source code). The mobile version may be available in the future updates (But I can't tell on which version)

---

<h2 align="center"> 🚀 Quick Start Guide (For those who are using the source code directly)</h2>

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
Distributed under the MIT License (Because I want to give the others the many possible permissions. It is am educational project. So, please those who use the site and source please use it for good purpose. And also if anyone use my source please let me know how this helped you.). See LICENSE for more information.

### 🙏 Acknowledgments & Thank You

NASA: For providing free, open-access space data APIs.

Three.js, Chart.js, jsPDF: For powerful, open-source visualization libraries.





---- 
# Built with ❤️ for Curiosity.
