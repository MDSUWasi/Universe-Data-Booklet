// Study & Research Mode — live, data-driven, fused with merged Project Base.
// Flashcards, quiz, challenges, compare, progress and discover are all built
// from the currently loaded dataset (asteroids / exoplanets) plus the Solar
// System encyclopedia content merged from Project Base (planets, moons,
// terrain sites). No static mock API endpoints: the mode follows live data.
import { fetchApi, showToast, escapeHtml } from '../core/state.js';
import { getCurrentData, getCurrentView } from '../core/data.js';

const STUDY_TABS = ['flashcards', 'quiz', 'challenges', 'compare', 'progress', 'discover'];

const DECKS = [
  { id: 'live', label: 'Live Dataset', hint: 'Built from the currently loaded asteroids / exoplanets' },
  { id: 'solar-system', label: 'Solar System', hint: 'Planets & moons from the merged Planetary Explorer' },
  { id: 'terrain', label: 'Terrain Sites', hint: 'Lunar & Mars landing sites from Project Base' },
];

const studyState = {
  currentTab: 'flashcards',
  deck: 'live',
  flashcards: [],
  currentCard: 0,
  flipped: false,
  encyclopedia: null,
  encPromise: null,
  quiz: { questions: [], current: 0, score: 0, answers: [] },
  compareSelection: [],
  compareChart: null,
  progress: {},
  modalOpen: false,
  activeTabElement: null,
};

window.StudyModule = window.StudyModule || {};

function $id(id) { return document.getElementById(id); }
function $modal() { return $id('modal-study'); }
function num(v, fallback) { const n = parseFloat(v); return isNaN(n) ? (fallback === undefined ? 0 : fallback) : n; }
function isAsteroid() { return getCurrentView() === 'asteroids'; }
function liveData() { return getCurrentData() || []; }
function viewLabel() { return isAsteroid() ? 'Near-Earth Asteroids' : 'Exoplanets'; }

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sample(arr, n) { return shuffled(arr).slice(0, Math.min(n, arr.length)); }

export function initStudy() {
  const modal = $modal();
  if (!modal) return;

  // Refresh whenever the study modal is shown (data may have changed meanwhile).
  const observer = new MutationObserver(() => {
    const open = modal.classList.contains('open');
    if (open && !studyState.modalOpen) {
      studyState.modalOpen = true;
      refresh();
    }
    studyState.modalOpen = open;
  });
  observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

  // Tab switching
  document.querySelectorAll('.study-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.studyTab;
      if (tab && STUDY_TABS.includes(tab)) switchTab(tab);
    });
  });

  // Expose controls for inline handlers and other modules.
  window.StudyModule.refresh = refresh;
  window.StudyModule.goToTab = (tab) => { if (STUDY_TABS.includes(tab)) switchTab(tab); };
  window.StudyModule.getState = () => ({ ...studyState, flashcards: undefined, quiz: undefined });

  // Realtime: rebuild from live data whenever the main dataset changes while
  // the study modal is open.
  window.addEventListener('udb:datarefreshed', () => {
    if (studyState.modalOpen) refresh();
  });

  switchTab('flashcards');
}

export function refresh() {
  switchTab(studyState.currentTab);
}

function switchTab(tab) {
  studyState.currentTab = tab;

  document.querySelectorAll('.study-tab-btn').forEach(btn => {
    const active = btn.dataset.studyTab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active);
  });

  document.querySelectorAll('.study-pane').forEach(pane => {
    pane.style.display = pane.id === `study-${tab}` ? 'block' : 'none';
  });

  switch (tab) {
    case 'flashcards': initFlashcards(); break;
    case 'quiz': initQuiz(); break;
    case 'challenges': renderChallenges(); break;
    case 'compare': renderStudyCompare(); break;
    case 'progress': renderProgress(); break;
    case 'discover': renderDiscover(); break;
  }
}

// ---------------------------------------------------------------------------
// Live-data snapshot used by every study activity
// ---------------------------------------------------------------------------

function currentSnapshot() {
  const data = liveData();
  return {
    view: getCurrentView(),
    label: viewLabel(),
    count: data.length,
    asteroids: data.filter(d => d.name && !d.pl_name),
    planets: data.filter(d => d.pl_name),
  };
}

// ---------------------------------------------------------------------------
// Encyclopaedia (Project Base fusion) — loaded lazily, once
// ---------------------------------------------------------------------------

async function loadEncyclopedia() {
  if (studyState.encPromise) return studyState.encPromise;
  studyState.encPromise = (async () => {
    try {
      const result = await fetchApi('/api/encyclopedia');
      studyState.encyclopedia = {
        planets: result.planets || [],
        moons: result.moons || [],
        sites: result.sites || [],
      };
    } catch (e) {
      console.warn('Study: encyclopedia load failed', e);
      studyState.encyclopedia = { planets: [], moons: [], sites: [] };
    }
    return studyState.encyclopedia;
  })();
  return studyState.encPromise;
}

// ---------------------------------------------------------------------------
// Flashcards
// ---------------------------------------------------------------------------

