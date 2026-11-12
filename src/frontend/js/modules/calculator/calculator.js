// Terrain Comparison (Calculator) Module
import { fetchApi, showToast } from '../core/state.js';

let calcChart = null;
let sitesData = [];

export function initCalculator() {
  const sliders = {
    rough: document.getElementById('c-rough'),
    p95: document.getElementById('c-p95'),
    slope: document.getElementById('c-slope'),
    area: document.getElementById('c-area'),
  };
  
  const values = {
    rough: document.getElementById('cv-rough'),
    p95: document.getElementById('cv-p95'),
    slope: document.getElementById('cv-slope'),
    area: document.getElementById('cv-area'),
  };
  
  const canvas = document.getElementById('calc-chart');
  const notesDiv = document.getElementById('calc-notes');
  
  Object.keys(sliders).forEach(key => {
    const slider = sliders[key];
    const value = values[key];
    if (slider && value) {
      slider.addEventListener('input', () => {
        updateValueDisplay(key, slider, value);
        runComparison();
      });
    }
  });
  
  loadSitesData();
}

function updateValueDisplay(key, slider, valueEl) {
  const val = parseFloat(slider.value);
  switch (key) {
    case 'rough':
    case 'p95':
      valueEl.textContent = val.toFixed(3);
      break;
    case 'slope':
      valueEl.textContent = val + '%';
      break;
    case 'area':
      valueEl.textContent = val;
      break;
  }
}

async function loadSitesData() {
  try {
    const result = await fetchApi('/api/terrain/comparison-sites');
    if (result.error) throw new Error(result.error);
    
    sitesData = result.sites || result.data || [];
    runComparison();
    
  } catch (error) {
    console.error('Calculator load error:', error);
    showToast('Failed to load comparison data: ' + error.message, 'error');
  }
}

function runComparison() {
  const target = {
    rough: parseFloat(document.getElementById('c-rough').value),
    p95: parseFloat(document.getElementById('c-p95').value),
    slope: parseFloat(document.getElementById('c-slope').value),
    area: parseFloat(document.getElementById('c-area').value),
  };
  
  if (!sitesData.length) return;
  
  const results = sitesData.map(site => {
    // Apply area gate
    if (site.flat_area_km2 < target.area) return null;
    
    // Apply slope gate
    if (target.slope > 0 && site.slope_pct_3deg < target.slope) return null;
    
    // Calculate similarity
    const dRough = (site.mean_rough_m - target.rough) / (target.rough || 1);
    const dP95 = (site.p95_rough_m - target.p95) / (target.p95 || 1);
    
    const distance = Math.sqrt(dRough * dRough + dP95 * dP95);
    const similarity = Math.max(0, Math.min(100, (1 - distance) * 100));
    
    return {
      ...site,
      similarity: similarity.toFixed(1),
      dRough: dRough.toFixed(3),
      dP95: dP95.toFixed(3),
    };
  }).filter(Boolean);
  
  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);
  
  renderCalcChart(results);
  renderCalcNotes(results, target);
}

function renderCalcChart(results) {
  if (typeof Chart === 'undefined') return;
  
  const canvas = document.getElementById('calc-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  if (calcChart) calcChart.destroy();
  
  const top10 = results.slice(0, 10);
  
  calcChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(r => r.name),
      datasets: [
        {
          label: 'Moon Similarity %',
          data: top10.map(r => parseFloat(r.similarity)),
          backgroundColor: top10.map(r => {
            const sim = parseFloat(r.similarity);
            if (sim >= 80) return 'rgba(34,197,94,0.8)';
            if (sim >= 60) return 'rgba(245,158,11,0.8)';
            if (sim >= 40) return 'rgba(239,68,68,0.8)';
            return 'rgba(107,114,128,0.8)';
          }),
          borderColor: top10.map(r => {
            const sim = parseFloat(r.similarity);
            if (sim >= 80) return 'var(--color-success-400)';
            if (sim >= 60) return 'var(--color-solar-400)';
            if (sim >= 40) return 'var(--color-danger-400)';
            return 'var(--color-space-400)';
          }),
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'var(--color-space-900)',
          titleColor: 'var(--color-space-50)',
          bodyColor: 'var(--color-space-300)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: ctx => `Similarity: ${ctx.parsed.x}%`,
            afterLabel: ctx => {
              const r = top10[ctx.dataIndex];
              return [
                `Mean Rough: ${r.mean_rough_m?.toFixed(2) ?? '—'}m`,
                `P95 Rough: ${r.p95_rough_m?.toFixed(2) ?? '—'}m`,
                `Flat Area: ${r.flat_area_km2?.toFixed(2) ?? '—'} km²`,
                `Slope ≤3°: ${r.slope_pct_3deg?.toFixed(1) ?? '—'}%`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Similarity to Target (%)', color: 'var(--color-space-400)', font: { family: 'Space Grotesk', size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: 'var(--color-space-500)', font: { family: 'JetBrains Mono', size: 10 } },
          min: 0,
          max: 100,
        },
        y: {
          grid: { display: false },
          ticks: { color: 'var(--color-space-300)', font: { family: 'Space Grotesk', size: 10 } },
        },
      },
    },
  });
}

function renderCalcNotes(results, target) {
  const notesDiv = document.getElementById('calc-notes');
  if (!notesDiv) return;
  
  const matches = results.filter(r => r.similarity >= 70).length;
  const candidates = results.filter(r => r.similarity >= 50).length;
  
  notesDiv.innerHTML = `
    <strong>Target Profile:</strong> Roughness ${target.rough.toFixed(3)}m | P95 ${target.p95.toFixed(3)}m | Slope Gate ≥${target.slope}% | Area Gate ≥${target.area} km²<br><br>
    <strong>Results:</strong> ${results.length} sites passed filters | ${candidates} candidates (≥50%) | ${matches} strong matches (≥70%)<br><br>
    <strong>Method:</strong> Adjusted Euclidean distance in normalized (mean roughness, p95 roughness) space. 
    Similarity = (1 - distance) × 100. 
    Distance = √[(Δrough/rough)² + (Δp95/p95)²].<br>
    Sites failing area or slope gates are excluded entirely.
  `;
}