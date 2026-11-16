// Similarity Finder Module: find terrain sites similar to a reference site.
// Loads terrain sites from /api/terrain/comparison-sites, lets the user set
// roughness/area targets, and ranks sites by adjusted Euclidean similarity.
// Realtime: results update immediately as sliders change.
import { fetchApi, showToast, escapeHtml } from '../core/state.js';

const STEPS = [
  { id: 'baseline', title: 'Reference Site', icon: '🎯', render: renderBaselineStep, validate: validateBaseline },
  { id: 'filters', title: 'Tolerance Targets', icon: '🎚️', render: renderFiltersStep, validate: () => true },
  { id: 'results', title: 'Similar Matches', icon: '◈', render: renderResultsStep, validate: () => true },
];

let simState = {
  step: 0,
  baseline: null,
  targets: { rough: null, p95: null, area: null },
  sites: [],
  matches: [],
};

export async function initSimilarity() {
  const stepsDiv = document.getElementById('planner-steps');
  const backBtn = document.getElementById('sim-back');
  const nextBtn = document.getElementById('sim-next');
  const resetBtn = document.getElementById('sim-reset');

  if (!stepsDiv) return;

  backBtn?.addEventListener('click', () => goStep(simState.step - 1));
  nextBtn?.addEventListener('click', () => goStep(simState.step + 1));
  resetBtn?.addEventListener('click', () => {
    simState.step = 0;
    simState.baseline = null;
    simState.targets = { rough: null, p95: null, area: null };
    simState.matches = [];
    goStep(0);
  });

  await loadSites();
  goStep(0);
}

function goStep(step) {
  simState.step = Math.max(0, Math.min(STEPS.length - 1, step));
  renderStep();
  updateNavigation();
}

function renderStep() {
  const stepsDiv = document.getElementById('planner-steps');
  if (!stepsDiv) return;
  const step = STEPS[simState.step];

  stepsDiv.innerHTML = `
    <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 1rem;">
      <div style="width: 48px; height: 48px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--color-nebula-500), var(--color-aurora-500)); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">${step.icon}</div>
      <div>
        <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: var(--color-space-50);">${step.title}</h3>
        <p style="font-size: 0.8125rem; color: var(--color-space-400);">Step ${simState.step + 1} of ${STEPS.length}</p>
      </div>
      <div style="margin-left: auto; display: flex; gap: 0.5rem;">
        ${STEPS.map((s, i) => `
          <div style="width: 10px; height: 10px; border-radius: 50%; background: ${i < simState.step ? 'var(--color-nebula-500)' : i === simState.step ? 'var(--color-aurora-400)' : 'rgba(255,255,255,0.1)'}; border: ${i === simState.step ? '2px solid var(--color-aurora-400)' : 'none'};"></div>
        `).join('')}
      </div>
    </div>
    <div id="sim-step-content"></div>
  `;

  const contentDiv = document.getElementById('sim-step-content');
  if (contentDiv) step.render(contentDiv);
}

function updateNavigation() {
  const backBtn = document.getElementById('sim-back');
  const nextBtn = document.getElementById('sim-next');
  const resetBtn = document.getElementById('sim-reset');

  if (backBtn) {
    backBtn.disabled = simState.step === 0;
    backBtn.style.opacity = simState.step === 0 ? '0.4' : '1';
  }
  if (nextBtn) {
    const isLast = simState.step === STEPS.length - 1;
    nextBtn.textContent = isLast ? 'View Matches' : 'Next →';
    nextBtn.disabled = !STEPS[simState.step].validate();
  }
  if (resetBtn) resetBtn.style.opacity = simState.baseline || simState.matches.length ? '1' : '0.4';
}

async function loadSites() {
  try {
    const payload = await fetchApi('/api/terrain/comparison-sites');
    simState.sites = payload && payload.sites ? payload.sites : [];
  } catch (error) {
    console.error('Similarity finder load error:', error);
    showToast('Failed to load terrain sites', 'error');
  }
}

// ---- Step 1: Reference Site ----
function validateBaseline() {
  return !!simState.baseline;
}

