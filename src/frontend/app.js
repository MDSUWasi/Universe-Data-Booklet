// src/frontend/app.js - FULL REWRITE FOR STABILITY

// --- State Management ---
let currentTab = 'asteroids';
let currentData = [];
let isLoading = false;

// --- DOM Elements ---
const dataContainer = document.getElementById('data-container');
const statsDisplay = document.getElementById('stats-display');
const habitabilityResult = document.getElementById('habitability-result');
const tooltip = document.createElement('div');
tooltip.className = 'tooltip';
document.body.appendChild(tooltip);

// --- Theme Switcher ---
function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        // Simple check for active button
        if (btn.textContent.toLowerCase().includes(themeName.replace('void', '').replace('space', '').replace('lab', '').replace('solar', ''))) {
            btn.classList.add('active');
        }
    });
}

// --- Data Fetching ---
async function fetchData() {
    if (isLoading) return;
    isLoading = true;
    
    dataContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--primary); animation: pulse 1s infinite;">🔄 Syncing with NASA...</div>';

    try {
        const endpoint = currentTab === 'asteroids' ? '/api/asteroids' : '/api/exoplanets';
        const response = await fetch(endpoint);
        
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const result = await response.json();
        
        if (result.error) throw new Error(result.error);

        currentData = result.data;
        
        // Update Dashboard Status
        const isCached = result.cached;
        statsDisplay.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                    <span style="font-size:1.2rem; font-weight:bold;">📊 ${result.count} Records</span>
                    <span class="status-badge ${isCached ? 'stale' : ''}">
                        ${isCached ? '🟡 Cached (7 Days)' : '🟢 Live Data'}
                    </span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted);">
                    Source: ${result.source} | Last Updated: ${isCached ? '7 Days Ago' : 'Just Now'}
                </div>
            </div>
        `;

        renderTable();
        renderCharts(); // Safe call
    } catch (error) {
        console.error("Fetch Error:", error);
        dataContainer.innerHTML = `
            <div style="text-align:center; padding:20px; color:var(--danger);">
                ⚠️ <strong>Connection Failed</strong><br>
                ${error.message}<br>
                <small>Please check console or try again later.</small>
            </div>
        `;
        statsDisplay.innerHTML = '<span style="color:var(--danger)">Data Unavailable</span>';
    } finally {
        isLoading = false;
    }
}

// --- Tab Switching ---
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.controls .theme-btn').forEach(btn => {
        if (btn.onclick.toString().includes(tab)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    fetchData();
}

// --- Table Rendering (With New Science Metrics) ---
function renderTable() {
    if (currentData.length === 0) {
        dataContainer.innerHTML = '<p style="text-align:center; padding:20px;">No data found.</p>';
        return;
    }

    let headers = [];
    let rows = [];

    if (currentTab === 'asteroids') {
        headers = ['Name', 'Date', 'Diameter (km)', 'Velocity (km/h)', 'Hazardous'];
        rows = currentData.map(item => [
            item.name,
            item.date,
            item.diameter_km.toFixed(2),
            item.velocity_kmh.toFixed(2),
            item.hazardous ? '<span style="color:var(--danger)">⚠️ Yes</span>' : 'No'
        ]);
    } else {
        // Exoplanets: NEW SCIENCE COLUMNS
        headers = ['Name', 'Host Star', 'Radius (R🜨)', 'Mass (M🜨)', 'ESI', 'Water', 'Oxygen', 'Earth Comp'];
        rows = currentData.slice(0, 50).map(item => {
            const esi = item.esi ? item.esi.toFixed(3) : 'N/A';
            const water = item.water_status || 'Unknown';
            const oxygen = item.oxygen_likelihood || 'Unknown';
            const comp = item.earth_comparison || 'N/A';
            
            const esiColor = esi > 0.8 ? 'var(--accent)' : (esi > 0.5 ? 'var(--warning)' : 'var(--text-muted)');
            
            return [
                item.pl_name,
                item.hostname,
                item.pl_rade,
                item.pl_bmasse,
                `<span style="color:${esiColor}; font-weight:bold;">${esi}</span>`,
                water,
                oxygen,
                `<span style="font-size:0.85rem; color:var(--text-muted);">${comp}</span>`
            ];
        });
    }

    let html = `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
    
    rows.forEach(row => {
        html += `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
    });
    
    html += '</tbody></table>';
    if (currentData.length > 50) {
        html += `<p style="text-align:center; margin-top:10px; color:var(--text-muted);">Showing first 50 of ${currentData.length} records.</p>`;
    }

    dataContainer.innerHTML = html;
}

// --- Habitability Scanner ---
async function checkHabitability() {
    const name = document.getElementById('planet-input').value.trim();
    if (!name) { alert("Please enter a planet name."); return; }

    habitabilityResult.innerHTML = '<div style="text-align:center; color:var(--primary);">🔭 Analyzing...</div>';

    try {
        const res = await fetch(`/api/habitability?name=${encodeURIComponent(name)}`);
        const data = await res.json();

        if (data.error) {
            habitabilityResult.innerHTML = `<div style="color:var(--danger); text-align:center;">❌ ${data.error}</div>`;
            return;
        }

        const badgeColor = data.status.includes("High") ? "var(--accent)" : 
                           data.status.includes("Hot") ? "var(--danger)" : "var(--warning)";
        
        habitabilityResult.innerHTML = `
            <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; border-left:4px solid ${badgeColor}; animation: slideIn 0.3s;">
                <h3 style="color:var(--primary);">${data.planet}</h3>
                <p><strong>Status:</strong> <span style="color:${badgeColor}; font-weight:bold;">${data.status}</span></p>
                <p><strong>Orbital Period:</strong> ${data.period_days} days</p>
                <p style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">${data.disclaimer}</p>
            </div>
        `;
    } catch (err) {
        habitabilityResult.innerHTML = `<div style="color:var(--danger); text-align:center;">Connection Error</div>`;
    }
}

// --- Chart Rendering (Safe Stub) ---
function renderCharts() {
    // This function is now safe. It does nothing to prevent crashes.
    // To enable charts later, replace this body with the chart drawing code.
    // console.log("Charts skipped for stability.");
}

// --- Interactive Tooltips ---
document.addEventListener('click', (e) => {
    if (e.target.closest('tr')) {
        const row = e.target.closest('tr');
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
            const name = cells[0].innerText;
            tooltip.innerText = `Selected: ${name}`;
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY + 10 + 'px';
            tooltip.style.opacity = 1;
            setTimeout(() => tooltip.style.opacity = 0, 2000);
        }
    }
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});