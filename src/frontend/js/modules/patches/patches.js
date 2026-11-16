// Patch Explorer Module
import { fetchApi, escapeHtml, showToast } from '../core/state.js';

let patchesData = [];

export function initPatches() {
  const bodySelect = document.getElementById('patch-body');
  const kindSelect = document.getElementById('patch-kind');
  const rowsBody = document.getElementById('patch-rows');
  const countDiv = document.getElementById('patch-count');
  const statusDiv = document.getElementById('patch-status');
  const refreshBtn = document.getElementById('patch-refresh');
  
  if (!bodySelect || !kindSelect || !rowsBody) return;
  
  bodySelect.addEventListener('change', renderPatches);
  kindSelect.addEventListener('change', renderPatches);
  refreshBtn?.addEventListener('click', () => loadPatches(true));
  
  loadPatches();
}

async function loadPatches(forceRefresh = false) {
  const countDiv = document.getElementById('patch-count');
  const rowsBody = document.getElementById('patch-rows');
  const statusDiv = document.getElementById('patch-status');
  const refreshBtn = document.getElementById('patch-refresh');
  const refreshIcon = refreshBtn?.querySelector('svg');
  
  if (forceRefresh) {
    refreshBtn?.classList.add('loading');
    refreshIcon?.style.setProperty('animation', 'spin 1s linear infinite');
  } else if (!patchesData.length) {
    if (countDiv) countDiv.textContent = 'Loading patch report…';
  }
  
  try {
    const result = await fetchApi('/api/patches' + (forceRefresh ? '?t=' + Date.now() : ''));
    if (result.error) throw new Error(result.error);
    
    patchesData = result.records || result.patches || result.data || [];
    renderPatches();
    
  } catch (error) {
    console.error('Patches load error:', error);
    if (countDiv) countDiv.textContent = 'Failed to load patch data';
    if (statusDiv) statusDiv.textContent = `Error: ${error.message}`;
    showToast('Failed to load patches: ' + error.message, 'error');
  } finally {
    refreshBtn?.classList.remove('loading');
    refreshIcon?.style.removeProperty('animation');
  }
}

function renderPatches() {
  const bodySelect = document.getElementById('patch-body');
  const kindSelect = document.getElementById('patch-kind');
  const rowsBody = document.getElementById('patch-rows');
  const countDiv = document.getElementById('patch-count');
  const statusDiv = document.getElementById('patch-status');
  
  if (!rowsBody) return;
  
  const bodyFilter = bodySelect?.value || 'all';
  const kindFilter = kindSelect?.value || 'all';
  
  let filtered = patchesData;
  
  if (bodyFilter !== 'all') {
    filtered = filtered.filter(p => (p.body || '').toLowerCase() === bodyFilter.toLowerCase());
  }
  
  if (kindFilter === 'valid') {
    filtered = filtered.filter(p => !p.filled);
  } else if (kindFilter === 'filled') {
    filtered = filtered.filter(p => p.filled);
  }
  
  if (countDiv) countDiv.textContent = `Showing ${filtered.length} of ${patchesData.length} patches`;
  
  rowsBody.innerHTML = filtered.map(patch => `
    <tr style="cursor: pointer;">
      <td style="font-weight: 500; color: var(--color-space-100);">${escapeHtml(patch.site || '—')}</td>
      <td>
        <span style="
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-full);
          font-size: 0.625rem;
          font-weight: 600;
          background: ${getBodyColor(patch.body)};
          color: ${getBodyTextColor(patch.body)};
        ">${getBodySymbol(patch.body)} ${escapeHtml(patch.body || '—')}</span>
      </td>
      <td style="font-family: var(--font-mono);">${patch.area_km2?.toFixed(2) || '—'}</td>
      <td style="font-family: var(--font-mono);">${patch.slope_mean_deg?.toFixed(2) || '—'}</td>
      <td style="font-family: var(--font-mono);">${patch.centre_x || '—'}</td>
      <td style="font-family: var(--font-mono);">${patch.centre_y || '—'}</td>
      <td style="font-family: var(--font-mono);">${patch.rough_mean_m?.toFixed(2) || '—'}</td>
      <td style="font-family: var(--font-mono);">${patch.rough_p95_m?.toFixed(2) || '—'}</td>
      <td style="font-family: var(--font-mono);">${patch.rough_max_m?.toFixed(2) || '—'}</td>
      <td style="font-family: var(--font-mono);">${(patch.zero_frac * 100).toFixed(1) || '—'}%</td>
      <td>
        ${patch.filled ? `
          <span class="badge badge-danger" style="background: rgba(239,68,68,0.2); color: var(--color-danger-400); border-color: rgba(239,68,68,0.3);">
            FILLED
          </span>
        ` : `
          <span class="badge badge-success" style="background: rgba(34,197,94,0.2); color: var(--color-success-400); border-color: rgba(34,197,94,0.3);">
            Valid
          </span>
        `}
      </td>
    </tr>
  `).join('');
  
  if (statusDiv) {
    const valid = filtered.filter(p => !p.filled).length;
    const filled = filtered.filter(p => p.filled).length;
    statusDiv.textContent = `Valid: ${valid} | Filled/Flagged: ${filled} | Total area: ${filtered.reduce((sum, p) => sum + (p.area_km2 || 0), 0).toFixed(2)} km²`;
  }
}

function getBodySymbol(body) {
  switch ((body || '').toLowerCase()) {
    case 'earth': return '●';
    case 'moon': return '○';
    case 'mars': return '▲';
    default: return '◆';
  }
}

function getBodyColor(body) {
  switch ((body || '').toLowerCase()) {
    case 'earth': return 'rgba(34,197,94,0.2)';
    case 'moon': return 'rgba(107,114,128,0.2)';
    case 'mars': return 'rgba(239,68,68,0.2)';
    default: return 'rgba(124,58,237,0.2)';
  }
}

function getBodyTextColor(body) {
  switch ((body || '').toLowerCase()) {
    case 'earth': return 'var(--color-success-400)';
    case 'moon': return 'var(--color-space-400)';
    case 'mars': return 'var(--color-danger-400)';
    default: return 'var(--color-nebula-400)';
  }
}