function renderBaselineStep(container) {
  const moonSites = simState.sites.filter(s => s.body === 'Moon');
  const marsSites = simState.sites.filter(s => s.body === 'Mars');
  const earthSites = simState.sites.filter(s => s.body === 'Earth');

  const renderGroup = (label, sites) => `
    <div>
      <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.625rem; display: block;">${label}</label>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem;">
        ${sites.map(s => `
          <button class="baseline-site btn btn-ghost" data-id="${escapeHtml(s.id || '')}" style="justify-content: flex-start; text-align: left; padding: 0.875rem; border-radius: var(--radius-md); border: 1px solid ${simState.baseline && simState.baseline.id === s.id ? 'var(--color-aurora-400)' : 'rgba(255,255,255,0.06)'};">
            <div style="font-weight: 500; color: var(--color-space-100);">${escapeHtml(s.name)}</div>
            <div style="font-size: 0.7rem; color: var(--color-space-500);">${s.body} • ${s.flat_area_km2?.toFixed(2) ?? '—'} km² • Rough: ${s.mean_rough_m?.toFixed(3) ?? '—'}m</div>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Select Reference Site</label>
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${renderGroup('Moon', moonSites)}
          ${renderGroup('Mars', marsSites)}
          ${renderGroup('Earth', earthSites)}
        </div>
      </div>
      ${simState.baseline ? `
        <div style="background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.2); border-radius: var(--radius-md); padding: 1rem;">
          <strong style="color: var(--color-aurora-400);">Selected reference:</strong>
          <span style="margin-left: 0.75rem;">${escapeHtml(simState.baseline.name)} (${simState.baseline.body})</span>
          <div style="font-size: 0.7rem; color: var(--color-space-500); margin-top: 0.5rem;">Mean Roughness: ${simState.baseline.mean_rough_m?.toFixed(3)}m • P95: ${simState.baseline.p95_rough_m?.toFixed(3)}m • Area: ${simState.baseline.flat_area_km2?.toFixed(2)} km²</div>
        </div>
      ` : ''}
    </div>
  `;

  container.querySelectorAll('.baseline-site').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.baseline-site').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-ghost');
        b.style.borderColor = 'rgba(255,255,255,0.06)';
      });
      btn.classList.add('active', 'btn-primary');
      btn.classList.remove('btn-ghost');
      btn.style.borderColor = 'var(--color-aurora-400)';
      const site = simState.sites.find(s => (s.id || '') === btn.dataset.id);
      if (site) simState.baseline = site;
      updateNavigation();
    });
  });
}

// ---- Step 2: Tolerance Targets ----
function renderFiltersStep(container) {
  const b = simState.baseline || { mean_rough_m: 0, p95_rough_m: 0, flat_area_km2: 0 };
  const roughVal = simState.targets.rough ?? b.mean_rough_m;
  const p95Val = simState.targets.p95 ?? b.p95_rough_m;
  const areaVal = simState.targets.area ?? b.flat_area_km2;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Set similarity targets</strong></label>
        <p style="font-size: 0.75rem; color: var(--color-space-500); margin-bottom: 1rem;">Enter target values to find sites with similar terrain. Leave a field blank to ignore it.</p>
      </div>
      <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
        <div class="input-group">
          <label class="input-label">Mean Roughness Target (m)</label>
          <input type="number" class="input" id="sim-rough" step="0.01" min="0" value="${roughVal?.toFixed(3) ?? ''}" placeholder="e.g. ${b.mean_rough_m?.toFixed(3)}">
        </div>
        <div class="input-group">
          <label class="input-label">P95 Hazard Ceiling Target (m)</label>
          <input type="number" class="input" id="sim-p95" step="0.01" min="0" value="${p95Val?.toFixed(3) ?? ''}" placeholder="e.g. ${b.p95_rough_m?.toFixed(3)}">
        </div>
        <div class="input-group">
          <label class="input-label">Area Gate Target (km²)</label>
          <input type="number" class="input" id="sim-area" step="0.01" min="0" value="${areaVal?.toFixed(2) ?? ''}" placeholder="e.g. ${b.flat_area_km2?.toFixed(2)}">
        </div>
      </div>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1rem; font-size: 0.75rem; color: var(--color-space-400);">
        Similarity = 100 - √((Δrough/rough)² + (Δp95/p95)² + (Δarea/area)²) × scale. Sites failing any active gate are excluded.
      </div>
    </div>
  `;

  const inputs = { rough: document.getElementById('sim-rough'), p95: document.getElementById('sim-p95'), area: document.getElementById('sim-area') };
  Object.entries(inputs).forEach(([key, el]) => {
    if (!el) return;
    el.addEventListener('input', () => {
      simState.targets[key] = el.value ? parseFloat(el.value) : null;
      simState.matches = computeMatches();
    });
  });
}

