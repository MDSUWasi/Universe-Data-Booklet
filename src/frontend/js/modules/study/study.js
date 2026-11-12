// Study Mode Module
import { fetchApi, showToast, escapeHtml } from '../core/state.js';

let studyState = {
  currentTab: 'flashcards',
  flashcards: [],
  currentCard: 0,
  flipped: false,
  quiz: { questions: [], current: 0, score: 0, answers: [] },
  progress: {},
};

export function initStudy() {
  const tabButtons = document.querySelectorAll('.study-tab-btn');
  const tabPanes = document.querySelectorAll('.study-pane');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.studyTab;
      switchTab(tab);
    });
  });
  
  // Load flashcard data
  loadFlashcards();
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
  
  // Initialize tab content
  switch (tab) {
    case 'flashcards':
      if (studyState.flashcards.length === 0) loadFlashcards();
      else renderFlashcard();
      break;
    case 'quiz':
      if (studyState.quiz.questions.length === 0) loadQuiz();
      else renderQuiz();
      break;
    case 'challenges':
      renderChallenges();
      break;
    case 'compare':
      renderStudyCompare();
      break;
    case 'progress':
      loadProgress();
      break;
    case 'discover':
      renderDiscover();
      break;
  }
}

async function loadFlashcards() {
  const area = document.getElementById('flashcard-area');
  if (!area) return;
  
  area.innerHTML = '<p style="text-align:center;color:var(--color-space-500);padding:20px;">Loading flashcards…</p>';
  
  try {
    const result = await fetchApi('/api/study/flashcards');
    if (result.error) throw new Error(result.error);
    
    studyState.flashcards = result.flashcards || result.data || [];
    studyState.currentCard = 0;
    studyState.flipped = false;
    renderFlashcard();
    
  } catch (error) {
    console.error('Flashcards load error:', error);
    area.innerHTML = `<p style="text-align:center;color:var(--color-danger-400);padding:20px;">Failed to load: ${escapeHtml(error.message)}</p>`;
    showToast('Failed to load flashcards', 'error');
  }
}

