// src/frontend/app.js
// Main application logic with improved UX and stability

// ==================== STATE MANAGEMENT ====================
let currentTab = 'asteroids';
let currentData = [];
let isLoading = false;
let retryAttempts = 0;
const MAX_RETRIES = 3;

// Track loaded views to prevent memory leaks
let threeViewActive = false;
let chartInstance = null;

// ==================== DOM ELEMENTS ====================
const dataContainer = document.getElementById('data-container');
const statsDisplay = document.getElementById('stats-display');
const habitabilityResult = document.getElementById('habitability-result');
const loadingOverlay = document.getElementById('loading-overlay');
const errorMessage = document.getElementById('error-message');

// ==================== LOADING INDICATOR ====================
function showLoading(message = "Loading...") {
    isLoading = true;
    retryAttempts = 0;
    
    if (loadingOverlay) {
        loadingOverlay.innerHTML = `
            <div style="text-align:center; padding:40px;">
                <div class="spinner" style="
                    border: 4px solid var(--glass-border);
                    border-top: 4px solid var(--primary);
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                "></div>
                <div style="color:var(--text-muted); font-size:0.9rem;">${message}</div>
            </div>
        `;
        loadingOverlay.style.display = 'block';
    }
    
    // Add CSS animation dynamically
    if (!document.querySelector('#spinner-css')) {
        const style = document.createElement('style');
        style.id = 'spinner-css';
        style.textContent = `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);
    }
}

function hideLoading() {
    isLoading = false;
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showError(message, showRetry = true) {
    hideLoading();
    
    console.error("App Error:", message);
    
    if (errorMessage) {
        errorMessage.innerHTML = `
            <div style="
                background: rgba(255, 0, 0, 0.1);
                border-left: 4px solid red;
                padding: 15px;
                margin: 10px 0;
                border-radius: 4px;
            ">
                <strong style="color:#ff6b6b;">❌ ${message}</strong><br>
                ${showRetry ? '<button onclick="retryLastAction()" style="margin-top:10px;padding:8px 16px;background:var(--primary);border:none;color:white;border-radius:4px;cursor:pointer;">🔄 Retry</button>' : ''}
            </div>
        `;
        errorMessage.style.display = 'block';
    }
}

function hideError() {
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

// ==================== THEME SWITCHER ====================
function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Update active button style
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(themeName.toLowerCase())) {
            btn.classList.add('active');
        }
    });
    
    // Trigger canvas re-render for theme colors
    if (window.reInitCanvasColors) {
        window.reInitCanvasColors();
    }
}

// ==================== DATA FETCHING ====================
async function fetchData() {
    if (isLoading) return;
    
    hideError();
    showLoading(currentTab === 'asteroids' ? "Fetching asteroids from NASA..." : "Loading exoplanet catalog...");
    
    try {
        const endpoint = currentTab === 'asteroids' ? '/api/asteroids' : '/api/exoplanets';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
        
        const response = await fetch(endpoint, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Validate data received
        if (!result.data || !Array.isArray(result.data)) {
            throw new Error("Invalid data format received");
        }
        
        currentData = result.data;
        
        // Update stats display
        if (statsDisplay) {
            statsDisplay.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div>
                        <span style="font-size:1.2rem; font-weight:bold;">📊 ${result.count} Records</span>
                        <span class="status-badge ${result.cached ? 'stale' : ''}">
                            ${result.cached ? '🟡 Cached Data' : '🟢 Live Fresh'}
                        </span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">Source: ${result.source}</div>
                </div>
                ${result.message ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">ℹ️ ${result.message}</div>` : ''}
            `;
        }
        
        // Render table
        renderTable();
        
        // Hide loading
        hideLoading();
        
        // Auto-render chart if library ready and tab allows
        if (currentTab === 'exoplanets' && typeof window.renderChart === 'function') {
            console.log("Auto-rendering chart...");
            setTimeout(() => {
                try {
                    window.renderChart(currentData.slice(0, 100));
                } catch (err) {
                    console.warn("Chart render failed:", err);
                }
            }, 500);
        }
        
        // Reset retry counter on success
        retryAttempts = 0;
        
    } catch (error) {
        hideLoading();
        
        const errorMsg = error.name === 'AbortError' 
            ? "Request timed out. Try again."
            : `Failed to load data: ${error.message}`;
        
        showError(errorMsg, retryAttempts < MAX_RETRIES);
        
        // Increment retry counter
        retryAttempts++;
    }
}

function retryLastAction() {
    hideError();
    fetchData();
}

// ==================== TAB SWITCHING ====================
function switchTab(tab) {
    if (isLoading && tab === currentTab) return;
    
    currentTab = tab;
    
    // Hide all special views when switching tabs
    const d3Container = document.getElementById('3d-view-container');
    const chartContainer = document.getElementById('chart-container');
    
    if (d3Container) {
        d3Container.style.display = 'none';
        if (threeViewActive && typeof window.stop3DView === 'function') {
            window.stop3DView();
            threeViewActive = false;
        }
    }
    
    if (chartContainer) {
        chartContainer.style.display = 'none';
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
    }
    
    // Fetch new data
    fetchData();
    
    // Update button states
    document.querySelectorAll('.theme-btn[data-tab]').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event?.target?.classList.add('active');
}

// ==================== TABLE RENDERING ====================
function renderTable() {
    if (!dataContainer) return;
    
    if (!currentData || currentData.length === 0) {
        dataContainer.innerHTML = `
            <div style="text-align:center; padding:40px; color:var(--text-muted);">
                <p>No data available.</p>
                <p style="font-size:0.85rem;">Try refreshing or switching tabs.</p>
            </div>
        `;
        return;
    }
    
    let headers = [], rows = [];
    
    if (currentTab === 'asteroids') {
        headers = ['Name', 'Date', 'Diameter (km)', 'Velocity (km/h)', 'Hazardous'];
        rows = currentData.map(i => [
            i.name || 'Unknown',
            i.date || '-',
            i.diameter_km !== undefined ? i.diameter_km.toLocaleString() : '-',
            i.velocity_kmh !== undefined ? i.velocity_kmh.toLocaleString() : '-',
            i.hazardous ? '<span class="hazard-badge">⚠️ Yes</span>' : 'No'
        ]);
    } else {
        headers = ['Name', 'Host Star', 'Radius (R⊕)', 'Mass (M⊕)', 'ESI', 'Water Status'];
        rows = currentData.slice(0, 100).map(i => [
            i.pl_name || 'Unknown',
            i.hostname || 'N/A',
            i.pl_rade || '-',
            i.pl_bmasse || '-',
            i.esi ? i.esi.toFixed(3) : 'N/A',
            i.water_status || 'Unknown'
        ]);
    }
    
    // Build table HTML
    let html = `
        <table>
            <thead>
                <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
    `;
    
    rows.forEach(r => {
        html += `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    dataContainer.innerHTML = html;
    
    // Add table styling dynamically
    if (!document.querySelector('#table-style')) {
        const style = document.createElement('style');
        style.id = 'table-style';
        style.textContent = `
            .hazard-badge {
                background: rgba(255, 0, 0, 0.2);
                padding: 2px 8px;
                border-radius: 4px;
                font-weight: bold;
            }
            table tr:nth-child(even) {
                background: rgba(255,255,255,0.03);
            }
            table th {
                position: sticky;
                top: 0;
                background: var(--bg-color);
                z-index: 10;
            }
        `;
        document.head.appendChild(style);
    }
}

