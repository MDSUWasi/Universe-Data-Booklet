/* Base Site Selector: weight criteria and re-rank all sites instantly.
   Classic script: registers window.Selector. */
'use strict';

(function () {
    const S = {
        weights: { smooth: 7, hazard: 5, area: 6, slope: 8 }
    };

    S.init = function () {
        ['smooth', 'hazard', 'area', 'slope'].forEach(k => {
            const el = document.getElementById('w-' + k);
            const disp = document.getElementById('wv-' + k);
            if (el && disp) {
                el.oninput = (e) => {
                    this.weights[k] = parseInt(e.target.value, 10);
                    disp.textContent = this.weights[k];
                    this.run();
                };
            }
        });
    };

    S.run = function () {
        const results = document.getElementById('selector-results');
        if (!results) return;
        const sites = Object.values(window.SITE_DATA).map(s => {
            const normArea = s.area / 500;
            const normRough = 5 - s.meanRough;
            const normHazard = 6 - s.p95Rough;
            const normSlope = s.slopeDiscipline;
            const score = (normRough * this.weights.smooth) + (normHazard * this.weights.hazard) + (normArea * this.weights.area) + (normSlope * this.weights.slope);
            return { ...s, score };
        }).sort((a, b) => b.score - a.score);

        results.innerHTML = sites.map((s, i) =>
            '<div class="rank-item ' + (i === 0 ? 'top' : '') + '">' +
            '<div class="rank-pos">#' + (i + 1) + '</div>' +
            '<div>' +
            '<div class="rank-name">' + s.name + '</div>' +
            '<div class="rank-sub">' + s.body + ' \u2022 ' + s.analogy + '</div>' +
            '</div>' +
            '<div class="rank-score">' + Math.round(s.score) + '</div>' +
            '</div>'
        ).join('');
    };

    window.Selector = S;
})();