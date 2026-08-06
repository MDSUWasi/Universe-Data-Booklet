let currentTab = 'asteroids';
let currentData = [];
let currentPage = 1;
const PAGE_SIZE = 50;
let isLoading = false;
let totalPages = 1;

window.currentTab = currentTab;
window.globalData = currentData;
window.totalPages = totalPages;

const elements = {
    dataContainer: document.getElementById('data-container'),
    statsDisplay: document.getElementById('stats-display'),
    habitabilityResult: document.getElementById('habitability-result'),
    planetInput: document.getElementById('planet-input'),
    chartContainer: document.getElementById('chart-canvas'),
    threeContainer: document.getElementById('three-view-container'),
    chartModal: document.getElementById('chart-modal'),
    threeModal: document.getElementById('three-modal'),
    mapModal: document.getElementById('map-modal'),
    mapContainer: document.getElementById('map-container'),
    loadMoreBtn: null,
    searchInput: document.getElementById('search-input')
};

const THEMES = ['cream', 'neon', 'solar', 'lab'];
function setTheme(themeName) {
    if (!document.documentElement) return;
    const cssTheme = THEMES.includes(themeName) ? themeName : 'cream';
    document.documentElement.setAttribute('data-theme', cssTheme);
    localStorage.setItem('udb-theme', cssTheme);

    document.querySelectorAll('.theme-btn, .theme-dot').forEach(btn => {
        const btnTheme = btn.dataset.theme;
        btn.classList.toggle('active', btnTheme === cssTheme);
    });
}

function setDensity(mode) {
    document.body.dataset.density = mode;
    document.querySelectorAll('.density-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(mode));
    });
    localStorage.setItem('udb-density', mode);
}

async function fetchData(reset = false) {
    if (isLoading) return;
    isLoading = true;

    if (reset) {
        currentPage = 1;
        currentData = [];
        if (elements.dataContainer) {
            elements.dataContainer.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
        }
    }

    try {
        const resource = currentTab === 'asteroids' ? 'asteroids' : 'exoplanets';
        const endpoint = `/api/${resource}?page=${currentPage}&limit=${PAGE_SIZE}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`Server Error (${response.status})`);

        const result = await response.json();
        if (result.error) throw new Error(result.error);

        totalPages = result.total_pages || 1;
        const totalCount = result.total_count || 0;
        const newChunk = result.data || [];

        currentData = [...currentData, ...newChunk];
        window.currentTab = currentTab;
        window.globalData = currentData;
        window.totalPages = totalPages;

renderStats(result, totalCount);
        renderTable(newChunk, reset);

        if (typeof window.renderChart === 'function' && elements.chartModal && elements.chartModal.classList.contains('open')) {
            window.renderChart(currentData);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        if (elements.dataContainer) {
            elements.dataContainer.innerHTML = `
                <div class="glass-panel" style="border-color: var(--warning); text-align:center; padding:20px;">
                    <h3 style="color:var(--warning)">⚠️ Connection Error</h3>
                    <p>${escapeHtml(error.message)}</p>
                    <button class="theme-btn" onclick="fetchData(true)" style="margin-top:15px;">🔄 Retry Sync</button>
                </div>`;
        }
        currentData = [];
        window.globalData = [];
    } finally {
        isLoading = false;
    }
}

function renderStats(result, totalCount) {
    if (!elements.statsDisplay) return;
    const source = result.source || 'Unknown';
    const hazardous = (currentData || []).filter(i => i.hazardous).length;
    const habitable = (currentData || []).filter(i => i.esi && parseFloat(i.esi) > 0.6).length;

    elements.statsDisplay.innerHTML = `
        <div class="stat-card">
            <div class="label">Total Records</div>
            <div class="value">${totalCount.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <div class="label">Loaded</div>
            <div class="value">${currentData.length.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <div class="label">${currentTab === 'asteroids' ? 'Hazardous' : 'Habitable(ESI>0.6)'}</div>
            <div class="value">${currentTab === 'asteroids' ? hazardous : habitable}</div>
        </div>
        <div class="stat-card">
            <div class="label">Page</div>
            <div class="value" style="font-size:1.1rem;">${currentPage} / ${totalPages}</div>
            <div class="change positive">${source}</div>
        </div>`;
}

function switchTab(tab) {
    if (currentTab === tab) return;
    currentTab = tab;
    window.currentTab = tab;

    closeChartModal();
    closeThreeModal();
    closeMapModal();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(tab === 'asteroids' ? 'Asteroid' : 'Exoplanet'));
    });

    if (elements.searchInput) elements.searchInput.value = '';
    fetchData(true);
}

function renderTable(chunk, reset) {
    if (!elements.dataContainer || !chunk.length) return;

    let headers = [], rowsHtml = '';

    if (currentTab === 'asteroids') {
        headers = ['Name', 'Date', 'Diameter (km)', 'Velocity (km/h)', 'Hazardous'];
        rowsHtml = chunk.map((item, idx) => `
            <tr onclick="showDetail(${currentData.length - chunk.length + idx})">
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.date)}</td>
                <td>${(item.diameter_km ?? 0).toFixed(2)}</td>
                <td>${(item.velocity_kmh ?? 0).toFixed(2)}</td>
                <td>${item.hazardous ? '<span class="badge danger">Yes</span>' : '<span class="badge success">No</span>'}</td>
            </tr>`).join('');
    } else {
        headers = ['Name', 'Host Star', 'Radius', 'Mass', 'ESI', 'Water', 'Status'];
        rowsHtml = chunk.map((item, idx) => `
            <tr onclick="showDetail(${currentData.length - chunk.length + idx})">
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
        manageLoadMoreButton(true);
    } else {
        const tbody = elements.dataContainer.querySelector('tbody');
        if (tbody) tbody.insertAdjacentHTML('beforeend', rowsHtml);
        manageLoadMoreButton(false);
    }
}

