// Data fetching and management for asteroids and exoplanets
import { State, Config, fetchApi, escapeHtml, formatNumber, formatInteger, debounce, showToast } from '../core/state.js';

let abortController = null;

export async function loadData(view, reset = true) {
  if (State.isLoading) return;
  
  if (reset) {
    State.currentPage = 1;
    State.currentData = [];
    State.totalPages = 1;
    State.totalCount = 0;
    renderTable([]);
    renderStats({});
  }
  
  State.isLoading = true;
  showLoading(true);
  
  if (abortController) abortController.abort();
  abortController = new AbortController();
  
  try {
    const resource = view === 'asteroids' ? 'asteroids' : 'exoplanets';
    const params = new URLSearchParams({
      page: State.currentPage,
      limit: State.pageSize,
      sort: State.sortOrder,
    });
    
    if (State.searchTerm) params.append('search', State.searchTerm);
    if (State.activeFilters.hazard) params.append('hazard', State.activeFilters.hazard);
    
    const result = await fetchApi(`/${resource}?${params}`, { signal: abortController.signal });
    
    State.totalPages = result.total_pages || 1;
    State.totalCount = result.total_count || 0;
    const newChunk = result.data || [];
    
    if (reset) {
      State.currentData = newChunk;
    } else {
      State.currentData = [...State.currentData, ...newChunk];
    }
    
    renderStats(result);
    renderTable(newChunk, reset);
    updatePagination();
    updateCounts(view);
    
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Fetch error:', error);
      showError(error.message);
      showToast(`Failed to load ${view}: ${error.message}`, 'error');
    }
  } finally {
    State.isLoading = false;
    showLoading(false);
  }
}

function renderStats(result) {
  const grid = document.getElementById('stats-grid');
  if (!grid) return;
  
  const source = result.source || 'Unknown';
  const hazardous = State.currentData.filter(i => i.hazardous).length;
  const habitable = State.currentData.filter(i => i.esi && parseFloat(i.esi) > 0.6).length;
  
  const cards = State.currentView === 'asteroids' ? [
    { icon: '☄️', label: 'Total Records', value: formatInteger(State.totalCount) },
    { icon: '📥', label: 'Loaded', value: formatInteger(State.currentData.length) },
    { icon: '⚠️', label: 'Hazardous', value: formatInteger(hazardous), trend: { positive: false, label: `${((hazardous/State.currentData.length)*100).toFixed(1)}%` } },
    { icon: '📄', label: 'Page', value: `${State.currentPage} / ${State.totalPages}`, trend: { positive: true, label: source } },
  ] : [
    { icon: '🪐', label: 'Total Records', value: formatInteger(State.totalCount) },
    { icon: '📥', label: 'Loaded', value: formatInteger(State.currentData.length) },
    { icon: '🌊', label: 'Habitable (ESI>0.6)', value: formatInteger(habitable), trend: { positive: true, label: `${((habitable/State.currentData.length)*100).toFixed(1)}%` } },
    { icon: '📄', label: 'Page', value: `${State.currentPage} / ${State.totalPages}`, trend: { positive: true, label: source } },
  ];
  
  grid.innerHTML = cards.map(c => createStatCard(c.icon, c.label, c.value, c.trend)).join('');
  
  // Animate stat values
  grid.querySelectorAll('.stat-card-value').forEach((el, i) => {
    const target = parseInt(cards[i].value.replace(/,/g, '')) || 0;
    animateValue(el, 0, target, 800);
  });
}

