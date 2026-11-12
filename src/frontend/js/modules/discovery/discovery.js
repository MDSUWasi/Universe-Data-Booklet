// Discovery Lab Module
import { fetchApi, showToast, escapeHtml } from '../core/state.js';

let cacheStats = { hits: 0, misses: 0, entries: 0, live: 0 };

export function initDiscovery() {
  const latInput = document.getElementById('disc-lat');
  const lngInput = document.getElementById('disc-lng');
  const runBtn = document.getElementById('disc-run');
  const randomBtn = document.getElementById('disc-random');
  const resultDiv = document.getElementById('disc-result');
  const cacheClearBtn = document.getElementById('disc-cache-clear');
  
  if (!latInput || !lngInput || !runBtn || !randomBtn || !resultDiv) return;
  
  // Preset coordinates for "Surprise Me"
  const presets = [
    { lat: -77.8419, lng: 166.6863, name: 'McMurdo Dry Valleys, Antarctica' },
    { lat: -49.35, lng: 69.5, name: 'Kerguelen Plateau, Indian Ocean' },
    { lat: 79.5, lng: -90.0, name: 'Axel Heiberg Island, Arctic' },
    { lat: 18.4446, lng: 77.4508, name: 'Jezero Crater, Mars (analog)' },
    { lat: 34.0522, lng: -118.2437, name: 'Los Angeles, CA' },
    { lat: 51.5074, lng: -0.1278, name: 'London, UK' },
    { lat: -33.8688, lng: 151.2093, name: 'Sydney, Australia' },
    { lat: 35.6762, lng: 139.6503, name: 'Tokyo, Japan' },
  ];
  
  runBtn.addEventListener('click', analyzeTerrain);
  randomBtn.addEventListener('click', () => {
    const preset = presets[Math.floor(Math.random() * presets.length)];
    latInput.value = preset.lat;
    lngInput.value = preset.lng;
    analyzeTerrain();
  });
  
  cacheClearBtn?.addEventListener('click', async () => {
    try {
      await fetchApi('/api/cache/clear', { method: 'POST' });
      cacheStats = { hits: 0, misses: 0, entries: 0, live: 0 };
      updateCacheDisplay();
      showToast('Cache cleared', 'success');
    } catch (error) {
      showToast('Failed to clear cache', 'error');
    }
  });
  
  // Enter key in inputs
  [latInput, lngInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') analyzeTerrain();
    });
  });
  
  // Load initial cache stats
  loadCacheStats();
}

async function analyzeTerrain() {
  const latInput = document.getElementById('disc-lat');
  const lngInput = document.getElementById('disc-lng');
  const runBtn = document.getElementById('disc-run');
  const resultDiv = document.getElementById('disc-result');
  
  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);
  
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    showToast('Please enter valid coordinates (lat: -90 to 90, lng: -180 to 180)', 'warning');
    return;
  }
  
  runBtn.disabled = true;
  runBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
      <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4"></circle>
    </svg>
    Analyzing...
  `;
  
  resultDiv.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 200px; text-align: center; color: var(--color-space-500);">
      <div class="loading-icon" style="margin-bottom: 1rem;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4"></circle>
        </svg>
      </div>
      <p>Sampling elevation grid...</p>
    </div>
  `;
  
  try {
    const result = await fetchApi(`/api/terrain/analyze?lat=${lat}&lng=${lng}`);
    
    if (result.error) throw new Error(result.error);
    
    renderResult(result, lat, lng);
    loadCacheStats();
    
  } catch (error) {
    console.error('Discovery error:', error);
    resultDiv.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 200px; text-align: center; padding: 2rem;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--color-danger-400);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <h4 style="color: var(--color-space-100); margin-bottom: 0.5rem;">Analysis Failed</h4>
        <p style="color: var(--color-space-500); max-width: 30ch;">${escapeHtml(error.message)}</p>
      </div>
    `;
    showToast('Terrain analysis failed: ' + error.message, 'error');
  } finally {
    runBtn.disabled = false;
    runBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      Analyze Terrain
    `;
  }
}

