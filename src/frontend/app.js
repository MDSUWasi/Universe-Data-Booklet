// src/frontend/app.js
// I am the main application logic

// --- 1. STATE MANAGEMENT ---
// I track which tab is active (asteroids or exoplanets)
let currentTab = 'asteroids';
// I store the fetched data here
let currentData = [];
// I track if data is currently loading to prevent double-fetching
let isLoading = false;

// --- 2. DOM ELEMENTS ---
// I grab the HTML elements I need to update
const dataContainer = document.getElementById('data-container');
const statsDisplay = document.getElementById('stats-display');
const habitabilityResult = document.getElementById('habitability-result');

// --- 3. THEME SWITCHER ---
// I change the CSS theme variable when a button is clicked
function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    // I update the active button style
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if (btn.textContent.toLowerCase().includes(themeName.toLowerCase())) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// --- 4. FETCH DATA (CORE LOGIC) ---
// I fetch data from the backend API
async function fetchData() {
    // If already loading, I stop
    if (isLoading) return;
    isLoading = true;
    
    // I show a loading message
    if (dataContainer) dataContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--primary);">🔄 Syncing...</div>';

    try {
        // I choose the correct API endpoint based on the tab
        const endpoint = currentTab === 'asteroids' ? '/api/asteroids' : '/api/exoplanets';
        const response = await fetch(endpoint);
        
        // I check if the response was successful
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        // I parse the JSON data
        const result = await response.json();
        if (result.error) throw new Error(result.error);

        // I save the data
        currentData = result.data;
        
        // I update the stats display
        if (statsDisplay) {
            statsDisplay.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div>
                        <span style="font-size:1.2rem; font-weight:bold;">📊 ${result.count} Records</span>
                        <span class="status-badge ${result.cached ? 'stale' : ''}">
                            ${result.cached ? '🟡 Cached' : '🟢 Live'}
                        </span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">Source: ${result.source}</div>
                </div>
            `;
        }

        // I render the table
        renderTable();

        // I try to auto-render the chart if the library is ready
        if (typeof window.renderChart === 'function') {
            console.log("Auto-rendering chart...");
            setTimeout(() => window.renderChart(currentData), 500);
        } else {
            console.warn("Chart library not found yet.");
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        if (dataContainer) dataContainer.innerHTML = `<div style="color:red; text-align:center;">Error: ${error.message}</div>`;
    } finally {
        isLoading = false;
    }
}

// --- 5. TABS ---
// I switch between Asteroids and Exoplanets
function switchTab(tab) {
    currentTab = tab;
    // I hide the 3D and Chart views when switching tabs
    const d3 = document.getElementById('3d-view-container');
    const ch = document.getElementById('chart-container');
    if (d3) d3.style.display = 'none';
    if (ch) ch.style.display = 'none';

    // I fetch new data
    fetchData();
}

// --- 6. TABLE RENDER ---
// I draw the HTML table based on the data
function renderTable() {
    if (!dataContainer) return;
    if (currentData.length === 0) {
        dataContainer.innerHTML = '<p>No data.</p>';
        return;
    }

    let headers = [], rows = [];
    if (currentTab === 'asteroids') {
        headers = ['Name', 'Date', 'Diameter (km)', 'Velocity (km/h)', 'Hazardous'];
        rows = currentData.map(i => [
            i.name, i.date, i.diameter_km.toFixed(2), i.velocity_kmh.toFixed(2),
            i.hazardous ? '<span style="color:red">Yes</span>' : 'No'
        ]);
    } else {
        headers = ['Name', 'Host', 'Radius', 'Mass', 'ESI', 'Water', 'Oxygen'];
        rows = currentData.slice(0, 50).map(i => [
            i.pl_name, i.hostname, i.pl_rade, i.pl_bmasse,
            i.esi ? i.esi.toFixed(3) : 'N/A',
            i.water_status || '?', i.oxygen_likelihood || '?'
        ]);
    }

    // I build the HTML string for the table
    let html = `<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>`;
    rows.forEach(r => html += `<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`);
    html += '</tbody></table>';
    dataContainer.innerHTML = html;
}

// --- 7. HABITABILITY ---
// I check if a planet is habitable
async function checkHabitability() {
    const name = document.getElementById('planet-input')?.value.trim();
    if (!name) return alert("Enter name");
    
    if (habitabilityResult) habitabilityResult.innerHTML = "Scanning...";
    
    try {
        const res = await fetch(`/api/habitability?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        if (data.error) {
            if (habitabilityResult) habitabilityResult.innerHTML = `<span style="color:red">${data.error}</span>`;
        } else {
            const color = data.status.includes("High") ? "#0f0" : "#f00";
            if (habitabilityResult) habitabilityResult.innerHTML = `<div style="border-left:4px solid ${color}; padding:10px;">
                <strong>${data.planet}</strong>: ${data.status}<br>Period: ${data.period_days} days
            </div>`;
        }
    } catch(e) {
        if (habitabilityResult) habitabilityResult.innerHTML = "<span style='color:red'>Error</span>";
    }
}

// --- 8. 3D & CHART CONTROLS ---
// I handle the 3D View button click
function toggle3DView() {
    console.log("Button Clicked: 3D View");
    const container = document.getElementById('3d-view-container');
    if (!container) {
        console.error("Container #3d-view-container not found!");
        alert("Container missing in HTML!");
        return;
    }

    // If hidden, I show it and load data
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        // I check if the library function exists
        if (typeof window.load3DView === 'function') {
            console.log("Calling load3DView with", currentData.length, "items");
            window.load3DView(currentData);
        } else {
            console.error("ERROR: window.load3DView is undefined!");
            container.innerHTML = "<p style='color:red'>3D Library not loaded. Check console.</p>";
        }
    } else {
        // If visible, I hide it
        container.style.display = 'none';
        if (typeof window.stop3DView === 'function') window.stop3DView();
    }
}

// I handle the Chart button click
function showChart() {
    console.log("Button Clicked: Chart");
    const container = document.getElementById('chart-container');
    if (!container) {
        console.error("Container #chart-container not found!");
        alert("Container missing in HTML!");
        return;
    }

    // If hidden, I show it and load data
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        // I check if the library function exists
        if (typeof window.renderChart === 'function') {
            console.log("Calling renderChart with", currentData.length, "items");
            window.renderChart(currentData);
        } else {
            console.error("ERROR: window.renderChart is undefined!");
            container.innerHTML = "<p style='color:red'>Chart Library not loaded.</p>";
        }
    } else {
        // If visible, I hide it
        container.style.display = 'none';
    }
}

// --- 9. INIT ---
// I run this when the page finishes loading
document.addEventListener('DOMContentLoaded', () => {
    console.log("App Loaded. Checking libraries...");
    console.log("Three:", typeof THREE, "Chart:", typeof Chart);
    
    // I start fetching data
    fetchData();
});