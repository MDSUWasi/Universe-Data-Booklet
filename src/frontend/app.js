// src/frontend/app.js

// --- State Management ---
let currentTab = 'asteroids'; // Default tab
let currentData = [];         // Holds the currently loaded dataset (paginated)
let currentPage = 1;
const PAGE_SIZE = 50;
let isLoading = false;
let totalPages = 1;

// Cache for UI elements (Performance optimization)
const elements = {
    dataContainer: document.getElementById('data-container'),
    statsDisplay: document.getElementById('stats-display'),
    habitabilityResult: document.getElementById('habitability-result'),
    planetInput: document.getElementById('planet-input'),
    chartContainer: document.getElementById('chart-container'),
    loadMoreBtn: null
};

/**
 * Switches the visual theme and updates active button states.
 * @param {string} themeName - 'neon', 'lab', or 'solar'
 */
function setTheme(themeName) {
    if (!document.documentElement) return;
    
    const validThemes = ['neon', 'lab', 'solar'];
    const cssTheme = validThemes.includes(themeName) ? themeName : 'neon';
    
    document.documentElement.setAttribute('data-theme', cssTheme);
    
    // Update button active states based on exact name matching
    document.querySelectorAll('.theme-btn').forEach(btn => {
        const btnLabel = btn.dataset.theme || btn.textContent.toLowerCase();
        // Check if the button corresponds to the theme (case-insensitive)
        const isActive = btnLabel.includes(cssTheme.toLowerCase());
        btn.classList.toggle('active', isActive);
    });
}

/**
 * Fetches data from the API based on current tab and page.
 * @param {boolean} reset - If true, resets pagination and clears data.
 */
async function fetchData(reset = false) {
    if (isLoading) return;
    isLoading = true;

    if (reset) {
        currentPage = 1;
        currentData = [];
        if (elements.dataContainer) {
            elements.dataContainer.innerHTML = '<div class="loading-spinner">Syncing Data...</div>';
        }
    }

    try {
        // Construct API endpoint
        const resource = currentTab === 'asteroids' ? 'asteroids' : 'exoplanets';
        const endpoint = `/api/${resource}?page=${currentPage}&limit=${PAGE_SIZE}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`Server Error (${response.status})`);

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        // Update Pagination State
        totalPages = result.total_pages || 1;
        const totalCount = result.count || 0;
        const newChunk = result.data || [];

        // Merge new data
        currentData = [...currentData, ...newChunk];

        // Update Stats UI
        if (elements.statsDisplay) {
            const source = result.source || 'Unknown';
            elements.statsDisplay.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div>
                        <span style="font-size:1.2rem; font-weight:bold;">📊 ${totalCount.toLocaleString()} Records</span>
                        <span class="status-badge ${!isLoading && currentPage >= totalPages ? 'stale' : ''}"> 
                            Page ${currentPage} / ${totalPages}
                        </span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">Source: ${source}</div>
                </div>
            `;
        }

        // Render the new chunk
        renderTable(newChunk, reset);

        // Auto-render chart if visible and first page loaded
        if (typeof window.renderChart === 'function' && elements.chartContainer.style.display !== 'none') {
            if (reset) {
                setTimeout(() => window.renderChart(currentData), 500);
            }
        }

    } catch (error) {
        console.error("Fetch Error:", error);
        if (elements.dataContainer) {
            elements.dataContainer.innerHTML = `
                <div class="glass-panel" style="border-color: var(--warning); text-align:center; padding:20px;">
                    <h3 style="color:var(--warning)">⚠️ Connection Error</h3>
                    <p>${error.message}</p>
                    <button class="theme-btn" onclick="fetchData(true)" style="margin-top:15px;">🔄 Retry Sync</button>
                </div>`;
        }
        currentData = [];
    } finally {
        isLoading = false;
    }
}

/**
 * Switches tabs (Asteroids <-> Exoplanets)
 */
function switchTab(tab) {
    if (currentTab === tab) return;
    currentTab = tab;

    // Hide chart when switching tabs to prevent stale data visualization
    if (elements.chartContainer) elements.chartContainer.style.display = 'none';

    // Update button states manually since setTheme handles generic theme switching
    document.querySelectorAll('.theme-btn').forEach(btn => {
        // Optional: Add logic here if buttons are tab-specific vs theme-specific
        // For now, assuming theme buttons are distinct from tab buttons
    });

    // Reset data and fetch new tab data
    fetchData(true);
}

/**
 * Renders the table rows for the given chunk of data.
 */