function renderResult(data, lat, lng) {
  const resultDiv = document.getElementById('disc-result');
  if (!resultDiv) return;
  
  const { elevations, slope_deg, relief_m, stats } = data;
  
  // Create elevation visualization
  const minElev = Math.min(...elevations.flat());
  const maxElev = Math.max(...elevations.flat());
  const range = maxElev - minElev || 1;
  
  const gridHtml = elevations.map((row, y) => `
    <div style="display: flex; gap: 2px;">
      ${row.map((elev, x) => {
        const intensity = (elev - minElev) / range;
        const hue = 240 - intensity * 240; // Blue to red
        return `
          <div style="
            width: 32px; height: 32px;
            background: hsl(${hue}, 70%, ${30 + intensity * 40}%);
            border-radius: 4px;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.625rem; font-family: var(--font-mono); font-weight: 600;
            color: ${intensity > 0.5 ? '#030712' : 'white'};
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
          " title="Elevation: ${elev.toFixed(1)}m">${Math.round(elev)}</div>
        `;
      }).join('')}
    </div>
  `).join('');
  
  // Determine terrain classification
  let classification = 'Flat Plains';
  let classColor = 'var(--color-success-400)';
  let classDesc = 'Suitable for landing';
  
  if (slope_deg > 10) {
    classification = 'Steep Terrain';
    classColor = 'var(--color-danger-400)';
    classDesc = 'High slope hazard';
  } else if (slope_deg > 5) {
    classification = 'Moderate Slopes';
    classColor = 'var(--color-solar-400)';
    classDesc = 'Moderate slope hazard';
  } else if (slope_deg > 3) {
    classification = 'Gentle Slopes';
    classColor = 'var(--color-solar-400)';
    classDesc = 'Mild slope hazard';
  }
  
  if (relief_m > 100) {
    classification = 'Rugged Terrain';
    classColor = 'var(--color-danger-400)';
    classDesc = 'High relief hazard';
  } else if (relief_m > 50) {
    classification = 'Undulating';
    classColor = 'var(--color-solar-400)';
    classDesc = 'Moderate relief';
  }
  
  resultDiv.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Classification Banner -->
      <div style="
        background: linear-gradient(135deg, ${classColor}22, ${classColor}11);
        border: 1px solid ${classColor}44;
        border-radius: var(--radius-lg);
        padding: 1.25rem;
        display: flex; align-items: center; gap: 1rem;
      ">
        <div style="
          width: 48px; height: 48px; border-radius: var(--radius-md);
          background: linear-gradient(135deg, ${classColor}33, ${classColor}11);
          border: 1px solid ${classColor}44;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.5rem;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${classColor}" stroke-width="2">
            ${slope_deg > 5 ? '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>' : '<path d="M8 3 4 7l4 4"/><path d="M16 3 20 7l-4 4"/><path d="M8 21 4 17l4-4"/><path d="M16 21 20 17l-4-4"/>'}
          </svg>
        </div>
        <div>
          <h4 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; color: var(--color-space-50);">${classification}</h4>
          <p style="font-size: 0.8125rem; color: ${classColor};">${classDesc}</p>
        </div>
        <div style="margin-left: auto; text-align: right;">
          <div style="font-family: var(--font-mono); font-size: 1.5rem; font-weight: 700; color: ${classColor};">${slope_deg.toFixed(1)}°</div>
          <div style="font-size: 0.6875rem; color: var(--color-space-500);">Mean Slope</div>
        </div>
      </div>
      
      <!-- Metrics Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem;">
        <div class="metric-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.25rem;">📍</span>
            <span style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500);">Coordinates</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--color-space-100);">${lat.toFixed(4)}°, ${lng.toFixed(4)}°</div>
        </div>
        
        <div class="metric-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.25rem;">⛰️</span>
            <span style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500);">Elevation Range</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--color-space-100);">${stats.min.toFixed(1)} — ${stats.max.toFixed(1)} m</div>
        </div>
        
        <div class="metric-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.25rem;">📏</span>
            <span style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500);">Mean Elevation</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--color-space-100);">${stats.mean.toFixed(1)} m</div>
        </div>
        
        <div class="metric-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.25rem;">📐</span>
            <span style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500);">Local Relief</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--color-space-100);">${relief_m.toFixed(1)} m</div>
        </div>
        
        <div class="metric-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.25rem;">📊</span>
            <span style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500);">Std Deviation</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--color-space-100);">${stats.std.toFixed(2)} m</div>
        </div>
        
        <div class="metric-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.25rem;">🔍</span>
            <span style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500);">Sample Resolution</span>
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.875rem; color: var(--color-space-100);">~90 m / pixel</div>
        </div>
      </div>
      
      <!-- Elevation Grid -->
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
          <h4 style="font-family: var(--font-display); font-size: 0.875rem; font-weight: 600; color: var(--color-space-100);">3×3 Elevation Grid (meters)</h4>
          <div style="display: flex; gap: 0.5rem; font-size: 0.625rem; color: var(--color-space-500);">
            <span>Low: ${minElev.toFixed(1)}m</span>
            <span>High: ${maxElev.toFixed(1)}m</span>
          </div>
        </div>
        <div style="display: flex; justify-content: center;">
          ${gridHtml}
        </div>
      </div>
      
      <!-- Disclaimer -->
      <details style="margin-top: 1rem; padding: 1rem; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); border-radius: var(--radius-md);">
        <summary style="cursor: pointer; font-weight: 500; color: var(--color-solar-400); display: flex; align-items: center; gap: 0.5rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
          Important Limitations
        </summary>
        <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--color-space-400); line-height: 1.7;">
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li>Data from Open-Meteo elevation API (90m resolution SRTM/ASTER)</li>
            <li>3×3 grid = ~270m × 270m area — not a landing-site assessment</li>
            <li>Slope calculated via finite differences — coarse approximation</li>
            <li>No hazard detection (rocks, shadows, thermal, trafficability)</li>
            <li>Results cached in browser — may not reflect latest data</li>
            <li><strong>Educational use only — not for mission planning</strong></li>
          </ul>
        </div>
      </details>
    </div>
  `;
}

async function loadCacheStats() {
  try {
    const result = await fetchApi('/api/cache/stats');
    cacheStats = result;
    updateCacheDisplay();
  } catch (error) {
    console.warn('Could not load cache stats:', error);
  }
}

function updateCacheDisplay() {
  const hits = document.getElementById('cache-hits');
  const misses = document.getElementById('cache-misses');
  const entries = document.getElementById('cache-entries');
  const live = document.getElementById('cache-live');
  const summary = document.getElementById('cache-summary');
  
  if (hits) hits.textContent = cacheStats.hits || 0;
  if (misses) misses.textContent = cacheStats.misses || 0;
  if (entries) entries.textContent = cacheStats.entries || 0;
  if (live) live.textContent = cacheStats.live || 0;
  if (summary) {
    const total = (cacheStats.hits || 0) + (cacheStats.misses || 0);
    const rate = total > 0 ? ((cacheStats.hits || 0) / total * 100).toFixed(1) : 0;
    summary.textContent = `Hit rate: ${rate}%`;
  }
}