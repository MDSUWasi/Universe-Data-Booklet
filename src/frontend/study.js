(function () {
    'use strict';

    // Help Needed?  
    function $id(id) { return document.getElementById(id); }
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#039;');
    }
    function num(v, fallback) {
        const n = parseFloat(v);
        return isNaN(n) ? (fallback || 0) : n;
    }
    function isAsteroid() {
        return window.currentTab === 'asteroids';
    }
    function allData() {
        return (window.globalData && window.globalData.length) ? window.globalData : [];
    }
    function shuffled(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    function sample(arr, n) {
        return shuffled(arr).slice(0, n);
    }

    // Take your astronomy book and get ready to study
    function openStudyModal() {
        const modal = $id('study-modal');
        if (!modal) return;
        if (typeof window.closeChartModal === 'function') window.closeChartModal();
        if (typeof window.closeThreeModal === 'function') window.closeThreeModal();
        if (typeof window.closeMapModal === 'function') window.closeMapModal();
        modal.classList.add('open');
        switchStudyTab('flashcards');
    }
    function closeStudyModal() {
        const modal = $id('study-modal');
        if (modal) modal.classList.remove('open');
    }
    window.openStudyModal = openStudyModal;
    window.closeStudyModal = closeStudyModal;

    // Study Tabs (not in browser)
    const STUDY_TABS = ['flashcards', 'quiz', 'challenges', 'compare', 'progress', 'discover'];

    function switchStudyTab(tab) {
        if (STUDY_TABS.indexOf(tab) === -1) return;
        document.querySelectorAll('.study-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        const pane = $id('study-' + tab);
        if (!pane) return;
        document.querySelectorAll('.study-pane').forEach(p => p.style.display = 'none');
        pane.style.display = 'block';

        if (tab === 'flashcards') initFlashcards();
        else if (tab === 'quiz') initQuiz();
        else if (tab === 'challenges') initChallenges();
        else if (tab === 'compare') initCompare();
        else if (tab === 'progress') renderProgress();
        else if (tab === 'discover') initDiscover();
    }
    window.switchStudyTab = switchStudyTab;

    // Study tip 1: Flashcards
    let flashDeck = [];
    let flashIndex = 0;
    let flashFlipped = false;

    function buildFlashDeck() {
        const data = allData();
        if (!data.length) return;
        const cards = [];
        if (isAsteroid()) {
            sample(data, 15).forEach(item => {
                cards.push({
                    front: '🪨 ' + (item.name || 'Unknown'),
                    back: [
                        'Date: ' + (item.date || '?'),
                        'Diameter: ' + num(item.diameter_km).toFixed(2) + ' km',
                        'Velocity: ' + num(item.velocity_kmh).toFixed(2) + ' km/h',
                        'Hazardous: ' + (item.hazardous ? '⚠️ Yes' : '✅ No')
                    ].join('<br>')
                });
            });
        } else {
            sample(data, 15).forEach(item => {
                cards.push({
                    front: '🪐 ' + (item.pl_name || 'Unknown'),
                    back: [
                        'Host Star: ' + (item.hostname || '?'),
                        'Radius: ' + num(item.pl_rade).toFixed(2) + ' R⊕',
                        'Mass: ' + num(item.pl_bmasse).toFixed(2) + ' M⊕',
                        'ESI: ' + (item.esi ? num(item.esi).toFixed(3) : 'N/A'),
                        'Water: ' + (item.water_status || '?')
                    ].join('<br>')
                });
            });
        }
        flashDeck = cards;
        flashIndex = 0;
        flashFlipped = false;
    }

    function initFlashcards() {
        const wrap = $id('flashcard-area');
        if (!wrap) return;
        buildFlashDeck();
        renderFlashcard();
    }

    function renderFlashcard() {
        const wrap = $id('flashcard-area');
        if (!wrap) return;
        if (!flashDeck.length) {
            wrap.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No data available yet. Load some data first.</p>';
            return;
        }
        const card = flashDeck[flashIndex];
        wrap.innerHTML = `
            <div class="flashcard ${flashFlipped ? 'flipped' : ''}" onclick="this.classList.toggle('flipped')">
                <div class="flashcard-inner">
                    <div class="flashcard-face flashcard-front">
                        <span class="flashcard-hint">Click to flip</span>
                        <div class="flashcard-title">${card.front}</div>
                    </div>
                    <div class="flashcard-face flashcard-back">
                        <div class="flashcard-body">${card.back}</div>
                    </div>
                </div>
            </div>
            <div class="flashcard-nav">
                <button class="theme-btn" onclick="flashPrev()">◀ Prev</button>
                <span class="flashcard-counter">${flashIndex + 1} / ${flashDeck.length}</span>
                <button class="theme-btn" onclick="flashNext()">Next ▶</button>
            </div>`;
    }

    function flashPrev() {
        flashFlipped = false;
        if (flashDeck.length) flashIndex = (flashIndex - 1 + flashDeck.length) % flashDeck.length;
        renderFlashcard();
    }
    function flashNext() {
        flashFlipped = false;
        if (flashDeck.length) flashIndex = (flashIndex + 1) % flashDeck.length;
        renderFlashcard();
    }
    window.flashPrev = flashPrev;
    window.flashNext = flashNext;

    // Study tip 2: Let's take a Quiz
    let quizQuestions = [];
    let quizIndex = 0;
    let quizScore = 0;
    let quizTotal = 0;

    const QUIZ_COUNTS = { easy: 5, medium: 10, hard: 15 };

    function initQuiz() {
        const area = $id('quiz-area');
        if (!area) return;
        const data = allData();
        if (!data.length) {
            area.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No data available yet.</p>';
            return;
        }
        area.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <h3 style="margin-bottom:16px;">🧠 Choose Difficulty</h3>
                <button class="action-btn" onclick="startQuiz('easy')">😊 Easy (5)</button>
                <button class="action-btn" onclick="startQuiz('medium')">🤔 Medium (10)</button>
                <button class="action-btn" onclick="startQuiz('hard')">🔥 Hard (15)</button>
            </div>`;
    }

    function startQuiz(level) {
        const data = allData();
        if (!data.length) return;
        const qn = QUIZ_COUNTS[level] || 5;
        quizQuestions = generateQuizQuestions(data, qn);
        quizIndex = 0;
        quizScore = 0;
        quizTotal = quizQuestions.length;
        renderQuizQuestion();
    }
    window.startQuiz = startQuiz;

    function generateQuizQuestions(data, n) {
        const questions = [];
        const planets = data.filter(d => d.pl_name);
        const asteroids = data.filter(d => d.name && !d.pl_name);

        // 1) Highest ESI question? (4 Marks)
        if (planets.length > 3) {
            const sorted = planets.slice().sort((a, b) => num(b.esi) - num(a.esi));
            const correct = sorted[0];
            const opts = sample(planets.filter(p => p.pl_name !== correct.pl_name), 3).map(p => p.pl_name);
            const options = shuffled([correct.pl_name, ...opts]);
            questions.push({
                type: 'Highest ESI',
                q: `Which planet has the highest Earth Similarity Index (ESI)?`,
                options,
                answer: correct.pl_name,
                explain: `${correct.pl_name} has ESI ${num(correct.esi).toFixed(3)}, the highest in this dataset.`
            });
        }

        // 2) Hazardous asteroid question? (2 Marks)
        const haz = asteroids.filter(a => a.hazardous);
        const safe = asteroids.filter(a => !a.hazardous);
        if (haz.length && safe.length) {
            const target = sample(haz, 1)[0];
            const opts = sample(safe, 3).map(a => a.name);
            const options = shuffled([target.name, ...opts]);
            questions.push({
                type: 'Hazardous Asteroid',
                q: `Which of these asteroids is flagged as potentially hazardous?`,
                options,
                answer: target.name,
                explain: `${target.name} is flagged as potentially hazardous by NASA (diameter ${num(target.diameter_km).toFixed(2)} km).`
            });
        }

        // 3) Largest asteroid by diameter? (10 Marks)
        if (asteroids.length > 3) {
            const sorted = asteroids.slice().sort((a, b) => num(b.diameter_km) - num(a.diameter_km));
            const correct = sorted[0];
            const opts = sample(asteroids.filter(a => a.name !== correct.name), 3).map(a => a.name);
            const options = shuffled([correct.name, ...opts]);
            questions.push({
                type: 'Largest Asteroid',
                q: `Which asteroid has the largest estimated diameter?`,
                options,
                answer: correct.name,
                explain: `${correct.name} has an estimated diameter of ${num(correct.diameter_km).toFixed(2)} km.`
            });
        }

        // 4) Fastest object (Free marks)
        const withVel = data.filter(d => num(d.velocity_kmh) > 0);
        if (withVel.length > 3) {
            const sorted = withVel.slice().sort((a, b) => num(b.velocity_kmh) - num(a.velocity_kmh));
            const correct = sorted[0];
            const name = correct.name || correct.pl_name;
            const opts = sample(withVel.filter(d => (d.name || d.pl_name) !== name), 3).map(d => d.name || d.pl_name);
            const options = shuffled([name, ...opts]);
            questions.push({
                type: 'Fastest Object',
                q: `Which object is traveling the fastest (km/h)?`,
                options,
                answer: name,
                explain: `${name} is moving at ${num(correct.velocity_kmh).toFixed(0)} km/h.`
            });
        }

        // 5) Most Earth-like (highest radius close to 1)
        if (planets.length > 3) {
            const scored = planets.map(p => ({ p, score: Math.abs(num(p.pl_rade, 1) - 1) }));
            scored.sort((a, b) => a.score - b.score);
            const correct = scored[0].p;
            const opts = sample(planets.filter(p => p.pl_name !== correct.pl_name), 3).map(p => p.pl_name);
            const options = shuffled([correct.pl_name, ...opts]);
            questions.push({
                type: 'Earth Similarity',
                q: `Which planet's radius is closest to Earth's (radius = 1)?`,
                options,
                answer: correct.pl_name,
                explain: `${correct.pl_name} has radius ${num(correct.pl_rade).toFixed(2)} R⊕, closest to Earth's.`
            });
        }

        // 6) Water status question ( Each question contain 1 marks and 0 negative marks if gets wrong)
        const highWater = planets.filter(p => /High/i.test(p.water_status || ''));
        if (highWater.length > 1) {
            const correct = sample(highWater, 1)[0];
            const opts = sample(planets.filter(p => p.pl_name !== correct.pl_name), 3).map(p => p.pl_name);
            const options = shuffled([correct.pl_name, ...opts]);
            questions.push({
                type: 'Water Status',
                q: `Which planet has a "High (Likely Liquid)" water status?`,
                options,
                answer: correct.pl_name,
                explain: `${correct.pl_name} has orbital period ${num(correct.pl_orbper).toFixed(1)} days, placing it in the liquid-water zone.`
            });
        }

        return sample(questions, Math.min(n, questions.length));
    }

    function renderQuizQuestion() {
        const area = $id('quiz-area');
        if (!area) return;
        if (!quizQuestions.length) {
            area.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">Not enough data to build a quiz. Try loading more data.</p>';
            return;
        }
        if (quizIndex >= quizQuestions.length) {
            renderQuizResult();
            return;
        }
        const q = quizQuestions[quizIndex];
        const progress = Math.round((quizIndex / quizQuestions.length) * 100);
        area.innerHTML = `
            <div class="quiz-progress"><div class="quiz-progress-bar" style="width:${progress}%"></div></div>
            <div class="quiz-meta">Question ${quizIndex + 1} / ${quizQuestions.length} · Score: ${quizScore}</div>
            <div class="quiz-question">${escapeHtml(q.q)}</div>
            <div class="quiz-options">
                ${q.options.map(opt => `<button class="quiz-option" onclick="answerQuiz('${escapeHtml(opt)}')">${escapeHtml(opt)}</button>`).join('')}
            </div>
            <div id="quiz-feedback"></div>`;
    }

    function answerQuiz(selected) {
        const q = quizQuestions[quizIndex];
        const area = $id('quiz-area');
        if (!area) return;
        const isCorrect = selected === q.answer;
        if (isCorrect) quizScore++;
        const optionsHtml = q.options.map(opt => {
            let cls = 'quiz-option';
            if (opt === q.answer) cls += ' correct';
            else if (opt === selected) cls += ' wrong';
            return `<button class="${cls}" onclick="answerQuiz('${escapeHtml(opt)}')">${escapeHtml(opt)}</button>`;
        }).join('');
        area.innerHTML = `
            <div class="quiz-meta">Question ${quizIndex + 1} / ${quizQuestions.length} · Score: ${quizScore}</div>
            <div class="quiz-question">${escapeHtml(q.q)}</div>
            <div class="quiz-options">${optionsHtml}</div>
            <div class="quiz-feedback ${isCorrect ? 'ok' : 'bad'}">
                ${isCorrect ? '✅ Correct!' : '❌ Not quite.'}<br>
                <small>${escapeHtml(q.explain)}</small>
            </div>
            <button class="action-btn" style="margin-top:14px;" onclick="nextQuizQuestion()">${quizIndex + 1 >= quizQuestions.length ? 'See Results' : 'Next →'}</button>`;
        recordProgress('quiz', quizIndex + 1, quizScore, quizQuestions.length);
    }
    window.answerQuiz = answerQuiz;

    function nextQuizQuestion() {
        quizIndex++;
        renderQuizQuestion();
    }
    window.nextQuizQuestion = nextQuizQuestion;

    function renderQuizResult() {
        const area = $id('quiz-area');
        if (!area) return;
        const pct = Math.round((quizScore / quizTotal) * 100);
        const grade = pct >= 80 ? '🌟 Excellent Astronomer!' : pct >= 50 ? '🚀 Good Job!' : '📖 Keep Studying!';
        recordProgress('quiz-complete', quizTotal, quizScore, quizTotal);
        area.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <div style="font-size:3rem;">${pct >= 80 ? '🏆' : pct >= 50 ? '🎉' : '📚'}</div>
                <h3>${grade}</h3>
                <p>You scored <strong>${quizScore} / ${quizTotal}</strong> (${pct}%)</p>
                <div class="result-ring" style="--pct:${pct}%"><span>${pct}%</span></div>
                <button class="action-btn" style="margin-top:16px;" onclick="initQuiz()">🔁 Try Again</button>
            </div>`;
    }

    // Study tip 3: Challenge your current study condition with the yesterday's version.
    function initChallenges() {
        const area = $id('challenges-area');
        if (!area) return;
        const data = allData();
        if (!data.length) {
            area.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No data available yet.</p>';
            return;
        }
        area.innerHTML = `
            <div style="text-align:center;padding:20px;">
                <h3 style="margin-bottom:16px;">🎮 Pick a Challenge</h3>
                <button class="action-btn" onclick="startGuessChallenge()">🔮 Guess the Object</button>
                <button class="action-btn" onclick="startHazardChallenge()">⚠️ Hazard Radar</button>
            </div>`;
    }

    // Guess the Object (Do not guess during real MCQ exam)
    let guessItems = [];
    let guessIndex = 0;
    let guessScore = 0;

    function startGuessChallenge() {
        const data = allData();
        if (!data.length) return;
        guessItems = sample(data, 5);
        guessIndex = 0;
        guessScore = 0;
        renderGuessQuestion();
    }
    window.startGuessChallenge = startGuessChallenge;

    function renderGuessQuestion() {
        const area = $id('challenges-area');
        if (!area) return;
        if (guessIndex >= guessItems.length) {
            area.innerHTML = `
                <div style="text-align:center;padding:20px;">
                    <h3>🎯 Challenge Complete!</h3>
                    <p>You identified <strong>${guessScore} / ${guessItems.length}</strong> objects.</p>
                    <button class="action-btn" style="margin-top:14px;" onclick="initChallenges()">← Back</button>
                </div>`;
            recordProgress('guess-challenge', guessItems.length, guessScore, guessItems.length);
            return;
        }
        const item = guessItems[guessIndex];
        let clue;
        if (isAsteroid()) {
            clue = `Diameter: ${num(item.diameter_km).toFixed(2)} km<br>Velocity: ${num(item.velocity_kmh).toFixed(0)} km/h<br>Hazardous: ${item.hazardous ? 'Yes' : 'No'}`;
        } else {
            clue = `Radius: ${num(item.pl_rade).toFixed(2)} R⊕<br>Mass: ${num(item.pl_bmasse).toFixed(2)} M⊕<br>ESI: ${item.esi ? num(item.esi).toFixed(3) : 'N/A'}`;
        }
        area.innerHTML = `
            <div class="quiz-meta">Object ${guessIndex + 1} / ${guessItems.length} · Score: ${guessScore}</div>
            <div class="glass-panel" style="text-align:center;padding:24px;margin-bottom:16px;">
                <div style="font-size:2rem;margin-bottom:8px;">${isAsteroid() ? '🪨' : '🪐'}</div>
                <div class="quiz-question" style="margin:0;">What is this object?</div>
                <div style="margin-top:12px;color:var(--text-muted);">${clue}</div>
            </div>
            <div style="text-align:center;">
                <input type="text" id="guess-input" class="search-input" style="max-width:320px;" placeholder="Type the name...">
                <button class="action-btn" onclick="submitGuess()">Submit</button>
                <button class="theme-btn" style="margin-top:8px;" onclick="guessNext(true)">Skip ▶</button>
            </div>
            <div id="guess-feedback" style="text-align:center;margin-top:12px;"></div>`;
        const input = $id('guess-input');
        if (input) { input.focus(); input.addEventListener('keydown', e => { if (e.key === 'Enter') submitGuess(); }); }
    }

    function submitGuess() {
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
        setTimeout(() => guessNext(false), 1200);
    }
    window.submitGuess = submitGuess;

    function guessNext(wasSkip) {
        if (wasSkip) {
            const item = guessItems[guessIndex];
            const fb = $id('guess-feedback');
            if (fb) fb.innerHTML = `<span class="badge danger">Answer: ${escapeHtml(item.name || item.pl_name)}</span>`;
            setTimeout(() => { guessIndex++; renderGuessQuestion(); }, 800);
        } else {
            guessIndex++;
            renderGuessQuestion();
        }
    }
    window.guessNext = guessNext;

    // Hazard Radar challenge (Challenges have both win and loss. So, be careful while guessing)
    let hazardItems = [];
    let hazardIndex = 0;
    let hazardScore = 0;

    function startHazardChallenge() {
        const data = allData();
        if (!data.length) return;
        hazardItems = sample(data, 5);
        hazardIndex = 0;
        hazardScore = 0;
        renderHazardQuestion();
    }
    window.startHazardChallenge = startHazardChallenge;

    function renderHazardQuestion() {
        const area = $id('challenges-area');
        if (!area) return;
        if (hazardIndex >= hazardItems.length) {
            area.innerHTML = `
                <div style="text-align:center;padding:20px;">
                    <h3>🎯 Challenge Complete!</h3>
                    <p>You scored <strong>${hazardScore} / ${hazardItems.length}</strong>.</p>
                    <button class="action-btn" style="margin-top:14px;" onclick="initChallenges()">← Back</button>
                </div>`;
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
                <div style="margin-top:12px;color:var(--text-muted);">
                    ${item.hazardous !== undefined
                        ? `Diameter: ${num(item.diameter_km).toFixed(2)} km · Velocity: ${num(item.velocity_kmh).toFixed(0)} km/h`
                        : `ESI: ${item.esi ? num(item.esi).toFixed(3) : 'N/A'} · Period: ${num(item.pl_orbper).toFixed(1)} days`}
                </div>
            </div>
            <div style="text-align:center;display:flex;gap:12px;justify-content:center;">
                <button class="action-btn" onclick="answerHazard(true)">⚠️ Yes</button>
                <button class="action-btn" onclick="answerHazard(false)">✅ No</button>
            </div>
            <div id="hazard-feedback" style="text-align:center;margin-top:12px;"></div>`;
    }

    function answerHazard(ans) {
        const item = hazardItems[hazardIndex];
        const fb = $id('hazard-feedback');
        if (!item || !fb) return;
        const actual = item.hazardous;
        const correct = actual === ans;
        if (correct) hazardScore++;
        fb.innerHTML = correct
            ? `<span class="badge success">✅ Correct!</span>`
            : `<span class="badge danger">❌ Actually: ${actual ? 'Yes — hazardous' : 'No — safe'}</span>`;
        setTimeout(() => { hazardIndex++; renderHazardQuestion(); }, 900);
    }
    window.answerHazard = answerHazard;

    // Study tip 4: Do not Compare your result with others
    function initCompare() {
        const area = $id('compare-area');
        if (!area) return;
        const data = allData();
        if (!data.length) {
            area.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No data available yet.</p>';
            return;
        }
        const planets = data.filter(d => d.pl_name && num(d.pl_rade) > 0);
        const pool = planets.length ? planets : data;
        const opts = sample(pool, 12);
        area.innerHTML = `
            <div style="text-align:center;padding:10px;">
                <h3 style="margin-bottom:12px;">⚖️ Compare Objects</h3>
                <p style="color:var(--text-muted);margin-bottom:12px;">Pick up to 3 objects to compare side-by-side.</p>
                <div class="compare-picker">
                    ${opts.map(o => {
                        const nm = o.pl_name || o.name;
                        return `<button class="compare-chip" data-idx="${escapeHtml(nm)}" onclick="toggleCompareChip(this, '${escapeHtml(nm)}')">${escapeHtml(nm)}</button>`;
                    }).join('')}
                </div>
                <div id="compare-chart-wrap" style="margin-top:16px;height:260px;"><canvas id="compare-chart"></canvas></div>
            </div>`;
    }

    let compareSelection = [];

    function toggleCompareChip(btn, name) {
        const idx = compareSelection.indexOf(name);
        if (idx >= 0) {
            compareSelection.splice(idx, 1);
            btn.classList.remove('active');
        } else {
            if (compareSelection.length >= 3) {
                const first = compareSelection.shift();
                const firstBtn = document.querySelector(`.compare-chip[data-idx="${CSS.escape(first)}"]`);
                if (firstBtn) firstBtn.classList.remove('active');
            }
            compareSelection.push(name);
            btn.classList.add('active');
        }
        renderCompareChart();
    }
    window.toggleCompareChip = toggleCompareChip;

    function renderCompareChart() {
        const canvas = $id('compare-chart');
        if (!canvas || typeof Chart === 'undefined') return;
        const data = allData();
        if (!data.length) return;
        const selected = compareSelection.map(name => data.find(d => (d.pl_name || d.name) === name)).filter(Boolean);
        if (!selected.length) return;

        if (window.compareChartInstance) { window.compareChartInstance.destroy(); }

        const labels = selected.map(s => (s.pl_name || s.name).substring(0, 12));
        const radius = selected.map(s => num(s.pl_rade, num(s.diameter_km)));
        const mass = selected.map(s => num(s.pl_bmasse));
        const esi = selected.map(s => num(s.esi));

        const style = getComputedStyle(document.documentElement);
        const accent = style.getPropertyValue('--accent').trim() || '#c97b3c';
        const primary = style.getPropertyValue('--primary').trim() || '#8b6f47';
        const success = style.getPropertyValue('--success').trim() || '#5a9e6f';
        const textColor = style.getPropertyValue('--text-primary').trim() || '#333';

        window.compareChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Radius / Diameter', data: radius, backgroundColor: accent, borderRadius: 4 },
                    { label: 'Mass', data: mass, backgroundColor: primary, borderRadius: 4 },
                    { label: 'ESI', data: esi, backgroundColor: success, borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } },
                    title: { display: true, text: 'Comparison', color: textColor, font: { size: 14, weight: 'bold' } }
                },
                scales: {
                    x: { ticks: { color: textColor } },
                    y: { beginAtZero: true, ticks: { color: textColor } }
                }
            }
        });
    }

    // Study tip 4: Always keep a progress note of your study
    function getProgress() {
        try {
            return JSON.parse(localStorage.getItem('udb-progress') || '{}');
        } catch (e) { return {}; }
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
            area.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No progress yet. Take a quiz or challenge to earn your first score! 🏆</p>';
            return;
        }
        const names = {
            'quiz': '🧠 Quiz',
            'quiz-complete': '🧠 Quiz Results',
            'guess-challenge': '🔮 Guess Challenge',
            'hazard-challenge': '⚠️ Hazard Radar'
        };
        area.innerHTML = `
            <h3 style="margin-bottom:14px;">🏆 Your Progress</h3>
            <div class="progress-list">
                ${entries.map(([k, v]) => `
                    <div class="progress-card">
                        <div class="progress-name">${names[k] || k}</div>
                        <div class="progress-score">${v.score} / ${v.max || v.total}</div>
                        <div class="progress-bar"><div style="width:${Math.round((v.score / (v.max || 1)) * 100)}%"></div></div>
                        <small style="color:var(--text-muted);">${new Date(v.date).toLocaleDateString()}</small>
                    </div>`).join('')}
            </div>
            <button class="theme-btn" style="margin-top:14px;" onclick="clearProgress()">🗑️ Reset Progress</button>`;
    }
    function clearProgress() {
        localStorage.removeItem('udb-progress');
        renderProgress();
    }
    window.clearProgress = clearProgress;

    // Study tip 5: Do not discover anything new topic the night before exam but discover anything to study after the exam.
    function initDiscover() {
        const area = $id('discover-area');
        if (!area) return;
        const data = allData();
        if (!data.length) {
            area.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No data available yet. Load data first to run the research lab.</p>';
            return;
        }
        const insights = [];

        const planets = data.filter(d => d.pl_name);
        const asteroids = data.filter(d => d.name && !d.pl_name);

        // ESI vs Radius
        if (planets.length > 5) {
            const pairs = planets.filter(p => num(p.pl_rade) > 0 && p.esi !== undefined);
            if (pairs.length > 5) {
                const corr = pearson(pairs.map(p => num(p.pl_rade)), pairs.map(p => num(p.esi)));
                insights.push({
                    icon: '📈',
                    title: 'Correlation: Radius vs ESI',
                    body: `Pearson correlation r = ${corr.toFixed(3)}. ${
                        corr > 0.3 ? 'Larger planets tend to have higher ESI.' :
                        corr < -0.3 ? 'Larger planets tend to have LOWER ESI (smaller worlds look more Earth-like).' :
                        'There is no strong linear relationship between radius and ESI.'}`,
                    detail: `Based on ${pairs.length} planets with known radius & ESI.`
                });
            }
        }

        // Extremes
        if (planets.length > 1) {
            const best = planets.slice().sort((a, b) => num(b.esi) - num(a.esi))[0];
            insights.push({
                icon: '🌟',
                title: 'Most Earth-like planet',
                body: `${best.pl_name} has the highest ESI (${num(best.esi).toFixed(3)}) with radius ${num(best.pl_rade).toFixed(2)} R⊕.`,
                detail: 'ESI combines radius & mass closeness to Earth.'
            });
        }
        if (asteroids.length > 1) {
            const biggest = asteroids.slice().sort((a, b) => num(b.diameter_km) - num(a.diameter_km))[0];
            insights.push({
                icon: '🪨',
                title: 'Largest asteroid in view',
                body: `${biggest.name} measures ~${num(biggest.diameter_km).toFixed(1)} km across.`,
                detail: 'NASA estimates diameter from brightness.'
            });
        }

        // Study tip 6: Understand the patterns.
        if (asteroids.length > 1) {
            const hazCount = asteroids.filter(a => a.hazardous).length;
            const pct = Math.round((hazCount / asteroids.length) * 100);
            insights.push({
                icon: '⚠️',
                title: 'Hazard fraction',
                body: `${pct}% of loaded asteroids (${hazCount}/${asteroids.length}) are flagged as potentially hazardous.`,
                detail: 'PHAs are defined by size & orbit proximity criteria.'
            });
        }
        if (planets.length > 1) {
            const hot = planets.filter(p => /hot/i.test(p.status || p.water_status || '')).length;
            const cold = planets.filter(p => /cold/i.test(p.status || p.water_status || '')).length;
            const pctHot = Math.round((hot / planets.length) * 100);
            insights.push({
                icon: '🔥',
                title: 'Temperature zone distribution',
                body: `~${pctHot}% of loaded planets fall in the "Hot" zone; ${cold} are "Cold".`,
                detail: 'Based on orbital period heuristics (Hot <50 days, Cold >1000 days).'
            });
        }

        // Mass vs Radius ratio (Remember Ratio of simal quantity have no unit but Ratio of different quantity have units)
        if (planets.length > 5) {
            const dense = planets.filter(p => num(p.pl_bmasse) > 0 && num(p.pl_rade) > 0)
                .map(p => ({ p, density: num(p.pl_bmasse) / (num(p.pl_rade) ** 2) }))
                .sort((a, b) => b.density - a.density);
            if (dense.length > 2) {
                const top = dense[0];
                insights.push({
                    icon: '⚖️',
                    title: 'Unusually dense world',
                    body: `${top.p.pl_name} has a mass-to-radius ratio of ${top.density.toFixed(2)}, suggesting a rocky/metallic composition.`,
                    detail: 'Mass ÷ radius² is a rough proxy for density.'
                });
            }
        }

        // Velocity Pattern (Remember it is not velocity graph from kinematics)
        const withVel = asteroids.filter(a => num(a.velocity_kmh) > 0);
        if (withVel.length > 3) {
            const avg = withVel.reduce((s, a) => s + num(a.velocity_kmh), 0) / withVel.length;
            const fastest = withVel.slice().sort((a, b) => num(b.velocity_kmh) - num(a.velocity_kmh))[0];
            insights.push({
                icon: '💨',
                title: 'Average asteroid velocity',
                body: `The average speed of loaded asteroids is ~${avg.toFixed(0)} km/h. The fastest is ${fastest.name} at ${num(fastest.velocity_kmh).toFixed(0)} km/h.`,
                detail: 'Relative velocity at closest approach to Earth.'
            });
        }

        if (!insights.length) {
            area.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">Load more data to unlock research insights.</p>';
            return;
        }

        area.innerHTML = `
            <h3 style="margin-bottom:6px;">🔬 Research Lab</h3>
            <p style="color:var(--text-muted);font-size:0.85rem;margin-bottom:14px;">New knowledge derived from the loaded dataset. ${data.length} objects analyzed.</p>
            <button class="theme-btn" style="margin-bottom:14px;" onclick="initDiscover()">🔄 Re-run Analysis</button>
            <div class="discover-list">
                ${insights.map((ins, i) => `
                    <div class="discover-card">
                        <div class="discover-icon">${ins.icon}</div>
                        <div class="discover-content">
                            <div class="discover-title">${ins.title}</div>
                            <div class="discover-body">${escapeHtml(ins.body)}</div>
                            <div class="discover-detail">${escapeHtml(ins.detail)}</div>
                        </div>
                    </div>`).join('')}
            </div>`;
    }

    function pearson(xs, ys) {
        const n = xs.length;
        if (n !== ys.length || n < 2) return 0;
        const mx = xs.reduce((s, v) => s + v, 0) / n;
        const my = ys.reduce((s, v) => s + v, 0) / n;
        let num = 0, dx = 0, dy = 0;
        for (let i = 0; i < n; i++) {
            const x = xs[i] - mx, y = ys[i] - my;
            num += x * y;
            dx += x * x;
            dy += y * y;
        }
        if (dx === 0 || dy === 0) return 0;
        return num / Math.sqrt(dx * dy);
    }

})();