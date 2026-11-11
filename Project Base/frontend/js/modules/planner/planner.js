/* Mission Planner: wizard-style campaign design.
   Classic script: registers window.Planner. */
'use strict';

(function () {
    const P = {
        step: 0,
        steps: ['Mission Type', 'Duration', 'Team Size', 'Target Site'],
        choices: {
            0: ['Exploration', 'Resource Survey', 'Scientific Outpost'],
            1: ['1 Week', '1 Month', '6 Months'],
            2: ['Solo', '2-Person', 'Full Crew']
        },
        plan: {},
        weights: { science: 0.4, cost: 0.3, risk: 0.3 }
    };

    P.start = function () {
        this.step = 0;
        this.plan = {};
        this.renderStep();
        this.updateButtons();
    };

    P.renderStep = function () {
        const el = document.getElementById('planner-steps');
        if (!el) return;
        let opts;
        if (this.step === 3) {
            opts = Object.values(window.SITE_DATA).map(s => s.name);
        } else {
            opts = (this.choices[this.step] || []);
        }
        let html = '<div class="planner-step"><h3>' + this.steps[this.step] + '</h3><div class="planner-options">';
        opts.forEach((opt, i) => {
            html += '<button class="opt" data-val="' + opt + '" data-step="' + this.step + '" type="button">' + opt + '</button>';
        });
        html += '</div></div>';
        el.innerHTML = html;

        el.querySelectorAll('.opt').forEach(btn => {
            btn.onclick = (e) => {
                this.plan[this.steps[this.step]] = e.target.dataset.val;
                this.next();
            };
        });
    };

    P.next = function () {
        if (this.step < this.steps.length - 1) { this.step++; this.renderStep(); this.updateButtons(); }
        else { this.finish(); }
    };

    P.back = function () {
        if (this.step > 0) { this.step--; this.renderStep(); this.updateButtons(); }
    };

    P.updateButtons = function () {
        const back = document.getElementById('planner-back');
        const next = document.getElementById('planner-next');
        if (back) back.hidden = (this.step === 0);
        if (next) next.hidden = false;
        if (next) next.textContent = (this.step === this.steps.length - 1) ? 'Finish' : 'Next ->';
    };

    P.finish = function () {
        const out = document.getElementById('planner-output');
        if (!out) return;
        const plan = this.plan;
        const items = Object.entries(plan).map(([k, v]) => '<li><b>' + k + ':</b> ' + v + '</li>').join('');

        // Mathematical scoring: rank every catalogued site for this mission.
        const ranked = this.rankSites(plan);
        const top = ranked[0];

        let rows = '';
        ranked.forEach((r, i) => {
            const isTop = (i === 0);
            rows += '<tr style="' + (isTop ? 'background:rgba(86,214,165,0.12)' : '') + '">' +
                '<td><b>' + (isTop ? '#1 ' : '#' + (i + 1) + ' ') + r.site.name + '</b></td>' +
                '<td>' + r.site.body + '</td>' +
                '<td class="num">' + r.score + '</td>' +
                '<td class="num">sci ' + r.science + '</td>' +
                '<td class="num">cost ' + r.cost + '</td>' +
                '<td class="num">risk ' + r.risk + '</td>' +
                '</tr>';
        });

        out.innerHTML =
            '<h3>Mission Draft Ready</h3>' +
            '<ul>' + items + '</ul>' +
            '<h4 style="margin-top:16px">Site viability for this mission</h4>' +
            '<p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:8px">' +
            'Score = science (' + (this.weights.science * 100) + '%) + inverse cost (' + (this.weights.cost * 100) + '%) + inverse risk (' + (this.weights.risk * 100) + '%). ' +
            'Max 100.</p>' +
            '<table class="cmp-table"><thead><tr>' +
            '<th>Rank</th><th>Site</th><th>Body</th><th class="num">Score</th><th class="num">Science</th><th class="num">Cost</th><th class="num">Risk</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>' +
            '<p style="margin-top:12px;font-size:0.82rem">' +
            'Best pick: <b>' + top.site.name + '</b> (' + top.site.body + ') with a viability score of <b>' + top.score + '</b>. ' +
            'Terrain risk ' + top.risk + '/100, mission cost proxy ' + top.cost + '/100, science value ' + top.science + '/100.</p>';

        window.Toast.show('Mission draft generated');
        const next = document.getElementById('planner-next');
        if (next) next.textContent = 'Restart';
        const pdfBtn = document.getElementById('planner-pdf');
        if (pdfBtn) pdfBtn.disabled = false;
    };

    window.Planner = P;
})();