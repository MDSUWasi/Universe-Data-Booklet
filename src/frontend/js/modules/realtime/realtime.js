// Realtime Dashboard Module
import { fetchApi, escapeHtml, showToast } from '../core/state.js';

const ENDPOINTS = {
  iss: '/api/realtime/iss',
  insight: '/api/realtime/insight',
  donki: '/api/realtime/donki',
  earthquakes: '/api/realtime/earthquakes',
};

export function initRealtime() {
  const refreshBtn = document.getElementById('realtime-refresh');
  const contentDiv = document.getElementById('realtime-content');
  
  if (!refreshBtn || !contentDiv) return;
  
  refreshBtn.addEventListener('click', loadAllData);
  loadAllData();
}

async function loadAllData() {
  const contentDiv = document.getElementById('realtime-content');
  const refreshBtn = document.getElementById('realtime-refresh');
  
  if (!contentDiv) return;
  
  refreshBtn?.classList.add('loading');
  refreshBtn?.querySelector('svg')?.style.setProperty('animation', 'spin 1s linear infinite');
  
  contentDiv.innerHTML = `
    <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; text-align: center; color: var(--color-space-500);">
      <div class="loading-icon" style="margin-bottom: 1rem;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-dasharray="31.4 31.4"></circle>
        </svg>
      </div>
      <p>Fetching live data from space agencies...</p>
    </div>
  `;
  
  try {
    const [iss, insight, donki, earthquakes] = await Promise.allSettled([
      fetchApi(ENDPOINTS.iss),
      fetchApi(ENDPOINTS.insight),
      fetchApi(ENDPOINTS.donki),
      fetchApi(ENDPOINTS.earthquakes),
    ]);
    
    renderDashboard({
      iss: iss.status === 'fulfilled' ? iss.value : null,
      insight: insight.status === 'fulfilled' ? insight.value : null,
      donki: donki.status === 'fulfilled' ? donki.value : null,
      earthquakes: earthquakes.status === 'fulfilled' ? earthquakes.value : null,
    });
    
  } catch (error) {
    console.error('Realtime load error:', error);
    contentDiv.innerHTML = `
      <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; text-align: center;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; color: var(--color-danger-400);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        </div>
        <h4 style="color: var(--color-space-100); margin-bottom: 0.5rem;">Failed to Load Live Data</h4>
        <p style="color: var(--color-space-500); max-width: 30ch;">${escapeHtml(error.message)}</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="window.RealtimeModule?.initRealtime()">Retry</button>
      </div>
    `;
    showToast('Failed to load realtime data', 'error');
  } finally {
    refreshBtn?.classList.remove('loading');
    refreshBtn?.querySelector('svg')?.style.removeProperty('animation');
  }
}