// ==================== HABITABILITY CHECK ====================
async function checkHabitability() {
    const input = document.getElementById('planet-input');
    const name = input?.value.trim();
    
    if (!name) {
        alert("Please enter a planet name to scan");
        return;
    }
    
    if (habitabilityResult) {
        habitabilityResult.innerHTML = `
            <div style="padding:20px; text-align:center;">
                <div style="animation:spin 1s linear infinite; border:3px solid var(--primary); border-top-color:transparent; border-radius:50%; width:30px; height:30px; margin:0 auto 10px;"></div>
                Scanning for <strong>"${name}"</strong>...
            </div>
        `;
    }
    
    try {
        const res = await fetch(`/api/habitability?name=${encodeURIComponent(name)}`, {
            signal: AbortSignal.timeout(10000)
        });
        
        const data = await res.json();
        
        if (data.error) {
            if (habitabilityResult) {
                habitabilityResult.innerHTML = `
                    <div style="border-left:4px solid #ff6b6b; padding:15px; background:rgba(255,107,107,0.1);">
                        <strong style="color:#ff6b6b;">⚠️ ${data.error}</strong>
                        ${data.suggestion ? `<br><small>${data.suggestion}</small>` : ''}
                    </div>
                `;
            }
        } else {
            // Determine status color
            const statusColor = data.status.includes("🟢") ? "#00ff9d" :
                               data.status.includes("🟡") ? "#ffd54f" :
                               "#ff6b6b";
            
            if (habitabilityResult) {
                habitabilityResult.innerHTML = `
                    <div style="border-left:4px solid ${statusColor}; padding:15px; background:rgba(0,0,0,0.3);">
                        <strong style="font-size:1.1rem;">${data.planet}</strong><br>
                        <small style="color:var(--text-muted);">Host: ${data.host_star}</small><br><br>
                        <strong>Status:</strong> ${data.status}<br>
                        <strong>Orbital Period:</strong> ${data.orbital_period_days} days<br>
                        <strong>Earth Similarity:</strong> ${(data.esi * 100).toFixed(1)}%<br>
                        <small style="color:var(--text-muted); display:block; margin-top:10px;">
                            ℹ️ ${data.disclaimer}
                        </small>
                    </div>
                `;
            }
        }
        
    } catch (e) {
        if (habitabilityResult) {
            habitabilityResult.innerHTML = `
                <div style="border-left:4px solid red; padding:15px; color:red;">
                    <strong>Scan failed:</strong> ${e.name === 'TimeoutError' ? 'Timeout' : e.message}
                </div>
            `;
        }
    }
}

