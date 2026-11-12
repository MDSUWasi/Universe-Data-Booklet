// Explore Mission (Planner) Module
import { fetchApi, showToast, escapeHtml } from '../core/state.js';

let plannerState = {
  step: 0,
  data: {},
  sites: [],
};

const STEPS = [
  {
    id: 'objective',
    title: 'Mission Objective',
    icon: '🎯',
    render: renderObjectiveStep,
    validate: validateObjective,
  },
  {
    id: 'target',
    title: 'Target Selection',
    icon: '🪐',
    render: renderTargetStep,
    validate: validateTarget,
  },
  {
    id: 'trajectory',
    title: 'Trajectory Design',
    icon: '🚀',
    render: renderTrajectoryStep,
    validate: validateTrajectory,
  },
  {
    id: 'operations',
    title: 'Surface Operations',
    icon: '🛠️',
    render: renderOperationsStep,
    validate: validateOperations,
  },
  {
    id: 'review',
    title: 'Mission Review',
    icon: '📋',
    render: renderReviewStep,
    validate: () => true,
  },
];

export function initPlanner() {
  const stepsDiv = document.getElementById('planner-steps');
  const backBtn = document.getElementById('planner-back');
  const nextBtn = document.getElementById('planner-next');
  const pdfBtn = document.getElementById('planner-pdf');
  
  if (!stepsDiv) return;
  
  backBtn?.addEventListener('click', () => goToStep(plannerState.step - 1));
  nextBtn?.addEventListener('click', () => {
    if (STEPS[plannerState.step].validate()) {
      goToStep(plannerState.step + 1);
    }
  });
  pdfBtn?.addEventListener('click', generatePDF);
  
  // Load sites for target selection
  loadSites();
  
  // Initialize
  goToStep(0);
}

function goToStep(step) {
  plannerState.step = Math.max(0, Math.min(STEPS.length - 1, step));
  renderStep();
  updateNavigation();
}

function renderStep() {
  const stepsDiv = document.getElementById('planner-steps');
  if (!stepsDiv) return;
  
  const step = STEPS[plannerState.step];
  
  stepsDiv.innerHTML = `
    <div style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem;">
      <div style="width: 48px; height: 48px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--color-nebula-500), var(--color-aurora-500)); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">${step.icon}</div>
      <div>
        <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: var(--color-space-50);">${step.title}</h3>
        <p style="font-size: 0.8125rem; color: var(--color-space-400);">Step ${plannerState.step + 1} of ${STEPS.length}</p>
      </div>
      <div style="margin-left: auto; display: flex; gap: 0.5rem;">
        ${STEPS.map((s, i) => `
          <div style="width: 10px; height: 10px; border-radius: 50%; background: ${i < plannerState.step ? 'var(--color-nebula-500)' : i === plannerState.step ? 'var(--color-aurora-400)' : 'rgba(255,255,255,0.1)'}; border: ${i === plannerState.step ? '2px solid var(--color-aurora-400)' : 'none'}; transition: var(--transition-fast);"></div>
        `).join('')}
      </div>
    </div>
    <div id="planner-step-content"></div>
  `;
  
  const contentDiv = document.getElementById('planner-step-content');
  if (contentDiv) {
    step.render(contentDiv);
  }
}

function updateNavigation() {
  const backBtn = document.getElementById('planner-back');
  const nextBtn = document.getElementById('planner-next');
  const pdfBtn = document.getElementById('planner-pdf');
  
  if (backBtn) {
    backBtn.disabled = plannerState.step === 0;
    backBtn.style.opacity = plannerState.step === 0 ? '0.4' : '1';
  }
  
  if (nextBtn) {
    const isLast = plannerState.step === STEPS.length - 1;
    nextBtn.textContent = isLast ? 'Complete Mission' : 'Next →';
    nextBtn.classList.toggle('btn-primary', !isLast);
    nextBtn.classList.toggle('btn-secondary', isLast);
  }
  
  if (pdfBtn) {
    pdfBtn.disabled = plannerState.step !== STEPS.length - 1;
    pdfBtn.style.opacity = plannerState.step !== STEPS.length - 1 ? '0.4' : '1';
  }
}

