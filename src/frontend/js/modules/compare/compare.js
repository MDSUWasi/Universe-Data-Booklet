// Full Comparison Module
import { fetchApi, showToast, escapeHtml } from '../core/state.js';

let cmpChart = null;
let crossChart = null;
let comparisonData = [];

export function initCompare() {
  const filterButtons = document.querySelectorAll('#modal-compare [data-body]');
  const tableBody = document.querySelector('#cmp-table tbody');
  const crossTableBody = document.querySelector('#cross-cmp-table tbody');
  const canvas = document.getElementById('cmp-chart');
  const crossCanvas = document.getElementById('cross-cmp-chart');
  
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      renderComparisonTable(btn.dataset.body);
    });
  });
  
  // Table sorting
  document.querySelectorAll('#cmp-table th[data-sort]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => sortTable(th.dataset.sort));
  });
  
  loadComparisonData();
}

async function loadComparisonData() {
  try {
    const result = await fetchApi('/api/terrain/full-comparison');
    if (result.error) throw new Error(result.error);
    
    comparisonData = result.sites || result.data || [];
    renderComparisonTable('all');
    renderCrossBodyTable(result.cross_body || []);
    renderCharts(result);
    
  } catch (error) {
    console.error('Comparison load error:', error);
    showToast('Failed to load comparison data: ' + error.message, 'error');
  }
}

let currentSort = { column: 'name', direction: 'asc' };

function sortTable(column) {
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.direction = 'asc';
  }
  
  document.querySelectorAll('#cmp-table th[data-sort]').forEach(th => {
    th.setAttribute('aria-sort', th.dataset.sort === column ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : 'none');
  });
  
  renderComparisonTable(document.querySelector('#modal-compare [data-body].active')?.dataset.body || 'all');
}

function renderComparisonTable(bodyFilter) {
  const tableBody = document.querySelector('#cmp-table tbody');
  if (!tableBody) return;
  
  let filtered = comparisonData;
  if (bodyFilter !== 'all') {
    filtered = filtered.filter(s => (s.body || '').toLowerCase() === bodyFilter);
  }
  
  // Sort
  filtered.sort((a, b) => {
    const aVal = a[currentSort.column];
    const bVal = b[currentSort.column];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    const cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    return currentSort.direction === 'asc' ? cmp : -cmp;
  });
  
  tableBody.innerHTML = filtered.map(site => `
    <tr>
      <td style="font-weight: 500; color: var(--color-space-100);">${escapeHtml(site.name || '—')}</td>
      <td>
        <span style="
          padding: 0.125rem 0.5rem;
          border-radius: var(--radius-full);
          font-size: 0.625rem;
          font-weight: 600;
          background: ${getBodyColor(site.body)};
          color: ${getBodyTextColor(site.body)};
        ">${getBodySymbol(site.body)} ${escapeHtml(site.body || '—')}</span>
      </td>
      <td style="font-family: var(--font-mono);">${site.flat_area_km2?.toFixed(2) || '—'}</td>
      <td style="font-family: var(--font-mono);">${site.mean_rough_m?.toFixed(2) || '—'}</td>
      <td style="font-family: var(--font-mono);">${site.p95_rough_m?.toFixed(2) || '—'}</td>
      <td style="font-family: var(--font-mono); font-weight: 600; color: ${getSimColor(site.moon_similarity_pct)};">${site.moon_similarity_pct?.toFixed(1) || '—'}%</td>
    </tr>
  `).join('');
}

function renderCrossBodyTable(crossData) {
  const tableBody = document.querySelector('#cross-cmp-table tbody');
  if (!tableBody) return;
  
  tableBody.innerHTML = crossData.map(pair => `
    <tr>
      <td style="font-weight: 500; color: var(--color-space-100);">${escapeHtml(pair.site_a || '—')}</td>
      <td>${getBodySymbol(pair.body_a)} ${escapeHtml(pair.body_a || '—')}</td>
      <td style="font-weight: 500; color: var(--color-space-100);">${escapeHtml(pair.site_b || '—')}</td>
      <td>${getBodySymbol(pair.body_b)} ${escapeHtml(pair.body_b || '—')}</td>
      <td style="font-family: var(--font-mono); font-weight: 600; color: ${getSimColor(pair.similarity_pct)};">${pair.similarity_pct?.toFixed(1) || '—'}%</td>
    </tr>
  `).join('');
}

function renderCharts(data) {
  if (typeof Chart === 'undefined') return;
  
  const canvas = document.getElementById('cmp-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  
  if (cmpChart) cmpChart.destroy();
  
  const sites = (data.sites || []).slice(0, 15).sort((a, b) => (b.moon_similarity_pct || 0) - (a.moon_similarity_pct || 0));
  
  cmpChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sites.map(s => s.name),
      datasets: [
        {
          label: 'Moon Similarity %',
          data: sites.map(s => s.moon_similarity_pct || 0),
          backgroundColor: sites.map(s => {
            const sim = s.moon_similarity_pct || 0;
            if (sim >= 80) return 'rgba(34,197,94,0.8)';
            if (sim >= 60) return 'rgba(245,158,11,0.8)';
            if (sim >= 40) return 'rgba(239,68,68,0.8)';
            return 'rgba(107,114,128,0.8)';
          }),
          borderColor: sites.map(s => {
            const sim = s.moon_similarity_pct || 0;
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
            label: ctx => `Similarity: ${ctx.parsed.x.toFixed(1)}%`,
            afterLabel: ctx => {
              const s = sites[ctx.dataIndex];
              return [
                `Body: ${s.body}`,
                `Flat Area: ${s.flat_area_km2?.toFixed(2) ?? '—'} km²`,
                `Mean Rough: ${s.mean_rough_m?.toFixed(2) ?? '—'}m`,
                `P95 Rough: ${s.p95_rough_m?.toFixed(2) ?? '—'}m`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Moon Similarity (%)', color: 'var(--color-space-400)', font: { family: 'Space Grotesk', size: 11 } },
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

function getSimColor(sim) {
  if (sim === null || sim === undefined) return 'var(--color-space-400)';
  if (sim >= 80) return 'var(--color-success-400)';
  if (sim >= 60) return 'var(--color-solar-400)';
  if (sim >= 40) return 'var(--color-danger-400)';
  return 'var(--color-space-400)';
}