async function buildFlashDeck() {
  const { view, label, count, asteroids, planets } = currentSnapshot();
  const cards = [];

  if (studyState.deck === 'live') {
    const pool = isAsteroid() ? asteroids : planets;
    const use = pool.length ? pool : liveData();
    sample(use, 15).forEach(item => {
      if (isAsteroid()) {
        cards.push({
          deck: 'live',
          front: '🪨 ' + (item.name || 'Unknown'),
          back: [
            'Type: Near-Earth Asteroid',
            'Date: ' + (item.date || '?'),
            'Diameter: ' + num(item.diameter_km).toFixed(2) + ' km',
            'Velocity: ' + num(item.velocity_kmh).toFixed(0) + ' km/h',
            'Hazardous: ' + (item.hazardous ? '⚠️ Yes' : '✅ No'),
          ].join('<br>'),
        });
      } else {
        cards.push({
          deck: 'live',
          front: '🪐 ' + (item.pl_name || 'Unknown'),
          back: [
            'Type: Confirmed Exoplanet',
            'Host Star: ' + (item.hostname || '?'),
            'Radius: ' + num(item.pl_rade).toFixed(2) + ' R⊕',
            'Mass: ' + num(item.pl_bmasse).toFixed(2) + ' M⊕',
            'ESI: ' + (item.esi !== undefined ? num(item.esi).toFixed(3) : 'N/A'),
            'Water: ' + (item.water_status || '?'),
          ].join('<br>'),
        });
      }
    });
  } else if (studyState.deck === 'solar-system') {
    await loadEncyclopedia();
    const { planets: pl, moons } = studyState.encyclopedia || {};
    pl.slice().forEach(p => {
      const ph = p.physical || {};
      cards.push({
        deck: 'solar-system',
        front: '☀️🪐 ' + (p.name || 'Unknown'),
        back: [
          'Type: ' + (p.type || '?'),
          'Diameter: ' + (ph.mean_diameter_km !== undefined ? ph.mean_diameter_km + ' km' : '?'),
          'Gravity: ' + (ph.surface_gravity_ms2 !== undefined ? ph.surface_gravity_ms2 + ' m/s²' : '?'),
          'Escape velocity: ' + (ph.escape_velocity_km_s !== undefined ? ph.escape_velocity_km_s + ' km/s' : '?'),
          'Satellites: ' + (ph.natural_satellites !== undefined ? ph.natural_satellites : '?'),
        ].join('<br>'),
      });
    });
    (moons || []).slice().forEach(m => {
      const ph = m.physical || {};
      cards.push({
        deck: 'solar-system',
        front: '🌙 ' + (m.name || 'Unknown') + ' (' + (m.parent || '') + ')',
        back: [
          'Type: ' + (m.type || '?'),
          'Diameter: ' + (ph.mean_diameter_km !== undefined ? ph.mean_diameter_km + ' km' : '?'),
          'Gravity: ' + (ph.surface_gravity_ms2 !== undefined ? ph.surface_gravity_ms2 + ' m/s²' : '?'),
          'Orbit: ' + (ph.orbit_km !== undefined ? ph.orbit_km : '?'),
          'Period: ' + (ph.orbital_period_hours !== undefined ? ph.orbital_period_hours + ' h' : '?'),
        ].join('<br>'),
      });
    });
  } else if (studyState.deck === 'terrain') {
    await loadEncyclopedia();
    const sites = (studyState.encyclopedia && studyState.encyclopedia.sites) || [];
    sites.slice().forEach(s => {
      cards.push({
        deck: 'terrain',
        front: '🏔️ ' + (s.name || 'Unknown'),
        back: [
          'Body: ' + (s.body || '?'),
          'Region: ' + (s.region || '?'),
          'Area: ' + (s.area_km2 !== undefined ? s.area_km2 + ' km²' : '?'),
          'Mean roughness: ' + (s.mean_rough_m !== undefined ? s.mean_rough_m + ' m' : '?'),
          'P95 roughness: ' + (s.p95_rough_m !== undefined ? s.p95_rough_m + ' m' : '?'),
          'Class: ' + (s.siteClass || '?'),
        ].join('<br>'),
      });
    });
  }

  studyState.flashcards = cards;
  studyState.currentCard = 0;
  studyState.flipped = false;
  return cards;
}