async function loadSites() {
  try {
    const [asteroids, exoplanets] = await Promise.all([
      fetchApi('/api/asteroids?limit=20'),
      fetchApi('/api/exoplanets?limit=20'),
    ]);
    
    plannerState.sites = [
      ...(asteroids.data || []).map(a => ({ ...a, type: 'asteroid', name: a.name, body: 'Near-Earth Space' })),
      ...(exoplanets.data || []).map(e => ({ ...e, type: 'exoplanet', name: e.pl_name, body: e.hostname })),
    ].filter(s => s.name);
    
  } catch (error) {
    console.error('Planner load sites error:', error);
  }
}

// Step renderers
function renderObjectiveStep(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Mission Type</label>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
          ${['Flyby', 'Orbiter', 'Lander', 'Rover', 'Sample Return'].map(type => `
            <button class="objective-type btn btn-secondary" data-type="${type.toLowerCase()}" style="padding: 1rem; text-align: left; justify-content: flex-start;">
              <strong>${type}</strong>
            </button>
          `).join('')}
        </div>
      </div>
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Primary Science Goal</label>
        <textarea id="planner-science-goal" class="input" rows="3" placeholder="Describe the primary scientific objectives...">${plannerState.data.scienceGoal || ''}</textarea>
      </div>
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Mission Duration</label>
        <div class="input-row">
          <div class="input-group">
            <input type="number" class="input" id="planner-duration-value" value="${plannerState.data.durationValue || 12}" min="1" max="50">
            <label class="input-label">Value</label>
          </div>
          <div class="input-group">
            <select class="input" id="planner-duration-unit">
              <option value="months" ${plannerState.data.durationUnit === 'months' ? 'selected' : ''}>Months</option>
              <option value="years" ${plannerState.data.durationUnit === 'years' ? 'selected' : ''}>Years</option>
            </select>
            <label class="input-label">Unit</label>
          </div>
        </div>
      </div>
    </div>
  `;
  
  container.querySelectorAll('.objective-type').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.objective-type').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
      plannerState.data.missionType = btn.dataset.type;
    });
    
    if (plannerState.data.missionType === btn.dataset.type) {
      btn.classList.add('active');
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    }
  });
  
  const goalInput = container.querySelector('#planner-science-goal');
  goalInput?.addEventListener('input', (e) => plannerState.data.scienceGoal = e.target.value);
  
  const durVal = container.querySelector('#planner-duration-value');
  durVal?.addEventListener('input', (e) => plannerState.data.durationValue = parseInt(e.target.value) || 1);
  
  const durUnit = container.querySelector('#planner-duration-unit');
  durUnit?.addEventListener('change', (e) => plannerState.data.durationUnit = e.target.value);
}

function validateObjective() {
  return plannerState.data.missionType && plannerState.data.scienceGoal?.trim();
}

function renderTargetStep(container) {
  const sitesByType = {
    asteroid: plannerState.sites.filter(s => s.type === 'asteroid').slice(0, 10),
    exoplanet: plannerState.sites.filter(s => s.type === 'exoplanet').slice(0, 10),
  };
  
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Target Category</label>
        <div style="display: flex; gap: 0.75rem;">
          <button class="target-cat btn btn-secondary" data-cat="asteroid" style="flex: 1;">☄️ Near-Earth Asteroids</button>
          <button class="target-cat btn btn-secondary" data-cat="exoplanet" style="flex: 1;">🪐 Exoplanets</button>
        </div>
      </div>
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Select Target</label>
        <div id="planner-target-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; max-height: 300px; overflow-y: auto;"></div>
      </div>
      ${plannerState.data.target ? `
        <div style="background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2); border-radius: var(--radius-md); padding: 1rem;">
          <strong style="color: var(--color-success-400);">Selected: </strong>
          <span>${escapeHtml(plannerState.data.target.name)}</span>
          <span style="color: var(--color-space-500); margin-left: 1rem;">(${plannerState.data.target.body})</span>
        </div>
      ` : ''}
    </div>
  `;
  
  const catButtons = container.querySelectorAll('.target-cat');
  const listDiv = container.querySelector('#planner-target-list');
  let activeCat = plannerState.data.targetCategory || 'asteroid';
  
  function renderTargets(cat) {
    const sites = sitesByType[cat] || [];
    listDiv.innerHTML = sites.map(site => `
      <button class="target-site btn btn-ghost" data-name="${escapeHtml(site.name)}" style="justify-content: flex-start; text-align: left; padding: 0.75rem;">
        <strong style="color: var(--color-space-100);">${escapeHtml(site.name)}</strong>
        <span style="color: var(--color-space-500); font-size: 0.75rem;">${site.type === 'asteroid' ? `Diameter: ${site.diameter_km?.toFixed(2) || '?'}km` : `ESI: ${site.esi || '?'}`}</span>
      </button>
    `).join('');
    
    listDiv.querySelectorAll('.target-site').forEach(btn => {
      btn.addEventListener('click', () => {
        listDiv.querySelectorAll('.target-site').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        btn.classList.remove('btn-ghost');
        btn.classList.add('btn-primary');
        
        const site = sites.find(s => s.name === btn.dataset.name);
        if (site) {
          plannerState.data.target = site;
          plannerState.data.targetCategory = cat;
          renderStep(); // Re-render to show selection
        }
      });
    });
  }
  
  catButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      catButtons.forEach(b => { b.classList.remove('active'); b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); });
      btn.classList.add('active');
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
      activeCat = btn.dataset.cat;
      renderTargets(activeCat);
    });
    
    if (btn.dataset.cat === activeCat) {
      btn.classList.add('active');
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    }
  });
  
  renderTargets(activeCat);
}