function renderFlashcard() {
  const area = document.getElementById('flashcard-area');
  if (!area || !studyState.flashcards.length) return;
  
  const card = studyState.flashcards[studyState.currentCard];
  
  area.innerHTML = `
    <div class="flashcard ${studyState.flipped ? 'flipped' : ''}" id="study-flashcard" style="
      width: 100%;
      max-width: 500px;
      height: 300px;
      perspective: 1000px;
      cursor: pointer;
    ">
      <div class="flashcard-inner" style="
        position: relative;
        width: 100%;
        height: 100%;
        transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        transform-style: preserve-3d;
        ${studyState.flipped ? 'transform: rotateY(180deg);' : ''}
      ">
        <div class="flashcard-face flashcard-front" style="
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-xl);
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(135deg, var(--color-space-850), var(--color-space-900));
          padding: 2rem;
          box-shadow: var(--shadow-lg);
        ">
          <div style="font-size: 3rem; margin-bottom: 1.5rem;">🃏</div>
          <h3 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--color-space-50); text-align: center; margin-bottom: 1rem;">${escapeHtml(card.front || 'Question')}</h3>
          <p style="font-size: 0.875rem; color: var(--color-space-500); text-align: center;">Tap to reveal answer</p>
        </div>
        <div class="flashcard-face flashcard-back" style="
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          transform: rotateY(180deg);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-xl);
          border: 1px solid var(--color-nebula-500);
          background: linear-gradient(135deg, var(--color-nebula-500), var(--color-aurora-500));
          padding: 2rem;
          box-shadow: var(--shadow-lg), var(--shadow-glow-nebula);
          color: white;
        ">
          <h3 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: 1rem;">Answer</h3>
          <p style="font-size: 1.125rem; line-height: 1.6; text-align: center; font-weight: 500;">${escapeHtml(card.back || 'No answer')}</p>
          ${card.explanation ? `<p style="font-size: 0.875rem; opacity: 0.8; text-align: center; margin-top: 1rem; font-style: italic;">${escapeHtml(card.explanation)}</p>` : ''}
        </div>
      </div>
    </div>
    <div class="flashcard-nav" style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.5rem;">
      <button class="btn btn-secondary" id="flashcard-prev" ${studyState.currentCard === 0 ? 'disabled' : ''}>← Previous</button>
      <span class="flashcard-counter" style="font-family: var(--font-mono); font-size: 1rem; color: var(--color-space-300);">${studyState.currentCard + 1} / ${studyState.flashcards.length}</span>
      <button class="btn btn-secondary" id="flashcard-next" ${studyState.currentCard === studyState.flashcards.length - 1 ? 'disabled' : ''}>Next →</button>
    </div>
    <div style="display: flex; justify-content: center; gap: 0.75rem; margin-top: 1rem;">
      <button class="btn btn-ghost" id="flashcard-shuffle">🔀 Shuffle</button>
      <button class="btn btn-primary" id="flashcard-flip" style="width: 100%; max-width: 200px;">${studyState.flipped ? 'Show Question' : 'Show Answer'}</button>
    </div>
  `;
  
  const flashcard = document.getElementById('study-flashcard');
  flashcard?.addEventListener('click', () => {
    studyState.flipped = !studyState.flipped;
    renderFlashcard();
  });
  
  document.getElementById('flashcard-prev')?.addEventListener('click', () => {
    if (studyState.currentCard > 0) {
      studyState.currentCard--;
      studyState.flipped = false;
      renderFlashcard();
    }
  });
  
  document.getElementById('flashcard-next')?.addEventListener('click', () => {
    if (studyState.currentCard < studyState.flashcards.length - 1) {
      studyState.currentCard++;
      studyState.flipped = false;
      renderFlashcard();
    }
  });
  
  document.getElementById('flashcard-flip')?.addEventListener('click', () => {
    studyState.flipped = !studyState.flipped;
    renderFlashcard();
  });
  
  document.getElementById('flashcard-shuffle')?.addEventListener('click', () => {
    studyState.flashcards = shuffleArray([...studyState.flashcards]);
    studyState.currentCard = 0;
    studyState.flipped = false;
    renderFlashcard();
  });
}

async function loadQuiz() {
  const area = document.getElementById('quiz-area');
  if (!area) return;
  
  area.innerHTML = '<p style="text-align:center;color:var(--color-space-500);padding:20px;">Loading quiz…</p>';
  
  try {
    const result = await fetchApi('/api/study/quiz');
    if (result.error) throw new Error(result.error);
    
    studyState.quiz = {
      questions: result.questions || result.data || [],
      current: 0,
      score: 0,
      answers: [],
    };
    renderQuiz();
    
  } catch (error) {
    console.error('Quiz load error:', error);
    area.innerHTML = `<p style="text-align:center;color:var(--color-danger-400);padding:20px;">Failed to load: ${escapeHtml(error.message)}</p>`;
  }
}