function initFlashcards() {
  const area = $id('flashcard-area');
  if (!area) return;

  // Live banner
  const { view, label, count } = currentSnapshot();
  const deckInfo = DECKS.find(d => d.id === studyState.deck) || DECKS[0];
  area.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;">
      <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:var(--radius-md);padding:0.75rem 1rem;font-size:0.8125rem;color:var(--color-space-300);">
        <strong style="color:var(--color-space-100);">Live:</strong> ${escapeHtml(label)} <span style="color:var(--color-space-500);">·</span> ${count} objects loaded
      </div>
      <div style="display:flex;gap:0.4rem;">
        ${DECKS.map(d => `
          <button class="btn ${studyState.deck === d.id ? 'btn-primary' : 'btn-secondary'}" style="font-size:0.75rem;padding:0.4rem 0.8rem;" onclick="window.StudyModule?.setDeck('${d.id}')">${escapeHtml(d.label)}</button>
        `).join('')}
      </div>
    </div>
    <div id="flashcard-deck-area" style="display:flex;flex-direction:column;align-items:center;padding:2rem 0;">
      <p style="text-align:center;color:var(--color-space-500);">Building ${deckInfo.label} deck…</p>
    </div>`;

  buildFlashDeck().then(cards => renderFlashcard()).catch(err => {
    const wrap = $id('flashcard-deck-area');
    if (wrap) wrap.innerHTML = `<p style="text-align:center;color:var(--color-danger-400);padding:20px;">Failed to build deck: ${escapeHtml(err.message)}</p>`;
    showToast('Failed to build flashcards', 'error');
  });
}

window.StudyModule.setDeck = function (deck) {
  if (!DECKS.some(d => d.id === deck)) return;
  studyState.deck = deck;
  initFlashcards();
};

function renderFlashcard() {
  const wrap = $id('flashcard-deck-area');
  if (!wrap) return;
  if (!studyState.flashcards.length) {
    wrap.innerHTML = '<p style="text-align:center;color:var(--color-space-500);padding:20px;">No cards in this deck. Load some data first.</p>';
    return;
  }
  const card = studyState.flashcards[studyState.currentCard];
  wrap.innerHTML = `
    <div class="flashcard ${studyState.flipped ? 'flipped' : ''}" id="study-flashcard" style="
      width:100%;max-width:520px;height:320px;perspective:1000px;cursor:pointer;">
      <div class="flashcard-inner" style="
        position:relative;width:100%;height:100%;transition:transform 0.6s cubic-bezier(0.4,0,0.2,1);
        transform-style:preserve-3d;${studyState.flipped ? 'transform:rotateY(180deg);' : ''}">
        <div class="flashcard-face flashcard-front" style="
          position:absolute;width:100%;height:100%;backface-visibility:hidden;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          border-radius:var(--radius-xl);border:1px solid rgba(255,255,255,0.08);
          background:linear-gradient(135deg,var(--color-space-850),var(--color-space-900));
          padding:2rem;box-shadow:var(--shadow-lg);">
          <div style="font-size:3rem;margin-bottom:1.5rem;">🃏</div>
          <h3 style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:var(--color-space-50);text-align:center;margin-bottom:1rem;">${escapeHtml(card.front || 'Question')}</h3>
          <p style="font-size:0.875rem;color:var(--color-space-500);text-align:center;">Tap to reveal answer</p>
        </div>
        <div class="flashcard-face flashcard-back" style="
          position:absolute;width:100%;height:100%;backface-visibility:hidden;transform:rotateY(180deg);
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          border-radius:var(--radius-xl);border:1px solid var(--color-nebula-500);
          background:linear-gradient(135deg,var(--color-nebula-500),var(--color-aurora-500));
          padding:2rem;box-shadow:var(--shadow-lg),var(--shadow-glow-nebula);color:white;">
          <h3 style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;text-align:center;margin-bottom:1rem;">Answer</h3>
          <p style="font-size:1.125rem;line-height:1.6;text-align:center;font-weight:500;">${card.back}</p>
        </div>
      </div>
    </div>
    <div class="flashcard-nav" style="display:flex;align-items:center;justify-content:center;gap:1rem;margin-top:1.5rem;">
      <button class="btn btn-secondary" id="flashcard-prev" ${studyState.currentCard === 0 ? 'disabled' : ''}>← Previous</button>
      <span class="flashcard-counter" style="font-family:var(--font-mono);font-size:1rem;color:var(--color-space-300);">${studyState.currentCard + 1} / ${studyState.flashcards.length}</span>
      <button class="btn btn-secondary" id="flashcard-next" ${studyState.currentCard === studyState.flashcards.length - 1 ? 'disabled' : ''}>Next →</button>
    </div>
    <div style="display:flex;justify-content:center;gap:0.75rem;margin-top:1rem;">
      <button class="btn btn-ghost" id="flashcard-shuffle">🔀 Shuffle</button>
      <button class="btn btn-primary" id="flashcard-flip" style="width:100%;max-width:200px;">${studyState.flipped ? 'Show Question' : 'Show Answer'}</button>
    </div>`;

  const flashcard = $id('study-flashcard');
  flashcard?.addEventListener('click', () => { studyState.flipped = !studyState.flipped; renderFlashcard(); });
  $id('flashcard-prev')?.addEventListener('click', () => { if (studyState.currentCard > 0) { studyState.currentCard--; studyState.flipped = false; renderFlashcard(); } });
  $id('flashcard-next')?.addEventListener('click', () => { if (studyState.currentCard < studyState.flashcards.length - 1) { studyState.currentCard++; studyState.flipped = false; renderFlashcard(); } });
  $id('flashcard-flip')?.addEventListener('click', () => { studyState.flipped = !studyState.flipped; renderFlashcard(); });
  $id('flashcard-shuffle')?.addEventListener('click', () => {
    studyState.flashcards = shuffleArray([...studyState.flashcards]);
    studyState.currentCard = 0; studyState.flipped = false; renderFlashcard();
  });
}

// ---------------------------------------------------------------------------
// Quiz (generated from live data)
// ---------------------------------------------------------------------------

function initQuiz() {
  const area = $id('quiz-area');
  if (!area) return;
  const { count } = currentSnapshot();
  if (!count) {
    area.innerHTML = '<p style="text-align:center;color:var(--color-space-500);padding:20px;">No data loaded yet. Load asteroids or exoplanets first, then open Quiz.</p>';
    return;
  }
  area.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <h3 style="margin-bottom:16px;">🧠 Live Quiz — ${escapeHtml(viewLabel())}</h3>
      <p style="color:var(--color-space-500);margin-bottom:16px;">Questions are generated from the ${count} loaded objects.</p>
      <button class="action-btn" onclick="window.StudyModule?.startQuiz('easy')">😊 Easy (5)</button>
      <button class="action-btn" onclick="window.StudyModule?.startQuiz('medium')">🤔 Medium (10)</button>
      <button class="action-btn" onclick="window.StudyModule?.startQuiz('hard')">🔥 Hard (15)</button>
    </div>`;
}

const QUIZ_COUNTS = { easy: 5, medium: 10, hard: 15 };

window.StudyModule.startQuiz = function (level) {
  const { count, asteroids, planets } = currentSnapshot();
  if (!count) return;
  const qn = QUIZ_COUNTS[level] || 5;
  studyState.quiz = { questions: generateQuizQuestions(asteroids, planets, qn), current: 0, score: 0, answers: [] };
  renderQuiz();
};

