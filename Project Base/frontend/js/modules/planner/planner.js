/* Mission Planner: wizard-style campaign design.
   Classic script: registers window.Planner. */
'use strict';

(function () {
    const P = {
        step: 0,
        steps: ['Mission Type', 'Duration', 'Team Size', 'Summary'],
        choices: {
            0: ['Exploration', 'Resource Survey', 'Scientific Outpost'],
            1: ['1 Week', '1 Month', '6 Months'],
            2: ['Solo', '2-Person', 'Full Crew']
        },
        plan: {}
    };

    P.start = function () {
        this.step = 0;
        this.plan = {};
        this.renderStep();
    };

    P.renderStep = function () {
        const el = document.getElementById('planner-steps');
        if (!el) return;
        const opts = (this.choices[this.step] || []);
        let html = '<div class="planner-step"><h3>' + this.steps[this.step] + '</h3><div class="planner-options">';
        opts.forEach((opt, i) => {
            html += '<button class="opt" data-val="' + opt + '" data-step="' + this.step + '" type="button">' + opt + '</button>';
        });
        html += '</div></div>';
        el.innerHTML = html;

        el.querySelectorAll('.opt').forEach(btn => {
            btn.onclick = (e) => {
                this.plan[this.steps[this.step]] = e.target.dataset.val;
                if (this.step < this.steps.length - 1) { this.step++; this.renderStep(); }
                else { this.finish(); }
            };
        });
    };

    P.finish = function () {
        const out = document.getElementById('planner-output');
        if (!out) return;
        const items = Object.entries(this.plan).map(([k, v]) => '<b>' + k + ':</b> ' + v).join('</li><li>');
        out.innerHTML = '<h3>Mission Draft Ready</h3><ul><li>' + items + '</li></ul>' +
            '<p style="margin-top:12px;font-size:0.85rem">Next step: Export to CSV.</p>';
        window.Toast.show('Mission draft generated');
        document.querySelector('#planner-next').hidden = true;
        document.querySelector('#planner-back').hidden = true;
    };

    window.Planner = P;
})();