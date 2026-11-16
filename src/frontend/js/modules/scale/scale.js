// Scale Sensitivity Module
import { fetchApi, showToast } from '../core/state.js';

let scaleChart = null;
let refreshTimer = null;

export function initScale() {
  loadScaleData();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(loadScaleData, 30000);
}

async function loadScaleData() {
  const summaryDiv = document.getElementById('scale-summary');
  const statusDiv = document.getElementById('scale-status');
  const canvas = document.getElementById('scale-chart');

  if (!canvas) return;

  try {
    const result = await fetchApi('/api/scale-sensitivity');
    if (result.error) throw new Error(result.error);

    renderScaleChart(result, canvas);

    const fingerprints = result.fingerprints || [];
    const reference = result.comparison_reference || {};
    const shortWindow = result.fingerprint_window_m;
    const longWindow = result.comparison_window_m;

    if (summaryDiv) {
      summaryDiv.textContent = result.warning || '';
    }

    if (statusDiv) {
      const means = fingerprints.map(p => p.roughness_mean_m);
      const areas = fingerprints.map(p => p.area_km2);
      const slopes = fingerprints.map(p => p.slope_mean_deg);
      statusDiv.textContent =
        'Recorded ' + shortWindow + ' m fingerprints: mean ' +
        means.map(v => v.toFixed(3)).join(', ') + ' m; area ' +
        areas.map(v => v.toFixed(3)).join(', ') + ' km²; slope ' +
        slopes.map(v => (Number.isFinite(v) ? v.toFixed(3) : '-')).join(', ') +
        '°. ' + longWindow + ' m reference: mean ' +
        (reference.mean_roughness_m ?? 0).toFixed(3) + ' m, p95 ' +
        (reference.p95_roughness_m ?? 0).toFixed(3) + '. Updated ' + new Date().toLocaleTimeString();
    }
  } catch (error) {
    console.error('Scale load error:', error);
    if (summaryDiv) summaryDiv.textContent = `Error loading data: ${error.message}`;
    showToast('Failed to load scale data: ' + error.message, 'error');
  }
}

function renderScaleChart(data, canvas) {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return;
  }

  const ctx = canvas.getContext('2d');
  const fingerprints = data.fingerprints || [];
  const reference = data.comparison_reference || {};
  const shortWindow = data.fingerprint_window_m;
  const longWindow = data.comparison_window_m;

  const labels = fingerprints.map(p => 'Patch ' + p.patch_id + ' (' + shortWindow + ' m)')
    .concat(['Main reference (' + longWindow + ' m)']);
  const means = fingerprints.map(p => p.roughness_mean_m).concat([reference.mean_roughness_m]);
  const p95s = fingerprints.map(p => p.roughness_p95_m).concat([reference.p95_roughness_m]);

  const chartData = {
    labels,
    datasets: [
      { label: 'Mean roughness (m)', data: means, backgroundColor: '#55d6a5' },
      { label: 'p95 roughness (m)', data: p95s, backgroundColor: '#f5c451' }
    ]
  };

  if (scaleChart) {
    scaleChart.data = chartData;
    scaleChart.update('none');
    return;
  }

  scaleChart = new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#e8eaf6' } } },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: 'Roughness (m)', color: '#9aa0c3' }, ticks: { color: '#9aa0c3' } },
        x: { ticks: { color: '#e8eaf6', maxRotation: 0, minRotation: 0 } }
      }
    }
  });
}