function generateQuizQuestions(asteroids, planets, n) {
  const questions = [];

  if (planets.length > 3) {
    const sorted = planets.slice().sort((a, b) => num(b.esi) - num(a.esi));
    const correct = sorted[0];
    const opts = sample(planets.filter(p => p.pl_name !== correct.pl_name), 3).map(p => p.pl_name);
    questions.push({
      q: `Which planet has the highest Earth Similarity Index (ESI)?`,
      options: shuffled([correct.pl_name, ...opts]), answer: correct.pl_name,
      explain: `${correct.pl_name} has ESI ${num(correct.esi).toFixed(3)}, the highest in this dataset.`
    });
  }

  const haz = asteroids.filter(a => a.hazardous);
  const safe = asteroids.filter(a => !a.hazardous);
  if (haz.length && safe.length) {
    const target = sample(haz, 1)[0];
    const opts = sample(safe, 3).map(a => a.name);
    questions.push({
      q: `Which of these asteroids is flagged as potentially hazardous?`,
      options: shuffled([target.name, ...opts]), answer: target.name,
      explain: `${target.name} is flagged as potentially hazardous (diameter ${num(target.diameter_km).toFixed(2)} km).`
    });
  }

  if (asteroids.length > 3) {
    const sorted = asteroids.slice().sort((a, b) => num(b.diameter_km) - num(a.diameter_km));
    const correct = sorted[0];
    const opts = sample(asteroids.filter(a => a.name !== correct.name), 3).map(a => a.name);
    questions.push({
      q: `Which asteroid has the largest estimated diameter?`,
      options: shuffled([correct.name, ...opts]), answer: correct.name,
      explain: `${correct.name} has an estimated diameter of ${num(correct.diameter_km).toFixed(2)} km.`
    });
  }

  const withVel = liveData().filter(d => num(d.velocity_kmh) > 0);
  if (withVel.length > 3) {
    const sorted = withVel.slice().sort((a, b) => num(b.velocity_kmh) - num(a.velocity_kmh));
    const correct = sorted[0];
    const name = correct.name || correct.pl_name;
    const opts = sample(withVel.filter(d => (d.name || d.pl_name) !== name), 3).map(d => d.name || d.pl_name);
    questions.push({
      q: `Which object is traveling the fastest (km/h)?`,
      options: shuffled([name, ...opts]), answer: name,
      explain: `${name} is moving at ${num(correct.velocity_kmh).toFixed(0)} km/h.`
    });
  }

  if (planets.length > 3) {
    const scored = planets.map(p => ({ p, score: Math.abs(num(p.pl_rade, 1) - 1) }));
    scored.sort((a, b) => a.score - b.score);
    const correct = scored[0].p;
    const opts = sample(planets.filter(p => p.pl_name !== correct.pl_name), 3).map(p => p.pl_name);
    questions.push({
      q: `Which planet's radius is closest to Earth's (radius = 1)?`,
      options: shuffled([correct.pl_name, ...opts]), answer: correct.pl_name,
      explain: `${correct.pl_name} has radius ${num(correct.pl_rade).toFixed(2)} R⊕, closest to Earth's.`
    });
  }

  return sample(questions, Math.min(n, questions.length));
}