function renderTable(chunk, reset) {
  const tbody = document.getElementById('table-body');
  const thead = document.getElementById('table-head');
  if (!tbody || !thead) return;
  
  if (reset) {
    thead.innerHTML = State.currentView === 'asteroids' 
      ? '<th>Name</th><th>Date</th><th>Diameter (km)</th><th>Velocity (km/h)</th><th>Hazard</th>'
      : '<th>Name</th><th>Host Star</th><th>Radius (R⊕)</th><th>Mass (M⊕)</th><th>ESI</th><th>Water</th><th>Status</th>';
  }
  
  const rows = chunk.map((item, idx) => {
    const globalIdx = State.currentData.length - chunk.length + idx;
    
    if (State.currentView === 'asteroids') {
      const hazardous = item.hazardous;
      return `
        <tr data-index="${globalIdx}" style="cursor: pointer;">
          <td class="cell-name">${escapeHtml(item.name || item.designation || 'Unknown')}</td>
          <td class="cell-value">${escapeHtml(item.date || '—')}</td>
          <td class="cell-value">${formatNumber(item.diameter_km)}</td>
          <td class="cell-value">${formatInteger(item.velocity_kmh)}</td>
          <td>${createBadge(hazardous ? 'Hazardous' : 'Safe', hazardous ? 'hazardous' : 'safe')}</td>
        </tr>
      `;
    } else {
      const esi = item.esi ? parseFloat(item.esi) : null;
      let esiBadge = 'unknown';
      if (esi !== null) {
        if (esi > 0.7) esiBadge = 'high';
        else if (esi > 0.4) esiBadge = 'medium';
        else esiBadge = 'low';
      }
      return `
        <tr data-index="${globalIdx}" style="cursor: pointer;">
          <td class="cell-name">${escapeHtml(item.pl_name || 'Unknown')}</td>
          <td class="cell-value">${escapeHtml(item.hostname || '—')}</td>
          <td class="cell-value">${formatNumber(item.pl_rade)}</td>
          <td class="cell-value">${formatNumber(item.pl_bmasse)}</td>
          <td>${esi !== null ? `<span class="badge badge-${esiBadge}" style="font-family: var(--font-mono);">${esi.toFixed(3)}</span>` : createBadge('N/A', 'unknown')}</td>
          <td>${createBadge(item.water_status || '?', 'unknown')}</td>
          <td>${createBadge(item.status || '?', 'unknown')}</td>
        </tr>
      `;
    }
  }).join('');
  
  if (reset) {
    tbody.innerHTML = rows;
  } else {
    tbody.insertAdjacentHTML('beforeend', rows);
  }
  
  // Add click handlers for detail view
  tbody.querySelectorAll('tr[data-index]').forEach(row => {
    row.addEventListener('click', () => showDetail(parseInt(row.dataset.index)));
  });
}

function updatePagination() {
  const container = document.getElementById('pagination');
  if (!container) return;
  
  if (State.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let html = `
    <button class="page-btn" data-page="${State.currentPage - 1}" ${State.currentPage <= 1 ? 'disabled' : ''} aria-label="Previous page">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
    </button>
  `;
  
  const maxPages = 5;
  let start = Math.max(1, State.currentPage - Math.floor(maxPages / 2));
  let end = Math.min(State.totalPages, start + maxPages - 1);
  
  if (end - start + 1 < maxPages) {
    start = Math.max(1, end - maxPages + 1);
  }
  
  if (start > 1) {
    html += `<button class="page-btn" data-page="1">1</button>`;
    if (start > 2) html += `<span class="page-info">…</span>`;
  }
  
  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === State.currentPage ? 'active' : ''}" data-page="${i}" ${i === State.currentPage ? 'aria-current="page"' : ''}>${i}</button>`;
  }
  
  if (end < State.totalPages) {
    if (end < State.totalPages - 1) html += `<span class="page-info">…</span>`;
    html += `<button class="page-btn" data-page="${State.totalPages}">${State.totalPages}</button>`;
  }
  
  html += `
    <button class="page-btn" data-page="${State.currentPage + 1}" ${State.currentPage >= State.totalPages ? 'disabled' : ''} aria-label="Next page">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </button>
  `;
  
  container.innerHTML = html;
  
  container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (page !== State.currentPage && page >= 1 && page <= State.totalPages) {
        State.currentPage = page;
        loadData(State.currentView, false);
      }
    });
  });
}

function updateCounts(view) {
  const asteroidCount = document.getElementById('asteroid-count');
  const exoplanetCount = document.getElementById('exoplanet-count');
  
  if (view === 'asteroids' && asteroidCount) {
    asteroidCount.textContent = formatInteger(State.totalCount);
  } else if (view === 'exoplanets' && exoplanetCount) {
    exoplanetCount.textContent = formatInteger(State.totalCount);
  }
}

