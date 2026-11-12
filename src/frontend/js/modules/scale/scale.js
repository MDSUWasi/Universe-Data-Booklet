// Scale Sensitivity Module
import { fetchApi, showToast } from '../core/state.js';

let scaleChart = null;

export function initScale() {
  const summaryDiv = document.getElementById('scale-summary');
  const statusDiv = document.getElementById('scale-status');
  const canvas = document.getElementById('scale-chart');
  
  if (!canvas) return;
  
  loadScaleData();
}

async function loadScaleData() {
  const summaryDiv = document.getElementById('scale-summary');
  const statusDiv = document.getElementById('scale-status');
  const canvas = document.getElementById('scale-chart');
  
  try {
    const result = await fetchApi('/api/scale-sensitivity');
    if (result.error) throw new Error(result.error);
    
    renderScaleChart(result, canvas);
    
    if (summaryDiv) {
      const lunar12 = result.lunar_12m || {};
      const lunar90 = result.lunar_90m || {};
      summaryDiv.innerHTML = `
        <strong>Lunar 12m fingerprint:</strong> ${lunar12.count || 0} sites, mean roughness ${lunar12.mean_rough?.toFixed(2) || '—'}m, p95 ${lunar12.p95_rough?.toFixed(2) || '—'}m<br>
        <strong>Lunar 90m comparison:</strong> ${lunar90.count || 0} sites, mean roughness ${lunar90.mean_rough?.toFixed(2) || '—'}m, p95 ${lunar90.p95_rough?.toFixed(2) || '—'}m<br>
        <strong>Scale factor:</strong> ${result.scale_factor?.toFixed(2) || '—'}× roughness increase from 12m to 90m window
      `;
    }
    
    if (statusDiv) {
      statusDiv.textContent = `Data from ${result.source || 'processed DEMs'} • ${new Date().toLocaleDateString()}`;
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
  
  if (scaleChart) {
    scaleChart.destroy();
  }
  
  const sites12 = data.sites_12m || [];
  const sites90 = data.sites_90m || [];
  
  const allSites = [...new Set([...sites12.map(s => s.name), ...sites90.map(s => s.name)])];
  
  scaleChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: allSites,
      datasets: [
        {
          label: 'Mean Roughness (12m window)',
          data: allSites.map(name => {
            const site = sites12.find(s => s.name === name);
            return site?.mean_rough ?? null;
          }),
          backgroundColor: 'rgba(124, 58, 237, 0.7)',
          borderColor: 'var(--color-nebula-400)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Mean Roughness (90m window)',
          data: allSites.map(name => {
            const site = sites90.find(s => s.name === name);
            return site?.mean_rough ?? null;
          }),
          backgroundColor: 'rgba(6, 182, 212, 0.7)',
          borderColor: 'var(--color-aurora-400)',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'P95 Roughness (12m)',
          data: allSites.map(name => {
            const site = sites12.find(s => s.name === name);
            return site?.p95_rough ?? null;
          }),
          backgroundColor: 'rgba(124, 58, 237, 0.3)',
          borderColor: 'var(--color-nebula-300)',
          borderWidth: 1,
          borderRadius: 4,
          borderDash: [5, 5],
        },
        {
          label: 'P95 Roughness (90m)',
          data: allSites.map(name => {
            const site = sites90.find(s => s.name === name);
            return site?.p95_rough ?? null;
          }),
          backgroundColor: 'rgba(6, 182, 212, 0.3)',
          borderColor: 'var(--color-aurora-300)',
          borderWidth: 1,
          borderRadius: 4,
          borderDash: [5, 5],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: 'var(--color-space-300)', font: { family: 'Space Grotesk', size: 11 }, usePointStyle: true, padding: 20 },
        },
        tooltip: {
          backgroundColor: 'var(--color-space-900)',
          titleColor: 'var(--color-space-50)',
          bodyColor: 'var(--color-space-300)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2) ?? 'N/A'} m`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: 'var(--color-space-500)', font: { family: 'Space Grotesk', size: 10 }, maxRotation: 45, minRotation: 45 },
        },
        y: {
          title: { display: true, text: 'Roughness (meters)', color: 'var(--color-space-400)', font: { family: 'Space Grotesk', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'var(--color-space-500)', font: { family: 'JetBrains Mono', size: 10 } },
          beginAtZero: true,
        },
      },
    },
  });
}