function renderQuiz() {
  const area = $id('quiz-area');
  const q = studyState.quiz;
  if (!area) return;
  if (!q.questions.length) {
    area.innerHTML = '<p style="text-align:center;color:var(--color-space-500);padding:20px;">Not enough data to build a quiz. Try loading more data.</p>';
    return;
  }
  if (q.current >= q.questions.length) { renderQuizResult(); return; }

  const current = q.questions[q.current];
  const progress = ((q.current + 1) / q.questions.length) * 100;
  area.innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <div class="quiz-progress" style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
        <div class="quiz-progress-bar" style="width:${progress}%;height:100%;background:linear-gradient(90deg,var(--color-nebula-500),var(--color-aurora-500));border-radius:3px;"></div>
      </div>
      <div class="quiz-meta" style="display:flex;justify-content:space-between;margin-top:0.75rem;font-size:0.75rem;color:var(--color-space-500);">
        <span>Question ${q.current + 1} of ${q.questions.length}</span><span>Score: ${q.score}</span>
      </div>
    </div>
    <div class="quiz-question" style="font-family:var(--font-display);font-size:1.25rem;font-weight:600;color:var(--color-space-50);margin-bottom:1.5rem;line-height:1.4;">${escapeHtml(current.q)}</div>
    <div class="quiz-options" style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.75rem;">
      ${current.options.map((opt, i) => `
        <button class="quiz-option btn btn-secondary" data-index="${i}" style="padding:1rem;text-align:left;justify-content:flex-start;min-height:60px;display:flex;align-items:center;">${escapeHtml(opt)}</button>
      `).join('')}
    </div>
    <div id="quiz-feedback" style="margin-top:1rem;min-height:60px;"></div>
    <div style="display:flex;justify-content:flex-end;margin-top:1.5rem;">
      <button class="btn btn-primary" id="quiz-next" disabled>Next Question →</button>
    </div>`;

  area.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (area.querySelector('.quiz-option.correct')) return;
      const selected = parseInt(btn.dataset.index);
      const correct = current.answerIndex !== undefined ? current.answerIndex : current.options.indexOf(current.answer);
      const isCorrect = current.options[selected] === current.answer;

      area.querySelectorAll('.quiz-option').forEach((b, i) => {
        b.disabled = true;
        if (current.options[i] === current.answer) {
          b.classList.remove('btn-secondary'); b.classList.add('correct');
          b.style.background = 'rgba(34,197,94,0.3)'; b.style.borderColor = 'var(--color-success-400)'; b.style.color = 'var(--color-success-400)';
        } else if (i === selected && !isCorrect) {
          b.classList.remove('btn-secondary'); b.classList.add('wrong');
          b.style.background = 'rgba(239,68,68,0.3)'; b.style.borderColor = 'var(--color-danger-400)'; b.style.color = 'var(--color-danger-400)';
        } else { b.style.opacity = '0.5'; }
      });

      if (isCorrect) { q.score++; q.answers.push({ question: current.q, correct: true }); showFeedback('Correct! 🎉', 'success'); }
      else { q.answers.push({ question: current.q, correct: false }); showFeedback(`Incorrect. The answer was: ${escapeHtml(current.answer)}`, 'error'); }
      $id('quiz-next').disabled = false;
    });
  });

  $id('quiz-next')?.addEventListener('click', () => {
    q.current++;
    if (q.current < q.questions.length) renderQuiz();
    else renderQuizResult();
  });
}

function showFeedback(message, type) {
  const feedback = $id('quiz-feedback');
  if (!feedback) return;
  feedback.innerHTML = `
    <div class="quiz-feedback ${type === 'success' ? 'ok' : 'bad'}" style="
      padding:1rem;border-radius:var(--radius-md);font-size:0.875rem;display:flex;align-items:center;gap:0.75rem;
      ${type === 'success' ? 'background:rgba(34,197,94,0.15);color:var(--color-success-400);border:1px solid rgba(34,197,94,0.3);' : 'background:rgba(239,68,68,0.15);color:var(--color-danger-400);border:1px solid rgba(239,68,68,0.3);'}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;">
        ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'}
      </svg>
      ${message}
    </div>`;
}

function renderQuizResult() {
  const area = $id('quiz-area');
  const q = studyState.quiz;
  const percent = Math.round((q.score / q.questions.length) * 100);
  area.innerHTML = `
    <div style="text-align:center;padding:2rem;">
      <div class="result-ring" style="--pct:${percent}%;margin:0 auto 1.5rem;"><span>${percent}%</span></div>
      <h3 style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:var(--color-space-50);margin-bottom:0.5rem;">Quiz Complete!</h3>
      <p style="color:var(--color-space-400);margin-bottom:2rem;">You scored ${q.score} out of ${q.questions.length}</p>
      <div style="display:flex;flex-direction:column;gap:1rem;max-width:400px;margin:0 auto;">
        ${q.answers.map((a, i) => `
          <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:var(--radius-md);padding:1rem;text-align:left;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
              <span style="font-weight:500;color:var(--color-space-100);">Q${i + 1}</span>
              <span style="color:${a.correct ? 'var(--color-success-400)' : 'var(--color-danger-400)'};font-weight:600;">${a.correct ? '✓ Correct' : '✗ Incorrect'}</span>
            </div>
            <p style="font-size:0.8125rem;color:var(--color-space-300);">${escapeHtml(a.question)}</p>
          </div>`).join('')}
      </div>
      <button class="btn btn-primary" style="margin-top:2rem;width:100%;max-width:200px;" onclick="window.StudyModule?.startQuiz('easy')">🔄 Retry Quiz</button>
    </div>`;
  recordProgress('quiz', q.questions.length, q.score, q.questions.length);
}

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

function renderChallenges() {
  const area = $id('challenges-area');
  if (!area) return;
  const { count, label } = currentSnapshot();
  if (!count) {
    area.innerHTML = '<p style="text-align:center;color:var(--color-space-500);padding:20px;">No data loaded yet.</p>';
    return;
  }
  area.innerHTML = `
    <div style="text-align:center;padding:20px;">
      <h3 style="margin-bottom:16px;">🎮 Live Challenges — ${escapeHtml(label)}</h3>
      <p style="color:var(--color-space-500);margin-bottom:16px;">Played against the ${count} currently loaded objects.</p>
      <button class="action-btn" onclick="window.StudyModule?.startGuessChallenge()">🔮 Guess the Object</button>
      <button class="action-btn" onclick="window.StudyModule?.startHazardChallenge()">⚠️ Hazard Radar</button>
    </div>`;
}

let guessItems = [], guessIndex = 0, guessScore = 0;
window.StudyModule.startGuessChallenge = function () {
  const data = liveData();
  if (!data.length) return;
  guessItems = sample(data, 5); guessIndex = 0; guessScore = 0;
  renderGuessQuestion();
};

function renderGuessQuestion() {
  const area = $id('challenges-area');
  if (!area) return;
  if (guessIndex >= guessItems.length) {
    area.innerHTML = `<div style="text-align:center;padding:20px;"><h3>🎯 Challenge Complete!</h3><p>You identified <strong>${guessScore} / ${guessItems.length}</strong> objects.</p><button class="action-btn" style="margin-top:14px;" onclick="window.StudyModule?.renderChallenges()">← Back</button></div>`;
    recordProgress('guess-challenge', guessItems.length, guessScore, guessItems.length);
    return;
  }
  const item = guessItems[guessIndex];
  let clue;
  if (isAsteroid()) clue = `Diameter: ${num(item.diameter_km).toFixed(2)} km<br>Velocity: ${num(item.velocity_kmh).toFixed(0)} km/h<br>Hazardous: ${item.hazardous ? 'Yes' : 'No'}`;
  else clue = `Radius: ${num(item.pl_rade).toFixed(2)} R⊕<br>Mass: ${num(item.pl_bmasse).toFixed(2)} M⊕<br>ESI: ${item.esi ? num(item.esi).toFixed(3) : 'N/A'}`;
  area.innerHTML = `
    <div class="quiz-meta">Object ${guessIndex + 1} / ${guessItems.length} · Score: ${guessScore}</div>
    <div class="glass-panel" style="text-align:center;padding:24px;margin-bottom:16px;">
      <div style="font-size:2rem;margin-bottom:8px;">${isAsteroid() ? '🪨' : '🪐'}</div>
      <div class="quiz-question" style="margin:0;">What is this object?</div>
      <div style="margin-top:12px;color:var(--color-space-500);">${clue}</div>
    </div>
    <div style="text-align:center;">
      <input type="text" id="guess-input" class="search-input" style="max-width:320px;" placeholder="Type the name...">
      <button class="action-btn" onclick="window.StudyModule?.submitGuess()">Submit</button>
      <button class="theme-btn" style="margin-top:8px;" onclick="window.StudyModule?.guessNext(true)">Skip ▶</button>
    </div>
    <div id="guess-feedback" style="text-align:center;margin-top:12px;"></div>`;
  const input = $id('guess-input');
  if (input) { input.focus(); input.addEventListener('keydown', e => { if (e.key === 'Enter') window.StudyModule.submitGuess(); }); }
}

window.StudyModule.submitGuess = function () {
  const input = $id('guess-input');
  const item = guessItems[guessIndex];
  const fb = $id('guess-feedback');
  if (!input || !item || !fb) return;
  const guess = input.value.trim().toLowerCase();
  const actual = (item.name || item.pl_name || '').toLowerCase();
  if (!guess) return;
  const correct = guess === actual || actual.includes(guess) || guess.includes(actual);
  if (correct) guessScore++;
  fb.innerHTML = correct
    ? `<span class="badge success">✅ Correct! It's ${escapeHtml(item.name || item.pl_name)}</span>`
    : `<span class="badge danger">❌ It was ${escapeHtml(item.name || item.pl_name)}</span>`;
  setTimeout(() => window.StudyModule.guessNext(false), 1200);
};