function renderTable(chunk, reset) {
    if (!elements.dataContainer || !chunk.length) return;

    let headers = [], rowsHtml = '';

    // Define columns based on tab
    if (currentTab === 'asteroids') {
        headers = ['Name', 'Date', 'Diameter (km)', 'Velocity (km/h)', 'Hazardous'];
        rowsHtml = chunk.map(item => `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.date)}</td>
                <td>${(item.diameter_km ?? 0).toFixed(2)}</td>
                <td>${(item.velocity_kmh ?? 0).toFixed(2)}</td>
                <td>
                    ${item.hazardous 
                        ? '<span class="badge danger">Yes</span>' 
                        : '<span class="badge success">No</span>'}
                </td>
            </tr>`).join('');
    } else {
        headers = ['Name', 'Host Star', 'Radius', 'Mass', 'ESI', 'Water', 'Status'];
        rowsHtml = chunk.map(item => `
            <tr>
                <td>${escapeHtml(item.pl_name)}</td>
                <td>${escapeHtml(item.hostname)}</td>
                <td>${(parseFloat(item.pl_rade) || 0).toFixed(2)}</td>
                <td>${(parseFloat(item.pl_bmasse) || 0).toFixed(2)}</td>
                <td>${item.esi ? parseFloat(item.esi).toFixed(3) : 'N/A'}</td>
                <td>${escapeHtml(item.water_status || '?')}</td>
                <td>${escapeHtml(item.status || '?')}</td>
            </tr>`).join('');
    }

    const rowHtml = `<tbody>${rowsHtml}</tbody>`;

    if (reset) {
        const tableHtml = `
            <table>
                <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                ${rowHtml}
            </table>
        `;
        elements.dataContainer.innerHTML = tableHtml;
        
        // Re-attach Load More button after full replacement
        manageLoadMoreButton(true);
    } else {
        const tbody = elements.dataContainer.querySelector('tbody');
        if (tbody) {
            tbody.insertAdjacentHTML('beforeend', rowsHtml);
        }
        // Re-check load more button visibility
        manageLoadMoreButton(false);
    }
}

/**
 * Manages the "Load More" button visibility and state.
 * Uses the known 'totalPages' variable instead of parsing text.
 */
function manageLoadMoreButton(forceUpdate = false) {
    // Initialize button element reference if missing
    if (!elements.loadMoreBtn) {
        const container = document.querySelector('.load-more-container');
        if (container) {
            elements.loadMoreBtn = container.querySelector('button');
        }
    }

    const hasMore = currentPage < totalPages;
    const needsRender = !elements.loadMoreBtn || forceUpdate;

    if (hasMore) {
        if (!elements.loadMoreBtn) {
            // Create button if it doesn't exist
            const container = document.createElement('div');
            container.className = 'load-more-container';
            container.style.cssText = 'text-align:center; margin: 20px 0;';
            
            elements.loadMoreBtn = document.createElement('button');
            elements.loadMoreBtn.className = 'theme-btn';
            elements.loadMoreBtn.id = 'loadMoreBtn';
            elements.loadMoreBtn.innerText = 'Load More';
            elements.loadMoreBtn.onclick = handleLoadMore;

            container.appendChild(elements.loadMoreBtn);
            elements.dataContainer.appendChild(container);
        } else {
            // Update existing
            elements.loadMoreBtn.disabled = false;
            elements.loadMoreBtn.innerText = 'Load More';
            elements.loadMoreBtn.style.display = 'block';
        }
    } else {
        // Remove button if no more data
        if (elements.loadMoreBtn) {
            elements.loadMoreBtn.parentElement.remove();
            elements.loadMoreBtn = null;
        }
    }
}

/**
 * Handler for Load More button click
 */
function handleLoadMore() {
    if (isLoading) return;
    elements.loadMoreBtn.disabled = true;
    elements.loadMoreBtn.innerText = 'Loading...';
    currentPage++;
    fetchData(false);
}

/**
 * Helper to prevent XSS in table cells
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Checks habitability for a specific planet.
 */
async function checkHabitability() {
    const inputVal = elements.planetInput?.value.trim();
    if (!inputVal) {
        alert("Please enter a planet name.");
        return;
    }

    if (elements.habitabilityResult) {
        elements.habitabilityResult.innerHTML = "<span class='loading-spinner'>Scanning System...</span>";
    }

    try {
        const res = await fetch(`/api/habitability?name=${encodeURIComponent(inputVal)}`);
        const data = await res.json();

        if (data.error) {
            if (elements.habitabilityResult) {
                elements.habitabilityResult.innerHTML = `<span class="badge danger">${escapeHtml(data.error)}</span>`;
            }
            return;
        }

        // Determine status color dynamically
        let statusColor = '#aaa';
        if (data.status.includes("High")) statusColor = 'var(--accent)'; // Green
        else if (data.status.includes("Hot")) statusColor = 'var(--warning)'; // Orange

        if (elements.habitabilityResult) {
            elements.habitabilityResult.innerHTML = `
                <div class="glass-panel" style="border-left: 4px solid ${statusColor};">
                    <strong>${escapeHtml(data.planet)}</strong>: <span style="color:${statusColor}">${escapeHtml(data.status)}</span><br>
                    <small>Orbital Period: ${data.period_days} days</small>
                </div>`;
        }
    } catch (e) {
        console.error(e);
        if (elements.habitabilityResult) {
            elements.habitabilityResult.innerHTML = "<span class='badge danger'>System Offline</span>";
        }
    }
}

/**
 * Toggles the Chart visibility and re-renders if necessary.
 */
function showChart() {
    if (!elements.chartContainer) return;

    const isVisible = elements.chartContainer.style.display !== 'none';
    elements.chartContainer.style.display = isVisible ? 'none' : 'block';

    if (!isVisible && typeof window.renderChart === 'function') {
        // Small delay to ensure container is visible before calculating dimensions
        setTimeout(() => window.renderChart(currentData), 100);
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Lumo App Initialized - Secure Mode Active");
    
    // Initialize Theme (Default to Neon if not set elsewhere)
    // Ensure this matches your initial CSS default or localStorage preference
    if (window.location.hash === '#lab') setTheme('lab');
    else if (window.location.hash === '#solar') setTheme('solar');
    else setTheme('neon');

    // Initial Data Fetch
    fetchData(true);
});