function showLoading(show) {
  const tbody = document.getElementById('table-body');
  if (show && State.currentPage === 1) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${State.currentView === 'asteroids' ? 5 : 7}" style="text-align: center; padding: 3rem;">
          <div class="loading-state">
            <div class="loading-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4" stroke-dashoffset="0"></circle>
              </svg>
            </div>
            <p class="empty-state-title">Loading data…</p>
          </div>
        </td>
      </tr>
    `;
  }
}

function showError(message) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = `
    <tr>
      <td colspan="${State.currentView === 'asteroids' ? 5 : 7}" style="text-align: center; padding: 3rem;">
        <div class="error-state">
          <div class="error-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <p class="error-title">Failed to Load</p>
          <p class="error-desc">${escapeHtml(message)}</p>
          <button class="btn-retry" onclick="window.App?.loadCurrentView()">Retry</button>
        </div>
      </td>
    </tr>
  `;
}

export function showDetail(index) {
  const item = State.currentData[index];
  if (!item) return;
  
  const modal = document.getElementById('modal-detail');
  const title = document.getElementById('modal-detail-title');
  const body = document.getElementById('modal-detail-body');
  if (!modal || !title || !body) return;
  
  if (State.currentView === 'asteroids') {
    title.textContent = item.name || item.designation || 'Asteroid';
    body.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Designation</span><br><strong>${escapeHtml(item.designation || '—')}</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Date</span><br><strong>${escapeHtml(item.date || '—')}</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Diameter</span><br><strong>${formatNumber(item.diameter_km)} km</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Velocity</span><br><strong>${formatInteger(item.velocity_kmh)} km/h</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Distance</span><br><strong>${item.distance_au ? formatNumber(item.distance_au) + ' AU' : '—'}</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Hazardous</span><br><strong>${createBadge(item.hazardous ? 'Yes' : 'No', item.hazardous ? 'hazardous' : 'safe')}</strong></div>
      </div>
    `;
  } else {
    title.textContent = item.pl_name || 'Exoplanet';
    const esi = item.esi ? parseFloat(item.esi) : null;
    let esiBadge = 'unknown';
    if (esi !== null) {
      if (esi > 0.7) esiBadge = 'high';
      else if (esi > 0.4) esiBadge = 'medium';
      else esiBadge = 'low';
    }
    body.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Host Star</span><br><strong>${escapeHtml(item.hostname || '—')}</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Discovery Method</span><br><strong>${escapeHtml(item.pl_discmethod || '—')}</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Radius</span><br><strong>${formatNumber(item.pl_rade)} R⊕</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Mass</span><br><strong>${formatNumber(item.pl_bmasse)} M⊕</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Orbital Period</span><br><strong>${formatNumber(item.pl_orbper)} days</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Distance</span><br><strong>${formatNumber(item.sy_dist)} ly</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">ESI</span><br><strong>${esi !== null ? `<span class="badge badge-${esiBadge}" style="font-family: var(--font-mono);">${esi.toFixed(3)}</span>` : createBadge('N/A', 'unknown')}</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Water Status</span><br><strong>${createBadge(item.water_status || '?', 'unknown')}</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Discovery Year</span><br><strong>${escapeHtml(item.pl_disc || '—')}</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Status</span><br><strong>${createBadge(item.status || '?', 'unknown')}</strong></div>
      </div>
    `;
  }
  
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function createStatCard(icon, label, value, trend = null) {
  const trendHtml = trend ? `
    <div class="stat-card-trend ${trend.positive ? 'positive' : 'negative'}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="${trend.positive ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"></polyline>
      </svg>
      <span>${escapeHtml(trend.label)}</span>
    </div>
  ` : '';
  
  return `
    <div class="stat-card">
      <div class="stat-card-icon">${icon}</div>
      <div class="stat-card-content">
        <span class="stat-card-label">${escapeHtml(label)}</span>
        <span class="stat-card-value">${escapeHtml(value)}</span>
        ${trendHtml}
      </div>
    </div>
  `;
}

function createBadge(text, variant = 'unknown') {
  const variants = {
    hazardous: 'badge-hazardous',
    safe: 'badge-safe',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
    unknown: 'badge-unknown',
  };
  return `<span class="badge ${variants[variant] || 'badge-unknown'}">${escapeHtml(text)}</span>`;
}

function animateValue(element, start, end, duration = 600) {
  const startTime = performance.now();
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * eased;
    element.textContent = Math.round(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

// Search handling
export function initSearch(onSearch) {
  const input = document.getElementById('search-input');
  if (!input) return;
  
  const debouncedSearch = debounce((value) => {
    State.searchTerm = value.trim().toLowerCase();
    onSearch();
  }, 300);
  
  input.addEventListener('input', (e) => debouncedSearch(e.target.value));
  
  // Clear on escape
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      input.blur();
      debouncedSearch('');
    }
  });
}

// Filter handling
export function initFilters(onFilterChange) {
  const hazardFilter = document.getElementById('filter-hazard');
  const sortFilter = document.getElementById('filter-sort');
  
  if (hazardFilter) {
    hazardFilter.addEventListener('change', (e) => {
      State.activeFilters.hazard = e.target.value || null;
      onFilterChange();
    });
  }
  
  if (sortFilter) {
    sortFilter.addEventListener('change', (e) => {
      State.sortOrder = e.target.value;
      onFilterChange();
    });
  }
}

// Load more handler
export function initLoadMore(onLoadMore) {
  // Handled via pagination now
}

// Public API
export function getCurrentData() {
  return State.currentData;
}

export function getCurrentView() {
  return State.currentView;
}

export function setCurrentView(view) {
  State.currentView = view;
  updatePageHeader(view);
}

function updatePageHeader(view) {
  const title = document.getElementById('page-title');
  const subtitle = document.getElementById('page-subtitle');
  
  if (view === 'asteroids') {
    title.textContent = 'Near-Earth Asteroids';
    subtitle.textContent = 'Tracking close approaches from the last 30 days';
  } else {
    title.textContent = 'Exoplanets';
    subtitle.textContent = 'Confirmed discoveries from NASA Exoplanet Archive';
  }
  
  // Update tab buttons
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    const active = btn.dataset.tab === view;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });
}