window.StudyModule.guessNext = function (wasSkip) {
  if (wasSkip) {
    const item = guessItems[guessIndex];
    const fb = $id('guess-feedback');
    if (fb) fb.innerHTML = `<span class="badge danger">Answer: ${escapeHtml(item.name || item.pl_name)}</span>`;
    setTimeout(() => { guessIndex++; renderGuessQuestion(); }, 800);
  } else { guessIndex++; renderGuessQuestion(); }
};

let hazardItems = [], hazardIndex = 0, hazardScore = 0;
window.StudyModule.startHazardChallenge = function () {
  const data = liveData();
  if (!data.length) return;
  hazardItems = sample(data, 5); hazardIndex = 0; hazardScore = 0;
  renderHazardQuestion();
};

function renderHazardQuestion() {
  const area = $id('challenges-area');
  if (!area) return;
  if (hazardIndex >= hazardItems.length) {
    area.innerHTML = `<div style="text-align:center;padding:20px;"><h3>🎯 Challenge Complete!</h3><p>You scored <strong>${hazardScore} / ${hazardItems.length}</strong>.</p><button class="action-btn" style="margin-top:14px;" onclick="window.StudyModule?.renderChallenges()">← Back</button></div>`;
    recordProgress('hazard-challenge', hazardItems.length, hazardScore, hazardItems.length);
    return;
  }
  const item = hazardItems[hazardIndex];
  const name = item.name || item.pl_name || 'Unknown';
  area.innerHTML = `
    <div class="quiz-meta">Object ${hazardIndex + 1} / ${hazardItems.length} · Score: ${hazardScore}</div>
    <div class="glass-panel" style="text-align:center;padding:24px;margin-bottom:16px;">
      <div style="font-size:2rem;margin-bottom:8px;">${isAsteroid() ? '🪨' : '🪐'}</div>
      <div class="quiz-question" style="margin:0;">Is <strong>${escapeHtml(name)}</strong> potentially hazardous?</div>
      <div style="margin-top:12px;color:var(--color-space-500);">
        ${item.hazardous !== undefined ? `Diameter: ${num(item.diameter_km).toFixed(2)} km · Velocity: ${num(item.velocity_kmh).toFixed(0)} km/h` : `ESI: ${item.esi ? num(item.esi).toFixed(3) : 'N/A'} · Period: ${num(item.pl_orbper).toFixed(1)} days`}
      </div>
    </div>
    <div style="text-align:center;display:flex;gap:12px;justify-content:center;">
      <button class="action-btn" onclick="window.StudyModule?.answerHazard(true)">⚠️ Yes</button>
      <button class="action-btn" onclick="window.StudyModule?.answerHazard(false)">✅ No</button>
    </div>
    <div id="hazard-feedback" style="text-align:center;margin-top:12px;"></div>`;
}

window.StudyModule.answerHazard = function (ans) {
  const item = hazardItems[hazardIndex];
  const fb = $id('hazard-feedback');
  if (!item || !fb) return;
  const correct = item.hazardous === ans;
  if (correct) hazardScore++;
  fb.innerHTML = correct ? `<span class="badge success">✅ Correct!</span>` : `<span class="badge danger">❌ Actually: ${item.hazardous ? 'Yes — hazardous' : 'No — safe'}</span>`;
  setTimeout(() => { hazardIndex++; renderHazardQuestion(); }, 900);
};

// ---------------------------------------------------------------------------
// Compare (live objects chart)
// ---------------------------------------------------------------------------

