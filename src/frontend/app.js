// State Management
let currentTab = 'asteroids';
let currentData = [];
let isLoading = false;

// DOM Elements
const dataContainer = document.getElementById('data-container');
const statsDisplay = document.getElementById('stats-display');
const habitabilityResult = document.getElementById('habitability-result');

// --- Theme Switcher ---
function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(themeName.replace('void', '').replace('flare', '').replace('nebula', '').replace('sunset', ''))) {
            btn.classList.add('active');
        }
    });
    // Re-trigger animation color update
    if(window.animateLoop) cancelAnimationFrame(window.animateLoop);
    // Note: The animation loop reads CSS vars dynamically, so no restart needed.
}

// --- Data Fetching ---
async function fetchData() {
    if (isLoading) return;
    isLoading = true;
    dataContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--primary);">🔄 Fetching Live Data...</div>';

    try {
        const endpoint = currentTab === 'asteroids' ? '/api/asteroids' : '/api/exoplanets';
        const response = await fetch(endpoint);
        
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

        currentData = result.data;
        statsDisplay.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>📊 Total Records: <strong>${result.count}</strong></span>
                <span style="font-size:0.8rem; color:var(--text-muted);">
                    Source: ${result.source} | ${result.cached ? '🟢 Cached' : '🔵 Fresh'}
                </span>
            </div>
        `;

        renderTable();
        renderCharts(); // Trigger chart rendering
    } catch (error) {
        console.error("Fetch Error:", error);
        dataContainer.innerHTML = `
            <div style="text-align:center; padding:20px; color:var(--danger);">
                ⚠️ <strong>Error Loading Data</strong><br>
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

// --- Table Rendering ---
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
        // Exoplanets: Show top 5 fields
        const sample = currentData[0];
        headers = Object.keys(sample).slice(0, 5); // pl_name, pl_orbper, etc.
        rows = currentData.slice(0, 50).map(item => {
            return headers.map(key => {
                let val = item[key];
                if (val === null || val === undefined) return '-';
                return val;
            });
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
    if (!name) {
        alert("Please enter a planet name.");
        return;
    }

    habitabilityResult.innerHTML = '<div style="text-align:center; color:var(--primary);">🔭 Scanning...</div>';

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
            <div style="background:rgba(0,0,0,0.3); padding:15px; border-radius:10px; border-left:4px solid ${badgeColor};">
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

// --- Simple Canvas Chart (Bar Chart for Asteroid Sizes) ---
function renderCharts() {
    // Only render for asteroids to keep it simple and fast
    if (currentTab !== 'asteroids' || currentData.length === 0) return;

    // Create a temporary canvas for the chart
    const chartDiv = document.createElement('div');
    chartDiv.style.marginTop = '20px';
    chartDiv.style.textAlign = 'center';
    
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    chartDiv.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);
    
    // Draw Title
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--primary');
    ctx.font = '14px sans-serif';
    ctx.fillText('Asteroid Size Distribution (Top 20)', 20, 20);

    // Sort by diameter
    const sorted = [...currentData].sort((a, b) => b.diameter_km - a.diameter_km).slice(0, 20);
    const maxVal = sorted[0].diameter_km || 1;
    const barWidth = (w - 40) / 20;
    const maxBarHeight = h - 40;

    sorted.forEach((item, i) => {
        const barHeight = (item.diameter_km / maxVal) * maxBarHeight;
        const x = 20 + i * barWidth;
        const y = h - 20 - barHeight;

        // Bar
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--secondary');
        ctx.fillRect(x, y, barWidth - 2, barHeight);

        // Label (Name truncated)
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.fillText(item.name.substring(0, 8), x, h - 5);
    });

    dataContainer.appendChild(chartDiv);
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
});