function manageLoadMoreButton(forceUpdate = false) {
    const hasMore = currentPage < totalPages;
    if (hasMore) {
        let btn = elements.loadMoreBtn;
        if (!btn) {
            const container = document.createElement('div');
            container.className = 'load-more-container';
            container.style.cssText = 'text-align:center; margin:20px 0;';
            btn = document.createElement('button');
            btn.className = 'theme-btn';
            btn.id = 'loadMoreBtn';
            btn.innerText = 'Load More';
            btn.onclick = handleLoadMore;
            container.appendChild(btn);
            elements.dataContainer.appendChild(container);
            elements.loadMoreBtn = btn;
        } else {
            btn.disabled = false;
            btn.innerText = 'Load More';
            btn.style.display = 'block';
        }
    } else if (elements.loadMoreBtn) {
        elements.loadMoreBtn.parentElement.remove();
        elements.loadMoreBtn = null;
    }
}

function handleLoadMore() {
    if (isLoading) return;
    elements.loadMoreBtn.disabled = true;
    elements.loadMoreBtn.innerText = 'Loading...';
    currentPage++;
    fetchData(false);
}

let searchDebounce = null;
function handleSearch(val) {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        const term = (val || '').toLowerCase().trim();
        const container = elements.dataContainer;
        if (!container || !window.globalData) return;

        if (!term) { fetchData(true); return; }

        const filtered = window.globalData.filter(item => {
            const str = `${item.name || ''} ${item.pl_name || ''} ${item.hostname || ''}`.toLowerCase();
            return str.includes(term);
        });

        if (!filtered.length) {
            container.innerHTML = '<p style="text-align:center;padding:30px;">🔍 No results found for "' + escapeHtml(term) + '"</p>';
            return;
        }
        renderTable(filtered, true);
    }, 300);
}