function renderStudyCompare() {
  const area = $id('compare-area');
  if (!area) return;
  const data = liveData();
  if (!data.length) {
    area.innerHTML = '<p style="text-align:center;color:var(--color-space-500);padding:20px;">No data loaded yet.</p>';
    return;
  }
  const pool = isAsteroid() ? data.filter(d => num(d.diameter_km) > 0) : data.filter(d => d.pl_name && num(d.pl_rade) > 0);
  const opts = sample(pool.length ? pool : data, 12);

  area.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1.5rem;">
      <div>
        <h4 style="font-family:var(--font-display);font-size:1rem;font-weight:600;margin-bottom:1rem;color:var(--color-space-100);">Compare ${viewLabel()}</h4>
        <p style="color:var(--color-space-500);margin-bottom:12px;">Pick up to 3 objects to compare side-by-side.</p>
        <div class="compare-picker" id="compare-picker" style="display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:center;margin-bottom:1rem;"></div>
        <div id="compare-chart-wrap" style="height:300px;"><canvas id="compare-chart"></canvas></div>
      </div>
    </div>`;

  const picker = $id('compare-picker');
  picker.innerHTML = opts.map(o => {
    const nm = o.pl_name || o.name;
    return `<button class="compare-chip" data-name="${escapeHtml(nm)}" onclick="window.StudyModule?.toggleCompareChip(this, '${escapeHtml(nm)}')">${escapeHtml(nm)}</button>`;
  }).join('');

  studyState.compareSelection = [];
  renderCompareChart();
}

window.StudyModule.toggleCompareChip = function (btn, name) {
  const sel = studyState.compareSelection;
  const idx = sel.indexOf(name);
  if (idx >= 0) { sel.splice(idx, 1); btn.classList.remove('active'); }
  else {
    if (sel.length >= 3) {
      const first = sel.shift();
      const firstBtn = document.querySelector(`.compare-chip[data-name="${CSS.escape(first)}"]`);
      if (firstBtn) firstBtn.classList.remove('active');
    }
    sel.push(name); btn.classList.add('active');
  }
  renderCompareChart();
};

function renderCompareChart() {
  const canvas = $id('compare-chart');
  if (!canvas || typeof Chart === 'undefined') return;
  const data = liveData();
  if (!data.length) return;
  const selected = studyState.compareSelection.map(name => data.find(d => (d.pl_name || d.name) === name)).filter(Boolean);
  if (!selected.length) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (studyState.compareChart) { studyState.compareChart.destroy(); studyState.compareChart = null; }

  const labels = selected.map(s => (s.pl_name || s.name).substring(0, 12));
  const size = selected.map(s => num(s.pl_rade, num(s.diameter_km)));
  const mass = selected.map(s => num(s.pl_bmasse));
  const esi = selected.map(s => num(s.esi));

  const style = getComputedStyle(document.documentElement);
  const accent = style.getPropertyValue('--accent').trim() || '#c97b3c';
  const primary = style.getPropertyValue('--primary').trim() || '#8b6f47';
  const success = style.getPropertyValue('--success').trim() || '#5a9e6f';
  const textColor = style.getPropertyValue('--text-primary').trim() || '#333';

  studyState.compareChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Radius / Diameter', data: size, backgroundColor: accent, borderRadius: 4 },
        { label: 'Mass', data: mass, backgroundColor: primary, borderRadius: 4 },
        { label: 'ESI', data: esi, backgroundColor: success, borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } },
        title: { display: true, text: 'Live Comparison', color: textColor, font: { size: 14, weight: 'bold' } }
      },
      scales: { x: { ticks: { color: textColor } }, y: { beginAtZero: true, ticks: { color: textColor } } }
    }
  });
}

// ---------------------------------------------------------------------------
// Progress (localStorage)
// ---------------------------------------------------------------------------

function getProgress() {
  try { return JSON.parse(localStorage.getItem('udb-progress') || '{}'); } catch (e) { return {}; }
}
function recordProgress(key, total, score, max) {
  const prog = getProgress();
  if (!prog[key] || score > prog[key].score) {
    prog[key] = { score, total, max, date: new Date().toISOString() };
    localStorage.setItem('udb-progress', JSON.stringify(prog));
  }
}
function renderProgress() {
  const area = $id('progress-area');
  if (!area) return;
  const prog = getProgress();
  const entries = Object.entries(prog);
  if (!entries.length) {
    area.innerHTML = '<p style="text-align:center;color:var(--color-space-500);padding:20px;">No progress yet. Take a quiz or challenge to earn your first score! 🏆</p>';
    return;
  }
  const names = { quiz: '🧠 Quiz', 'quiz-complete': '🧠 Quiz Results', 'guess-challenge': '🔮 Guess Challenge', 'hazard-challenge': '⚠️ Hazard Radar' };
  area.innerHTML = `
    <h3 style="margin-bottom:14px;">🏆 Your Progress</h3>
    <div class="progress-list">
      ${entries.map(([k, v]) => `
        <div class="progress-card" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:var(--radius-lg);padding:1.25rem;margin-bottom:1rem;display:flex;align-items:center;gap:1rem;">
          <div style="font-size:2rem;">${names[k] || k}</div>
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
              <strong style="color:var(--color-space-100);">${names[k] || k}</strong>
              <span style="font-family:var(--font-mono);color:var(--color-solar-400);">${v.score} / ${v.max || v.total}</span>
            </div>
            <div style="height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;">
              <div style="width:${Math.round((v.score / (v.max || 1)) * 100)}%;height:100%;background:linear-gradient(90deg,var(--color-nebula-500),var(--color-aurora-500));border-radius:3px;"></div>
            </div>
          </div>
          <small style="color:var(--color-space-500);">${new Date(v.date).toLocaleDateString()}</small>
        </div>`).join('')}
    </div>
    <button class="theme-btn" style="margin-top:14px;" onclick="window.StudyModule?.clearProgress()">🗑️ Reset Progress</button>`;
}
window.StudyModule.clearProgress = function () {
  localStorage.removeItem('udb-progress');
  renderProgress();
};

// ---------------------------------------------------------------------------
// Discover / Research Lab (live insights + Project Base fusion)
// ---------------------------------------------------------------------------

function pearson(xs, ys) {
  const n = xs.length;
  if (n !== ys.length || n < 2) return 0;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0);
  let numv = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i] - mx, y = ys[i] - my;
    numv += x * y; dx += x * x; dy += y * y;
  }
  if (dx === 0 || dy === 0) return 0;
  return numv / Math.sqrt(dx * dy);
}

async function renderDiscover() {
  const area = $id('discover-area');
  if (!area) return;
  const data = liveData();
  const { count, label, asteroids, planets } = currentSnapshot();
  await loadEncyclopedia();
  const sites = (studyState.encyclopedia && studyState.encyclopedia.sites) || [];

  const insights = [];

  // --- Live dataset insights ---
  if (planets.length > 5) {
    const pairs = planets.filter(p => num(p.pl_rade) > 0 && p.esi !== undefined);
    if (pairs.length > 5) {
      const corr = pearson(pairs.map(p => num(p.pl_rade)), pairs.map(p => num(p.esi)));
      insights.push({
        icon: '📈', title: 'Correlation: Radius vs ESI', source: 'Live data',
        body: `Pearson r = ${corr.toFixed(3)}. ${corr > 0.3 ? 'Larger planets tend to have higher ESI.' : corr < -0.3 ? 'Larger planets tend to have lower ESI.' : 'No strong linear relationship between radius and ESI.'}`,
        detail: `Based on ${pairs.length} loaded planets with known radius & ESI.`
      });
    }
  }
  if (planets.length > 1) {
    const best = planets.slice().sort((a, b) => num(b.esi) - num(a.esi))[0];
    insights.push({ icon: '🌟', title: 'Most Earth-like planet (live)', source: 'Live data', body: `${best.pl_name} has the highest ESI (${num(best.esi).toFixed(3)}) with radius ${num(best.pl_rade).toFixed(2)} R⊕.`, detail: 'ESI combines radius & mass closeness to Earth.' });
  }
  if (asteroids.length > 1) {
    const biggest = asteroids.slice().sort((a, b) => num(b.diameter_km) - num(a.diameter_km))[0];
    insights.push({ icon: '🪨', title: 'Largest asteroid in view', source: 'Live data', body: `${biggest.name} measures ~${num(biggest.diameter_km).toFixed(1)} km across.`, detail: 'NASA estimates diameter from brightness.' });
  }
  if (asteroids.length > 1) {
    const hazCount = asteroids.filter(a => a.hazardous).length;
    insights.push({ icon: '⚠️', title: 'Hazard fraction', source: 'Live data', body: `${Math.round((hazCount / asteroids.length) * 100)}% of loaded asteroids (${hazCount}/${asteroids.length}) are potentially hazardous.`, detail: 'PHAs are defined by size & orbit proximity criteria.' });
  }
  if (planets.length > 1) {
    const hot = planets.filter(p => /hot/i.test(p.status || p.water_status || '')).length;
    const cold = planets.filter(p => /cold/i.test(p.status || p.water_status || '')).length;
    insights.push({ icon: '🔥', title: 'Temperature zone distribution', source: 'Live data', body: `~${Math.round((hot / planets.length) * 100)}% of loaded planets fall in the "Hot" zone; ${cold} are "Cold".`, detail: 'Based on orbital period heuristics.' });
  }
  const withVel = asteroids.filter(a => num(a.velocity_kmh) > 0);
  if (withVel.length > 3) {
    const avg = withVel.reduce((s, a) => s + num(a.velocity_kmh), 0) / withVel.length;
    const fastest = withVel.slice().sort((a, b) => num(b.velocity_kmh) - num(a.velocity_kmh))[0];
    insights.push({ icon: '💨', title: 'Average asteroid velocity', source: 'Live data', body: `Average speed of loaded asteroids is ~${avg.toFixed(0)} km/h. The fastest is ${fastest.name} at ${num(fastest.velocity_kmh).toFixed(0)} km/h.`, detail: 'Relative velocity at closest approach to Earth.' });
  }

  // --- Project Base fusion: terrain site insights ---
  if (sites.length > 1) {
    const flattest = sites.slice().sort((a, b) => num(a.mean_rough_m) - num(b.mean_rough_m))[0];
    insights.push({ icon: '🌑', title: 'Flattest terrain site (Project Base)', source: 'Encyclopedia', body: `${flattest.name} (${flattest.body}) — mean roughness ${num(flattest.mean_rough_m).toFixed(3)} m.`, detail: `${flattest.siteClass || ''} site at ${flattest.region || ''}.` });
    const roughest = sites.slice().sort((a, b) => num(b.p95_rough_m) - num(a.p95_rough_m))[0];
    insights.push({ icon: '⛰️', title: 'Roughest terrain site (Project Base)', source: 'Encyclopedia', body: `${roughest.name} (${roughest.body}) — P95 roughness ${num(roughest.p95_rough_m).toFixed(3)} m.`, detail: `${roughest.siteClass || ''} site.` });
    const marsSites = sites.filter(s => s.body === 'Mars');
    if (marsSites.length > 1) {
      const bestMars = marsSites.slice().sort((a, b) => num(b.mean_rough_m) - num(a.mean_rough_m)).pop();
      insights.push({ icon: '🔴', title: 'Smoothest Mars site', source: 'Encyclopedia', body: `${bestMars.name} — mean roughness ${num(bestMars.mean_rough_m).toFixed(3)} m, area ${num(bestMars.area_km2).toFixed(1)} km².`, detail: 'Candidate landing-site reference from the merged Planetary Explorer.' });
    }
  }

  if (!insights.length) {
    area.innerHTML = '<p style="text-align:center;color:var(--color-space-500);padding:20px;">Load more data to unlock research insights.</p>';
    return;
  }

  area.innerHTML = `
    <h3 style="margin-bottom:6px;">🔬 Research Lab</h3>
    <p style="color:var(--color-space-500);font-size:0.85rem;margin-bottom:14px;">Insights derived from ${count} live ${label.toLowerCase()} objects ${sites.length ? `· ${sites.length} terrain sites from Project Base` : ''}.</p>
    <button class="theme-btn" style="margin-bottom:14px;" onclick="window.StudyModule?.renderDiscover()">🔄 Re-run Analysis</button>
    <div class="discover-list">
      ${insights.map((ins, i) => `
        <div class="discover-card" style="display:flex;flex-direction:column;gap:0.75rem;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-left:3px solid var(--color-aurora-500);border-radius:var(--radius-lg);padding:1.25rem;">
          <div style="display:flex;align-items:flex-start;gap:0.75rem;">
            <div style="font-size:1.5rem;">${ins.icon}</div>
            <div class="discover-content" style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
                <div class="discover-title" style="font-family:var(--font-display);font-size:1rem;font-weight:600;color:var(--color-space-50);">${escapeHtml(ins.title)}</div>
                <span style="font-size:0.6875rem;color:var(--color-space-500);">${escapeHtml(ins.source)}</span>
              </div>
              <div class="discover-body" style="font-size:0.875rem;color:var(--color-space-300);line-height:1.6;margin-bottom:0.5rem;">${escapeHtml(ins.body)}</div>
              <div class="discover-detail" style="font-size:0.75rem;color:var(--color-space-500);">${escapeHtml(ins.detail)}</div>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}
window.StudyModule.renderDiscover = renderDiscover;
window.StudyModule.renderChallenges = renderChallenges;

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