function computeMatches() {
  const b = simState.baseline;
  if (!b) return [];
  const t = simState.targets;
  const results = simState.sites.map(s => {
    if (s.id === b.id) return null; // exclude the baseline itself
    let diffRough = 0, diffP95 = 0, diffArea = 0;
    let count = 0;
    if (t.rough != null && s.mean_rough_m != null) { diffRough = Math.abs(s.mean_rough_m - t.rough) / (b.mean_rough_m || 1); count++; }
    if (t.p95 != null && s.p95_rough_m != null) { diffP95 = Math.abs(s.p95_rough_m - t.p95) / (b.p95_rough_m || 1); count++; }
    if (t.area != null && s.flat_area_km2 != null) { diffArea = Math.abs(s.flat_area_km2 - t.area) / (b.flat_area_km2 || 1); count++; }
    if (count === 0) return null;
    const dist = Math.sqrt(diffRough * diffRough + diffP95 * diffP95 + diffArea * diffArea);
    const sim = Math.max(0, Math.min(100, (1 - dist) * 100));
    return { ...s, similarity_pct: sim.toFixed(1) };
  }).filter(Boolean).sort((a, b) => b.similarity_pct - a.similarity_pct);
  return results;
}

// ---- Step 3: Results ----
function renderResultsStep(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <h4 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; color: var(--color-space-100); margin: 0;">Results for <span style="color: var(--color-aurora-400);">${escapeHtml(simState.baseline?.name || '')}</span></h4>
        <span style="font-size: 0.7rem; color: var(--color-space-500);">${simState.matches.length} matching site(s)</span>
      </div>
      <div style="max-height: 420px; overflow-y: auto;" id="sim-results-list"></div>
    </div>
  `;
  renderResultsContent(document.getElementById('sim-results-list'));
}

function renderResultsContent(el) {
  if (!el) return;
  const matches = simState.matches;
  if (!matches.length) {
    el.innerHTML = `<p style="color: var(--color-space-500); text-align: center; padding: 2rem;">No sites match the current targets.</p>`;
    return;
  }
  el.innerHTML = matches.map(s => `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.75rem; display: flex; flex-direction: column; gap: 0.625rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-weight: 600; color: var(--color-space-100);">${escapeHtml(s.name)}</div>
          <div style="font-size: 0.7rem; color: var(--color-space-500);">${s.body} • ${s.siteClass || '—'}</div>
        </div>
        <div style="font-family: var(--font-mono); font-size: 1.125rem; font-weight: 700; color: ${parseFloat(s.similarity_pct) >= 70 ? 'var(--color-success-400)' : parseFloat(s.similarity_pct) >= 50 ? 'var(--color-solar-400)' : 'var(--color-space-400)'};">${s.similarity_pct}%</div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; font-size: 0.75rem;">
        <div><span style="color: var(--color-space-500); font-size: 0.65rem;">Mean Rough</span><div>${s.mean_rough_m?.toFixed(3) ?? '—'} m</div></div>
        <div><span style="color: var(--color-space-500); font-size: 0.65rem;">P95 Rough</span><div>${s.p95_rough_m?.toFixed(3) ?? '—'} m</div></div>
        <div><span style="color: var(--color-space-500); font-size: 0.65rem;">Area</span><div>${s.flat_area_km2?.toFixed(2) ?? '—'} km²</div></div>
      </div>
    </div>
  `).join('');
}