function showDetail(index) {
    const item = currentData[index];
    if (!item) return;

    const modalBody = document.getElementById('modal-body');
    const modal = document.getElementById('detail-modal');
    if (!modalBody || !modal) return;

    let html;
    if (currentTab === 'asteroids') {
        html = `
            <h2>🪨 ${escapeHtml(item.name)}</h2>
            <div class="detail-grid">
                <div><span class="detail-label">Date</span><span>${escapeHtml(item.date)}</span></div>
                <div><span class="detail-label">Diameter</span><span>${(item.diameter_km ?? 0).toFixed(2)} km</span></div>
                <div><span class="detail-label">Velocity</span><span>${(item.velocity_kmh ?? 0).toFixed(2)} km/h</span></div>
                <div><span class="detail-label">Hazardous</span><span>${item.hazardous ? '<span class="badge danger">Yes</span>' : '<span class="badge success">No</span>'}</span></div>
            </div>`;
    } else {
        html = `
            <h2>🪐 ${escapeHtml(item.pl_name)}</h2>
            <div class="detail-grid">
                <div><span class="detail-label">Host Star</span><span>${escapeHtml(item.hostname)}</span></div>
                <div><span class="detail-label">Radius</span><span>${(parseFloat(item.pl_rade) || 0).toFixed(2)} R⊕</span></div>
                <div><span class="detail-label">Mass</span><span>${(parseFloat(item.pl_bmasse) || 0).toFixed(2)} M⊕</span></div>
                <div><span class="detail-label">ESI</span><span>${item.esi ? parseFloat(item.esi).toFixed(3) : 'N/A'}</span></div>
                <div><span class="detail-label">Water</span><span>${escapeHtml(item.water_status || '?')}</span></div>
                <div><span class="detail-label">Discovery</span><span>${escapeHtml(item.pl_discmethod || '?')}</span></div>
            </div>`;
    }
    modalBody.innerHTML = html;
    modal.classList.add('open');
}

function closeModal() {
    const modal = document.getElementById('detail-modal');
    if (modal) modal.classList.remove('open');
}

function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
}

function closeModalById(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
}

function showChart() {
    if (!elements.chartModal) return;
    closeThreeModal();
    closeMapModal();
    openModal(elements.chartModal);
    if (typeof window.renderChart === 'function') {
        setTimeout(() => window.renderChart(currentData), 120);
    }
}

function closeChartModal() {
    closeModalById('chart-modal');
}

function toggle3DView() {
    if (!elements.threeModal) return;
    closeChartModal();
    closeMapModal();
    openModal(elements.threeModal);
    if (typeof window.load3DView === 'function') {
        setTimeout(() => window.load3DView(currentData, 'three-view-container'), 120);
    }
}

function closeThreeModal() {
    closeModalById('three-modal');
    if (typeof window.stop3DView === 'function') window.stop3DView();
}

function showMap() {
    if (!elements.mapModal) return;
    closeChartModal();
    closeThreeModal();
    openModal(elements.mapModal);
    setTimeout(() => renderMap(), 120);
}

function closeMapModal() {
    closeModalById('map-modal');
}

function renderMap() {
    const container = elements.mapContainer;
    if (!container) return;

    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth || 720;
    canvas.height = container.clientHeight || 400;
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const theme = getComputedStyle(document.documentElement);

    ctx.fillStyle = theme.getPropertyValue('--bg-panel-solid').trim() || '#fff';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = theme.getPropertyValue('--border-color').trim() || '#ddd';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, (h / 5) * i);
        ctx.lineTo(w, (h / 5) * i);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo((w / 7) * i, 0);
        ctx.lineTo((w / 7) * i, h);
        ctx.stroke();
    }

    const maxX = currentData.length || 1;
    const textColor = theme.getPropertyValue('--text-primary').trim() || '#333';
    const accent = theme.getPropertyValue('--accent').trim() || '#c97b3c';

    ctx.fillStyle = textColor;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`🗺️ ${currentTab === 'asteroids' ? 'Asteroid' : 'Exoplanet'} Distribution`, 14, 24);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = theme.getPropertyValue('--text-muted').trim() || '#999';
    ctx.fillText(`Showing top ${currentData.length} of ${window.totalPages * currentData.length}`, 14, 44);

    const step = Math.max(1, Math.floor(currentData.length / 120));
    for (let i = 0; i < currentData.length; i += step) {
        const item = currentData[i];
        const x = 30 + Math.random() * (w - 60);
        const y = 60 + Math.random() * (h - 100);

        let radius = 3;
        let color = accent;

        if (currentTab === 'asteroids') {
            if (item.diameter_km) {
                radius = Math.max(3, Math.min(10, parseFloat(item.diameter_km) / 200));
            }
            if (item.hazardous) color = theme.getPropertyValue('--danger').trim() || '#c6605a';
            else color = theme.getPropertyValue('--success').trim() || '#5a9e6f';
        } else {
            if (item.esi) {
                const esi = parseFloat(item.esi);
                radius = Math.max(3, Math.min(10, esi * 10));
                if (esi > 0.7) color = theme.getPropertyValue('--success').trim() || '#5a9e6f';
                else if (esi > 0.4) color = theme.getPropertyValue('--warning').trim() || '#d4a04a';
                else color = theme.getPropertyValue('--danger').trim() || '#c6605a';
            }
        }

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    const legendY = h - 20;
    ctx.font = '11px system-ui, sans-serif';
    if (currentTab === 'asteroids') {
        ctx.fillStyle = theme.getPropertyValue('--success').trim() || '#5a9e6f';
        ctx.fillText('● Safe', 14, legendY);
        ctx.fillStyle = theme.getPropertyValue('--danger').trim() || '#c6605a';
        ctx.fillText('● Hazardous', 60, legendY);
    } else {
        ctx.fillStyle = theme.getPropertyValue('--success').trim() || '#5a9e6f';
        ctx.fillText('● High ESI', 14, legendY);
        ctx.fillStyle = theme.getPropertyValue('--warning').trim() || '#d4a04a';
        ctx.fillText('● Medium ESI', 90, legendY);
        ctx.fillStyle = theme.getPropertyValue('--danger').trim() || '#c6605a';
        ctx.fillText('● Low ESI', 180, legendY);
    }
}