function renderDashboard(data) {
  const contentDiv = document.getElementById('realtime-content');
  if (!contentDiv) return;
  
  const cards = [];
  
  // ISS Card
  if (data.iss) {
    cards.push(createCard('🛰️', 'ISS Location', `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Latitude</span><br><strong style="font-family: var(--font-mono);">${data.iss.latitude?.toFixed(4) || '—'}°</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Longitude</span><br><strong style="font-family: var(--font-mono);">${data.iss.longitude?.toFixed(4) || '—'}°</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Altitude</span><br><strong style="font-family: var(--font-mono);">${data.iss.altitude ? (data.iss.altitude / 1000).toFixed(1) + ' km' : '—'}</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Velocity</span><br><strong style="font-family: var(--font-mono);">${data.iss.velocity ? (data.iss.velocity / 1000).toFixed(1) + ' km/s' : '—'}</strong></div>
      </div>
      <div style="font-size: 0.6875rem; color: var(--color-space-500);">Updated: ${data.iss.timestamp ? new Date(data.iss.timestamp * 1000).toLocaleTimeString() : '—'}</div>
    `, 'aurora'));
  }
  
  // InSight Mars Weather
  if (data.insight) {
    const sol = data.insight.sol_keys?.[0];
    const weather = sol ? data.insight[sol] : null;
    cards.push(createCard('🔴', `Mars Weather (Sol ${sol || '—'})`, weather ? `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Temp (Avg)</span><br><strong style="font-family: var(--font-mono);">${weather.AT?.av?.toFixed(1) || '—'}°C</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Pressure</span><br><strong style="font-family: var(--font-mono);">${weather.PRE?.av?.toFixed(1) || '—'} Pa</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Wind Speed</span><br><strong style="font-family: var(--font-mono);">${weather.HWS?.av?.toFixed(1) || '—'} m/s</strong></div>
        <div><span style="color: var(--color-space-500); font-size: 0.75rem;">Season</span><br><strong>${escapeHtml(weather.Season || '—')}</strong></div>
      </div>
    ` : '<p style="color: var(--color-space-500);">No data available</p>', 'danger'));
  }
  
  // DONKI Space Weather
  if (data.donki?.length) {
    cards.push(createCard('☀️', 'Space Weather (DONKI)', `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto;">
        ${data.donki.slice(0, 4).map(event => `
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-sm); padding: 0.75rem;">
            <div style="font-weight: 500; color: var(--color-space-100);">${escapeHtml(event.activityID || event.messageType || 'Event')}</div>
            <div style="font-size: 0.6875rem; color: var(--color-space-500);">${event.eventTime ? new Date(event.eventTime).toLocaleString() : ''}</div>
          </div>
        `).join('')}
      </div>
    `, 'solar'));
  }
  
  // Earthquakes
  if (data.earthquakes?.features?.length) {
    cards.push(createCard('🌋', 'Recent Earthquakes (USGS)', `
      <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto;">
        ${data.earthquakes.features.slice(0, 5).map(eq => {
          const props = eq.properties;
          const mag = props.mag;
          const magColor = mag >= 6 ? 'var(--color-danger-400)' : mag >= 4 ? 'var(--color-solar-400)' : 'var(--color-success-400)';
          return `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-sm); padding: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 500; color: var(--color-space-100);">${escapeHtml(props.place || 'Unknown location')}</div>
                  <div style="font-size: 0.6875rem; color: var(--color-space-500);">${new Date(props.time).toLocaleString()}</div>
                </div>
                <div style="font-family: var(--font-mono); font-size: 1.125rem; font-weight: 700; color: ${magColor};">${mag?.toFixed(1) || '?'}M</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `, 'void'));
  }
  
  if (cards.length === 0) {
    contentDiv.innerHTML = `
      <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; text-align: center; color: var(--color-space-500);">
        <p>No live data available at the moment</p>
      </div>
    `;
    return;
  }
  
  contentDiv.innerHTML = cards.join('');
}

function createCard(icon, title, content, colorTheme) {
  const colors = {
    nebula: { bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.2)', iconBg: 'rgba(124,58,237,0.2)' },
    aurora: { bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', iconBg: 'rgba(6,182,212,0.2)' },
    solar: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', iconBg: 'rgba(245,158,11,0.2)' },
    danger: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', iconBg: 'rgba(239,68,68,0.2)' },
    void: { bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.2)', iconBg: 'rgba(20,184,166,0.2)' },
  };
  
  const c = colors[colorTheme] || colors.nebula;
  
  return `
    <div style="
      background: ${c.bg};
      border: 1px solid ${c.border};
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      display: flex; flex-direction: column;
      transition: var(--transition-base);
    " onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-lg)'" onmouseleave="this.style.transform=''; this.style.boxShadow=''">
      <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
        <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: ${c.iconBg}; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">${icon}</div>
        <h3 style="font-family: var(--font-display); font-size: 0.9375rem; font-weight: 600; color: var(--color-space-100);">${title}</h3>
      </div>
      <div>${content}</div>
    </div>
  `;
}