function validateTarget() {
  return !!plannerState.data.target;
}

function renderTrajectoryStep(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Launch Window</label>
        <div class="input-row">
          <div class="input-group">
            <input type="date" class="input" id="planner-launch-start" value="${plannerState.data.launchStart || ''}">
            <label class="input-label">Earliest Launch</label>
          </div>
          <div class="input-group">
            <input type="date" class="input" id="planner-launch-end" value="${plannerState.data.launchEnd || ''}">
            <label class="input-label">Latest Launch</label>
          </div>
        </div>
      </div>
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Trajectory Type</label>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
          ${['Direct Transfer', 'Gravity Assist', 'Low-Thrust Spiral', 'Ballistic Capture'].map(type => `
            <button class="traj-type btn btn-secondary" data-type="${type.toLowerCase().replace(' ', '-')}" style="padding: 1rem; text-align: left; justify-content: flex-start;">
              <strong>${type}</strong>
            </button>
          `).join('')}
        </div>
      </div>
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Delta-V Budget (km/s)</label>
        <div class="input-row">
          <div class="input-group">
            <input type="number" class="input" id="planner-dv-total" value="${plannerState.data.dvTotal || 8}" step="0.1" min="1" max="20">
            <label class="input-label">Total ΔV</label>
          </div>
          <div class="input-group">
            <input type="number" class="input" id="planner-dv-margin" value="${plannerState.data.dvMargin || 1.5}" step="0.1" min="0" max="5">
            <label class="input-label">Margin</label>
          </div>
        </div>
      </div>
    </div>
  `;
  
  container.querySelectorAll('.traj-type').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.traj-type').forEach(b => { b.classList.remove('active'); b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); });
      btn.classList.add('active');
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
      plannerState.data.trajectoryType = btn.dataset.type;
    });
    
    if (plannerState.data.trajectoryType === btn.dataset.type) {
      btn.classList.add('active');
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    }
  });
  
  ['launchStart', 'launchEnd', 'dvTotal', 'dvMargin'].forEach(id => {
    const el = container.querySelector(`#planner-${id.replace('dv', 'dv-')}`);
    if (el) el.addEventListener('input', (e) => plannerState.data[id] = e.target.value);
  });
}

function validateTrajectory() {
  return plannerState.data.trajectoryType && plannerState.data.launchStart && plannerState.data.launchEnd;
}

