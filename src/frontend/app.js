// src/frontend/app.js
let currentTab = 'asteroids';
let currentData = [];
let isLoading = false;
let loadedCount = 0;
const PAGE_SIZE = 50; // Load 50 items at a time for speed

const elements = {
    dataContainer: document.getElementById('data-container'),
    statsDisplay: document.getElementById('stats-display'),
    habitabilityResult: document.getElementById('habitability-result'),
    planetInput: document.getElementById('planet-input'),
    d3Container: document.getElementById('3d-view-container'),
    chartContainer: document.getElementById('chart-container')
};

function setTheme(themeName) {
    if (!document.documentElement) return;
    const validThemes = ['neon', 'lab', 'solar'];
    const cssTheme = validThemes.includes(themeName) ? themeName : 'neon';
    document.documentElement.setAttribute('data-theme', cssTheme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(themeName.toLowerCase()));
    });
}

async function fetchData() {
    if (isLoading) return;
    isLoading = true;
    loadedCount = 0; 

    // Skeleton Loader
    if (elements.dataContainer) {
        elements.dataContainer.innerHTML = `
            <div class="loading-spinner">Syncing Data...</div>
            <div style="margin-top:20px;">${Array(5).fill('<div class="skeleton-row"></div>').join('')}</div>`;
    }

    try {
        const endpoint = currentTab === 'asteroids' ? '/api/asteroids' : '/api/exoplanets';
        const response = await fetch(endpoint);
        
        if (!response.ok) throw new Error(`Server Error (${response.status})`);
        
        const result = await response.json();
        
        if (result.error) throw new Error(result.error);

        let rawData = result.data || [];
        if (!Array.isArray(rawData)) rawData = [];

        currentData = rawData;

        // Update Stats
        if (elements.statsDisplay) {
            const count = result.count || currentData.length;
            const source = result.source || 'Unknown';
            const isCached = result.cached || false;
            elements.statsDisplay.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div>
                        <span style="font-size:1.2rem; font-weight:bold;">📊 ${count.toLocaleString()} Records</span>
                        <span class="status-badge ${isCached ? 'stale' : ''}">${isCached ? '🟡 Cached' : '🟢 Live'}</span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">Source: ${source}</div>
                </div>
            `;
        }

        renderPage(); // Render first chunk

        // Auto-render chart if visible
        if (typeof window.renderChart === 'function' && elements.chartContainer.style.display !== 'none') {
            setTimeout(() => window.renderChart(currentData), 500);
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        if (elements.dataContainer) {
            elements.dataContainer.innerHTML = `
                <div style="color:var(--secondary); text-align:center; padding:20px;">
                    ⚠️ <strong>Error</strong><br>
                    <small>${error.message}</small><br>
                    <button onclick="fetchData()" style="margin-top:10px; cursor:pointer;">🔄 Retry</button>
                </div>`;
        }
        currentData = [];
    } finally {
        isLoading = false;
    }
}

function switchTab(tab) {
    if (currentTab === tab) return;
    currentTab = tab;
    loadedCount = 0;
    
    if (elements.d3Container) elements.d3Container.style.display = 'none';
    if (elements.chartContainer) elements.chartContainer.style.display = 'none';
    if (typeof window.stop3DView === 'function') window.stop3DView();
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab));
    });

    fetchData();
}

// LAZY LOADING: Renders only PAGE_SIZE items
function renderPage() {
    if (!elements.dataContainer) return;
    if (!Array.isArray(currentData) || currentData.length === 0) {
        elements.dataContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No data available.</p>';
        return;
    }

    const totalRecords = currentData.length;
    const remaining = totalRecords - loadedCount;
    const limit = Math.min(PAGE_SIZE, remaining);
    
    const chunk = currentData.slice(loadedCount, loadedCount + limit);
    
    let headers = [], rowsHtml = '';

    if (currentTab === 'asteroids') {
        headers = ['Name', 'Date', 'Diameter (km)', 'Velocity (km/h)', 'Hazardous'];
        rowsHtml = chunk.map(i => `
            <tr>
                <td>${i.name}</td>
                <td>${i.date}</td>
                <td>${i.diameter_km?.toFixed(2) || '0'}</td>
                <td>${i.velocity_kmh?.toFixed(2) || '0'}</td>
                <td>${i.hazardous ? '<span style="color:#ff4444; font-weight:bold;">Yes</span>' : 'No'}</td>
            </tr>`).join('');
    } else {
        headers = ['Name', 'Host Star', 'Radius', 'Mass', 'ESI', 'Water', 'Status'];
        rowsHtml = chunk.map(i => `
            <tr>
                <td>${i.pl_name}</td>
                <td>${i.hostname}</td>
                <td>${i.pl_rade ? parseFloat(i.pl_rade).toFixed(2) : 'N/A'}</td>
                <td>${i.pl_bmasse ? parseFloat(i.pl_bmasse).toFixed(2) : 'N/A'}</td>
                <td>${i.esi ? i.esi.toFixed(3) : 'N/A'}</td>
                <td>${i.water_status || '?'}</td>
                <td>${i.status || '?'}</td>
            </tr>`).join('');
    }

    const tableHtml = `
        <table>
            <thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rowsHtml}</tbody>
        </table>
    `;

    if (loadedCount === 0) {
        elements.dataContainer.innerHTML = tableHtml;
    } else {
        const tbody = elements.dataContainer.querySelector('tbody');
        if (tbody) tbody.insertAdjacentHTML('beforeend', rowsHtml);
    }

    loadedCount += limit;

    // Show Load More Button
    if (loadedCount < totalRecords) {
        let footer = document.querySelector('.load-more-container');
        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'load-more-container';
            footer.innerHTML = `<button class="theme-btn" id="loadMoreBtn" style="margin: 20px auto; display:block;">Load More (${totalRecords - loadedCount} remaining)</button>`;
            elements.dataContainer.appendChild(footer);
        }
        
        document.getElementById('loadMoreBtn').onclick = () => {
            document.getElementById('loadMoreBtn').remove();
            renderPage();
        };
    }
}

async function checkHabitability() {
    const inputVal = elements.planetInput?.value.trim();
    if (!inputVal) return alert("Enter name");
    
    if (elements.habitabilityResult) elements.habitabilityResult.innerHTML = "Scanning...";
    
    try {
        const res = await fetch(`/api/habitability?name=${encodeURIComponent(inputVal)}`);
        const data = await res.json();
        if (data.error) {
            if (elements.habitabilityResult) elements.habitabilityResult.innerHTML = `<span style="color:red">${data.error}</span>`;
        } else {
            const color = data.status.includes("High") ? "#0f0" : (data.status.includes("Hot") ? "#ffa500" : "#aaa");
            if (elements.habitabilityResult) elements.habitabilityResult.innerHTML = `
                <div style="border-left:4px solid ${color}; padding:10px;">
                    <strong>${data.planet}</strong>: ${data.status}<br>Period: ${data.period_days} days
                </div>`;
        }
    } catch(e) {
        if (elements.habitabilityResult) elements.habitabilityResult.innerHTML = "<span style='color:red'>Error</span>";
    }
}

function toggle3DView() {
    if (!elements.d3Container) return;
    if (elements.d3Container.style.display === 'none' || elements.d3Container.style.display === '') {
        elements.d3Container.style.display = 'block';
        if (typeof window.load3DView === 'function') window.load3DView(currentData);
        else elements.d3Container.innerHTML = "<p style='color:red'>3D Library missing</p>";
    } else {
        elements.d3Container.style.display = 'none';
        if (typeof window.stop3DView === 'function') window.stop3DView();
    }
}

function showChart() {
    if (!elements.chartContainer) return;
    if (elements.chartContainer.style.display === 'none' || elements.chartContainer.style.display === '') {
        elements.chartContainer.style.display = 'block';
        if (typeof window.renderChart === 'function') setTimeout(() => window.renderChart(currentData), 100);
        else elements.chartContainer.innerHTML = "<p style='color:red'>Chart Library missing</p>";
    } else {
        elements.chartContainer.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("App Loaded. Initializing fast mode...");
    fetchData();
});