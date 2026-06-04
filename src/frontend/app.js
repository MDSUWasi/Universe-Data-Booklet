// Load Data on Startup
document.addEventListener('DOMContentLoaded', async () => {
    await loadStats();
});

async function loadStats() {
    try {
        // Fetch Asteroids
        const astroRes = await fetch('/api/asteroids');
        const astroData = await astroRes.json();
        const countAstro = Array.isArray(astroData) ? astroData.length : 0;
        document.getElementById('asteroid-count').innerText = `${countAstro} Near-Earth Objects`;

        // Fetch Exoplanets
        const expoRes = await fetch('/api/exoplanets');
        const expoData = await expoRes.json();
        const countExpo = Array.isArray(expoData) ? expoData.length : 0;
        document.getElementById('exoplanet-count').innerText = `${countExpo} Confirmed Planets`;
    } catch (error) {
        console.error("Error loading data:", error);
        document.getElementById('asteroid-count').innerText = "Error loading data";
    }
}

async function checkHabitability() {
    const planetName = document.getElementById('planet-input').value.trim();
    if (!planetName) {
        alert("Please enter a planet name!");
        return;
    }

    const resultDisplay = document.getElementById('result-display');
    const resultName = document.getElementById('result-name');
    const resultStatus = document.getElementById('result-status');
    const waterBadge = document.getElementById('water-badge');
    const resultNote = document.getElementById('result-note');

    resultDisplay.classList.remove('hidden');
    resultName.innerText = `Analyzing ${planetName}...`;
    resultStatus.innerText = "Fetching data...";
    waterBadge.innerText = "--";
    waterBadge.style.background = "#333";
    waterBadge.style.color = "#aaa";

    try {
        const res = await fetch(`/api/habitability?planet_name=${encodeURIComponent(planetName)}`);
        const data = await res.json();

        if (data.error) {
            resultStatus.innerText = data.error;
            return;
        }

        // Update UI
        resultName.innerText = data.planet;
        resultStatus.innerText = data.status;
        resultNote.innerText = data.note;

        // Style the badge based on probability
        const prob = data.water_probability;
        waterBadge.innerText = prob;
        
        if (prob.includes("High")) {
            waterBadge.style.background = "var(--success)";
            waterBadge.style.color = "#000";
        } else if (prob.includes("Low")) {
            waterBadge.style.background = "var(--danger)";
            waterBadge.style.color = "#fff";
        } else {
            waterBadge.style.background = "var(--warning)";
            waterBadge.style.color = "#000";
        }

    } catch (error) {
        resultStatus.innerText = "Connection Error";
        console.error(error);
    }
}