function renderQuiz() {
  const area = document.getElementById('quiz-area');
  const q = studyState.quiz;
  if (!area || !q.questions.length) return;
  
  const current = q.questions[q.current];
  const progress = ((q.current + 1) / q.questions.length) * 100;
  
  area.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <div class="quiz-progress" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
        <div class="quiz-progress-bar" style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, var(--color-nebula-500), var(--color-aurora-500)); border-radius: 3px; transition: width 0.3s ease;"></div>
      </div>
      <div class="quiz-meta" style="display: flex; justify-content: space-between; margin-top: 0.75rem; font-size: 0.75rem; color: var(--color-space-500);">
        <span>Question ${q.current + 1} of ${q.questions.length}</span>
        <span>Score: ${q.score}</span>
      </div>
    </div>
    <div class="quiz-question" style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; color: var(--color-space-50); margin-bottom: 1.5rem; line-height: 1.4;">${escapeHtml(current.question)}</div>
    <div class="quiz-options" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
      ${current.options.map((opt, i) => `
        <button class="quiz-option btn btn-secondary" data-index="${i}" style="padding: 1rem; text-align: left; justify-content: flex-start; min-height: 60px; display: flex; align-items: center;">
          ${escapeHtml(opt)}
        </button>
      `).join('')}
    </div>
    <div id="quiz-feedback" style="margin-top: 1rem; min-height: 60px;"></div>
    <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
      <button class="btn btn-primary" id="quiz-next" disabled>Next Question →</button>
    </div>
  `;
  
  area.querySelectorAll('.quiz-option').forEach(btn => {
    btn.addEventListener('click', () => {
      if (area.querySelector('.quiz-option.correct')) return; // Already answered
      
      const selected = parseInt(btn.dataset.index);
      const correct = current.correct;
      const isCorrect = selected === correct;
      
      area.querySelectorAll('.quiz-option').forEach((b, i) => {
        b.disabled = true;
        if (i === correct) {
          b.classList.remove('btn-secondary');
          b.classList.add('correct');
          b.style.background = 'rgba(34,197,94,0.3)';
          b.style.borderColor = 'var(--color-success-400)';
          b.style.color = 'var(--color-success-400)';
        } else if (i === selected && !isCorrect) {
          b.classList.remove('btn-secondary');
          b.classList.add('wrong');
          b.style.background = 'rgba(239,68,68,0.3)';
          b.style.borderColor = 'var(--color-danger-400)';
          b.style.color = 'var(--color-danger-400)';
        } else {
          b.style.opacity = '0.5';
        }
      });
      
      if (isCorrect) {
        q.score++;
        q.answers.push({ question: current.question, correct: true });
        showFeedback('Correct! 🎉', 'success');
      } else {
        q.answers.push({ question: current.question, correct: false, selected, correct });
        showFeedback(`Incorrect. The answer was: ${current.options[correct]}`, 'error');
      }
      
      document.getElementById('quiz-next').disabled = false;
    });
  });
  
  document.getElementById('quiz-next')?.addEventListener('click', () => {
    q.current++;
    if (q.current < q.questions.length) {
      renderQuiz();
    } else {
      showQuizResults();
    }
  });
}

function showFeedback(message, type) {
  const feedback = document.getElementById('quiz-feedback');
  if (!feedback) return;
  
  feedback.innerHTML = `
    <div class="quiz-feedback ${type === 'success' ? 'ok' : 'bad'}" style="
      padding: 1rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      ${type === 'success' ? 'background: rgba(34,197,94,0.15); color: var(--color-success-400); border: 1px solid rgba(34,197,94,0.3);' : 'background: rgba(239,68,68,0.15); color: var(--color-danger-400); border: 1px solid rgba(239,68,68,0.3);'}
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
        ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'}
      </svg>
      ${message}
    </div>
  `;
}

function showQuizResults() {
  const area = document.getElementById('quiz-area');
  const q = studyState.quiz;
  const percent = Math.round((q.score / q.questions.length) * 100);
  
  area.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <div class="result-ring" style="--pct: ${percent}%; margin: 0 auto 1.5rem;">
        <span>${percent}%</span>
      </div>
      <h3 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--color-space-50); margin-bottom: 0.5rem;">Quiz Complete!</h3>
      <p style="color: var(--color-space-400); margin-bottom: 2rem;">You scored ${q.score} out of ${q.questions.length}</p>
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 400px; margin: 0 auto;">
        ${q.answers.map((a, i) => `
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: var(--radius-md); padding: 1rem; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="font-weight: 500; color: var(--color-space-100);">Q${i + 1}</span>
              <span style="color: ${a.correct ? 'var(--color-success-400)' : 'var(--color-danger-400)'}; font-weight: 600;">
                ${a.correct ? '✓ Correct' : '✗ Incorrect'}
              </span>
            </div>
            <p style="font-size: 0.8125rem; color: var(--color-space-300);">${escapeHtml(a.question)}</p>
            ${!a.correct ? `<p style="font-size: 0.75rem; color: var(--color-space-500); margin-top: 0.5rem;">Correct: ${escapeHtml(q.questions[i].options[a.correct])}</p>` : ''}
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary" style="margin-top: 2rem; width: 100%; max-width: 200px;" onclick="window.StudyModule?.loadQuiz()">🔄 Retry Quiz</button>
    </div>
  `;
}

function renderChallenges() {
  const area = document.getElementById('challenges-area');
  if (!area) return;
  
  area.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
      ${[
        { id: 'challenge-asteroid', title: 'Asteroid Hunter', desc: 'Identify 10 hazardous asteroids from orbital data', icon: '☄️', xp: 500 },
        { id: 'challenge-exoplanet', title: 'Exoplanet Classifier', desc: 'Categorize 15 exoplanets by ESI and composition', icon: '🪐', xp: 750 },
        { id: 'challenge-terrain', title: 'Terrain Analyst', desc: 'Match landing sites to mission requirements', icon: '⛰️', xp: 1000 },
        { id: 'challenge-trajectory', title: 'Trajectory Designer', desc: 'Design optimal transfer orbits', icon: '🚀', xp: 1250 },
      ].map(c => `
        <div class="challenge-card" style="
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: var(--transition-base);
        " onmouseenter="this.style.transform='translateY(-4px)'; this.style.boxShadow='var(--shadow-lg)'" onmouseleave="this.style.transform=''; this.style.boxShadow=''">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="font-size: 2rem;">${c.icon}</div>
            <div>
              <h4 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; color: var(--color-space-50);">${c.title}</h4>
              <p style="font-size: 0.8125rem; color: var(--color-space-400);">${c.desc}</p>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.04);">
            <span style="font-family: var(--font-mono); font-size: 1.125rem; font-weight: 700; color: var(--color-solar-400);">+${c.xp} XP</span>
            <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.8125rem;">Start Challenge</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderStudyCompare() {
  const area = document.getElementById('compare-area');
  if (!area) return;
  
  area.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div>
        <h4 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: var(--color-space-100);">Compare Celestial Bodies</h4>
        <div class="compare-picker" id="compare-picker" style="display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; margin-bottom: 1rem;"></div>
        <div id="compare-chart-wrap" style="height: 300px;"></div>
      </div>
      <div>
        <h4 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: var(--color-space-100);">Mission Trade Studies</h4>
        <p style="color: var(--color-space-400);">Coming soon: interactive mission architecture comparison tool</p>
      </div>
    </div>
  `;
}

async function loadProgress() {
  const area = document.getElementById('progress-area');
  if (!area) return;
  
  try {
    const result = await fetchApi('/api/study/progress');
    if (result.error) throw new Error(result.error);
    
    studyState.progress = result.progress || result.data || {};
    renderProgress();
    
  } catch (error) {
    console.error('Progress load error:', error);
    renderProgress(); // Show mock data
  }
}

function renderProgress() {
  const area = document.getElementById('progress-area');
  if (!area) return;
  
  const progress = studyState.progress;
  const totalXP = progress.totalXP || 0;
  const level = Math.floor(totalXP / 1000) + 1;
  const xpInLevel = totalXP % 1000;
  const xpForNext = 1000;
  
  const categories = [
    { key: 'asteroids', label: 'Asteroid Science', icon: '☄️', xp: progress.asteroids || 0 },
    { key: 'exoplanets', label: 'Exoplanet Science', icon: '🪐', xp: progress.exoplanets || 0 },
    { key: 'terrain', label: 'Terrain Analysis', icon: '⛰️', xp: progress.terrain || 0 },
    { key: 'missions', label: 'Mission Design', icon: '🚀', xp: progress.missions || 0 },
  ];
  
  area.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <div>
          <h3 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--color-space-50);">Level ${level} Explorer</h3>
          <p style="color: var(--color-space-400);">${totalXP.toLocaleString()} Total XP</p>
        </div>
        <div class="result-ring" style="--pct: ${(xpInLevel / xpForNext) * 100}%; width: 80px; height: 80px;">
          <span style="width: 56px; height: 56px; font-size: 1rem;">${level}</span>
        </div>
      </div>
      <div style="height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
        <div style="width: ${(xpInLevel / xpForNext) * 100}%; height: 100%; background: linear-gradient(90deg, var(--color-solar-400), var(--color-nebula-400)); border-radius: 4px; transition: width 0.5s ease;"></div>
      </div>
      <p style="font-size: 0.75rem; color: var(--color-space-500); margin-top: 0.5rem; text-align: right;">${xpInLevel.toLocaleString()} / ${xpForNext.toLocaleString()} XP to Level ${level + 1}</p>
    </div>
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      ${categories.map(cat => `
        <div class="progress-card" style="
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        ">
          <div style="font-size: 2rem;">${cat.icon}</div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <strong style="color: var(--color-space-100);">${cat.label}</strong>
              <span style="font-family: var(--font-mono); color: var(--color-solar-400);">${cat.xp.toLocaleString()} XP</span>
            </div>
            <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
              <div style="width: ${Math.min(100, (cat.xp / 2000) * 100)}%; height: 100%; background: linear-gradient(90deg, var(--color-nebula-500), var(--color-aurora-500)); border-radius: 3px;"></div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderDiscover() {
  const area = document.getElementById('discover-area');
  if (!area) return;
  
  area.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 4rem; margin-bottom: 1rem;">🔬</div>
        <h3 style="font-family: var(--font-display); font-size: 1.5rem; font-weight: 600; color: var(--color-space-50); margin-bottom: 0.5rem;">Discover Mode</h3>
        <p style="color: var(--color-space-400); max-width: 40ch; margin: 0 auto;">Explore curated scientific mysteries and open questions in planetary science</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
        ${[
          { title: 'Venus Phosphine Mystery', desc: 'Investigate the disputed phosphine detection in Venus clouds', category: 'Astrobiology', status: 'Active Debate' },
          { title: 'Mars Methane Cycles', desc: 'Track seasonal methane variations and potential sources', category: 'Planetary Science', status: 'Ongoing' },
          { title: 'Europa Plume Composition', desc: 'Analyze projected Europa Clipper plume flyby data', category: 'Ocean Worlds', status: 'Future Mission' },
          { title: 'Titan Prebiotic Chemistry', desc: 'Explore organic synthesis pathways in Titan atmosphere', category: 'Astrobiology', status: 'Lab Studies' },
          { title: 'Psyche Metal World', desc: 'Prepare for NASA Psyche mission to metallic asteroid', category: 'Small Bodies', status: 'En Route' },
          { title: 'TRAPPIST-1 Atmospheres', desc: 'Model atmospheric retention on M-dwarf planets', category: 'Exoplanets', status: 'JWST Era' },
        ].map(item => `
          <div class="discover-card" style="
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.04);
            border-left: 3px solid var(--color-aurora-500);
            border-radius: var(--radius-lg);
            padding: 1.25rem;
            transition: var(--transition-base);
          " onmouseenter="this.style.transform='translateX(4px)'; this.style.borderLeftColor='var(--color-nebula-500)'" onmouseleave="this.style.transform=''; this.style.borderLeftColor='var(--color-aurora-500)'">
            <h4 style="font-family: var(--font-display); font-size: 1rem; font-weight: 600; color: var(--color-space-50);">${item.title}</h4>
            <p style="font-size: 0.8125rem; color: var(--color-space-300); line-height: 1.6;">${item.desc}</p>
            <div style="display: flex; gap: 1rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.04); font-size: 0.6875rem;">
              <span style="color: var(--color-space-500);">${item.category}</span>
              <span style="color: var(--color-solar-400); font-weight: 600;">${item.status}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}