// ==================== 3D VIEW CONTROLS ====================
function toggle3DView() {
    const container = document.getElementById('3d-view-container');
    if (!container) {
        console.error("3D Container not found!");
        alert("3D view container missing. Please refresh.");
        return;
    }
    
    // Toggle visibility
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        showLoading("Initializing 3D view...");
        
        if (typeof window.load3DView === 'function') {
            try {
                window.load3DView(currentData.slice(0, 50)); // Limit for performance
                threeViewActive = true;
                hideLoading();
            } catch (err) {
                console.error("3D View init error:", err);
                container.innerHTML = "<p style='color:red'>3D rendering failed. Try reducing data or refresh.</p>";
                hideLoading();
            }
        } else {
            container.innerHTML = "<p style='color:red'>3D Library not loaded. Refresh page.</p>";
            hideLoading();
        }
    } else {
        container.style.display = 'none';
        if (threeViewActive && typeof window.stop3DView === 'function') {
            window.stop3DView();
            threeViewActive = false;
        }
    }
}

// ==================== CHART CONTROLS ====================
function showChart() {
    const container = document.getElementById('chart-container');
    if (!container) {
        console.error("Chart Container not found!");
        alert("Chart container missing. Please refresh.");
        return;
    }
    
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        showLoading("Generating chart...");
        
        if (typeof window.renderChart === 'function') {
            try {
                window.renderChart(currentData.slice(0, 50));
                hideLoading();
            } catch (err) {
                console.error("Chart render error:", err);
                container.innerHTML = "<p style='color:red'>Chart generation failed. Try refresh.</p>";
                hideLoading();
            }
        } else {
            container.innerHTML = "<p style='color:red'>Chart Library not loaded. Refresh page.</p>";
            hideLoading();
        }
    } else {
        container.style.display = 'none';
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
    }
}

// ==================== ONLINE/OFFLINE DETECTION ====================
function checkOnlineStatus() {
    if (navigator.onLine) {
        document.body.classList.add('online');
        document.body.classList.remove('offline');
    } else {
        document.body.classList.add('offline');
        document.body.classList.remove('online');
        
        // Show offline warning
        if (errorMessage) {
            showError("You're offline. Data may be stale.", false);
        }
    }
}

window.addEventListener('online', checkOnlineStatus);
window.addEventListener('offline', checkOnlineStatus);

// ==================== INITIALIZE ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log("🌐 Universe Booklet App Initializing...");
    
    // Check library availability
    console.log("Three.js:", typeof THREE !== 'undefined' ? '✅ Available' : '❌ Missing');
    console.log("Chart.js:", typeof Chart !== 'undefined' ? '✅ Available' : '❌ Missing');
    
    // Check online status
    checkOnlineStatus();
    
    // Initial data fetch
    fetchData();
    
    // Cleanup on page unload (prevent memory leaks)
    window.addEventListener('beforeunload', () => {
        if (threeViewActive && typeof window.stop3DView === 'function') {
            window.stop3DView();
        }
        if (chartInstance) {
            chartInstance.destroy();
        }
    });
});