async function checkHabitability() {
    const inputVal = elements.planetInput?.value.trim();
    if (!inputVal) { alert("Please enter a planet name."); return; }

    if (elements.habitabilityResult) {
        elements.habitabilityResult.innerHTML = "<span class='loading'>Scanning System...</span>";
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

        let statusColor = '#aaa';
        let resultClass = '';
        if (data.status.toLowerCase().includes("high")) { statusColor = 'var(--success)'; resultClass = 'result-success'; }
        else if (data.status.toLowerCase().includes("hot")) { statusColor = 'var(--warning)'; resultClass = 'result-warning'; }
        else if (data.status.toLowerCase().includes("cold") || data.status.includes("Low")) { statusColor = 'var(--danger)'; resultClass = 'result-danger'; }

        if (elements.habitabilityResult) {
            elements.habitabilityResult.className = resultClass;
            elements.habitabilityResult.innerHTML = `
                <strong>${escapeHtml(data.planet)}</strong>: <span style="color:${statusColor}">${escapeHtml(data.status)}</span><br>
                <small>Orbital Period: ${data.period_days} days</small>`;
        }
    } catch (e) {
        console.error(e);
        if (elements.habitabilityResult) {
            elements.habitabilityResult.innerHTML = "<span class='badge danger'>System Offline</span>";
        }
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const AMP = '&' + 'amp;';
    const LT = '&' + 'lt;';
    const GT = '&' + 'gt;';
    const QUOT = '&' + 'quot;';
    const APOS = '&#' + '039;';
    const map = {
        '&': AMP,
        '<': LT,
        '>': GT,
        '"': QUOT,
        "'": APOS
    };
    return String(text).replace(/[&<>"']/g, function(ch) { return map[ch]; });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Universe Data Booklet Initialized");

    const savedTheme = localStorage.getItem('udb-theme');
    if (savedTheme && THEMES.includes(savedTheme)) setTheme(savedTheme);
    else setTheme('cream');

    const savedDensity = localStorage.getItem('udb-density');
    if (savedDensity) setDensity(savedDensity);

    fetchData(true);
});

window.switchTab = switchTab;
window.showChart = showChart;
window.toggle3DView = toggle3DView;
window.checkHabitability = checkHabitability;
window.handleSearch = handleSearch;
window.showDetail = showDetail;
window.closeModal = closeModal;
window.setTheme = setTheme;
window.setDensity = setDensity;
window.showMap = showMap;
window.closeChartModal = closeChartModal;
window.closeThreeModal = closeThreeModal;
window.closeMapModal = closeMapModal;