function renderOperationsStep(container) {
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Surface Duration</label>
        <div class="input-row">
          <div class="input-group">
            <input type="number" class="input" id="planner-surf-days" value="${plannerState.data.surfaceDays || 30}" min="1" max="1000">
            <label class="input-label">Days</label>
          </div>
          <div class="input-group">
            <select class="input" id="planner-surf-type">
              <option value="static" ${plannerState.data.surfaceType === 'static' ? 'selected' : ''}>Static Lander</option>
              <option value="rover" ${plannerState.data.surfaceType === 'rover' ? 'selected' : ''}>Rover</option>
              <option value='hopper' ${plannerState.data.surfaceType === 'hopper' ? 'selected' : ''}>Hopper</option>
            </select>
            <label class="input-label">Mobility</label>
          </div>
        </div>
      </div>
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Science Instruments</label>
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
          ${['Camera', 'Spectrometer', 'Drill', 'Seismometer', 'Magnetometer', 'Weather Station', 'Radar', 'Lidar'].map(inst => `
            <label style="display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-full); cursor: pointer; font-size: 0.8125rem;">
              <input type="checkbox" value="${inst.toLowerCase()}" ${(plannerState.data.instruments || []).includes(inst.toLowerCase()) ? 'checked' : ''} style="width: 14px; height: 14px; accent-color: var(--color-nebula-500);">
              ${inst}
            </label>
          `).join('')}
        </div>
      </div>
      <div>
        <label style="font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; color: var(--color-space-500); margin-bottom: 0.5rem; display: block;">Power Source</label>
        <div style="display: flex; gap: 0.75rem;">
          ${['Solar', 'RTG', 'Fuel Cell', 'Battery'].map(src => `
            <button class="power-src btn btn-secondary" data-src="${src.toLowerCase()}" style="flex: 1;">${src}</button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  
  const daysInput = container.querySelector('#planner-surf-days');
  daysInput?.addEventListener('input', (e) => plannerState.data.surfaceDays = parseInt(e.target.value) || 1);
  
  const typeSelect = container.querySelector('#planner-surf-type');
  typeSelect?.addEventListener('change', (e) => plannerState.data.surfaceType = e.target.value);
  
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const inst = cb.value;
      if (cb.checked) {
        plannerState.data.instruments = [...(plannerState.data.instruments || []), inst];
      } else {
        plannerState.data.instruments = (plannerState.data.instruments || []).filter(i => i !== inst);
      }
    });
  });
  
  container.querySelectorAll('.power-src').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.power-src').forEach(b => { b.classList.remove('active'); b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); });
      btn.classList.add('active');
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
      plannerState.data.powerSource = btn.dataset.src;
    });
    
    if (plannerState.data.powerSource === btn.dataset.src) {
      btn.classList.add('active');
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    }
  });
}

function validateOperations() {
  return plannerState.data.surfaceDays && plannerState.data.surfaceType && plannerState.data.powerSource;
}

function renderReviewStep(container) {
  const d = plannerState.data;
  const durationText = `${d.durationValue} ${d.durationUnit}`;
  const dvText = `${d.dvTotal} km/s (margin: ${d.dvMargin} km/s)`;
  
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1.25rem;">
        <h4 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: var(--color-space-100); display: flex; align-items: center; gap: 0.5rem;">🎯 Mission Summary</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; font-size: 0.8125rem;">
          <div><span style="color: var(--color-space-500);">Type:</span><br><strong>${d.missionType?.charAt(0).toUpperCase() + d.missionType?.slice(1) || '—'}</strong></div>
          <div><span style="color: var(--color-space-500);">Target:</span><br><strong>${d.target?.name || '—'} (${d.target?.body || '—'})</strong></div>
          <div><span style="color: var(--color-space-500);">Duration:</span><br><strong>${durationText}</strong></div>
          <div><span style="color: var(--color-space-500);">Trajectory:</span><br><strong>${d.trajectoryType?.replace('-', ' ') || '—'}</strong></div>
          <div><span style="color: var(--color-space-500);">Launch Window:</span><br><strong>${d.launchStart || '—'} to ${d.launchEnd || '—'}</strong></div>
          <div><span style="color: var(--color-space-500);">ΔV Budget:</span><br><strong>${dvText}</strong></div>
          <div><span style="color: var(--color-space-500);">Surface Ops:</span><br><strong>${d.surfaceDays} days, ${d.surfaceType}, ${d.powerSource}</strong></div>
          <div><span style="color: var(--color-space-500);">Instruments:</span><br><strong>${(d.instruments || []).join(', ') || 'None'}</strong></div>
        </div>
      </div>
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1.25rem;">
        <h4 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: var(--color-space-100); display: flex; align-items: center; gap: 0.5rem;">📝 Science Objective</h4>
        <p style="color: var(--color-space-300); line-height: 1.6; white-space: pre-wrap;">${escapeHtml(d.scienceGoal || 'Not specified')}</p>
      </div>
      <div style="display: flex; gap: 1rem; justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="window.PlannerModule?.goToStep(3)">← Back to Operations</button>
        <button class="btn btn-primary" id="planner-finalize">Finalize Mission Plan</button>
      </div>
    </div>
  `;
  
  container.querySelector('#planner-finalize')?.addEventListener('click', () => {
    showToast('Mission plan finalized! PDF ready for download.', 'success');
    const pdfBtn = document.getElementById('planner-pdf');
    if (pdfBtn) pdfBtn.disabled = false;
  });
}

function generatePDF() {
  showToast('PDF generation not yet implemented', 'info');
}