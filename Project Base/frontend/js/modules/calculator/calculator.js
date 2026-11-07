/* Analogy Calculator: adjusted Euclidean distance in terrain-metric space.
   Classic script: registers window.Calculator. */
'use strict';

(function () {
    const C = { chart: null };

    C.init = function () {
        ['rough', 'p95', 'slope', 'area'].forEach(k => {
            const el = document.getElementById('c-' + k);
            const disp = document.getElementById('cv-' + k);
            if (el && disp) {
                el.oninput = (e) => {
                    const val = el.type === 'range' && k === 'slope' ? e.target.value + '%' : e.target.value;
                    disp.textContent = val;
                    this.updateChart();
                };
            }
        });
        this.updateChart();
    };

    C.updateChart = function () {
        const ctx = document.getElementById('calc-chart');
        if (!ctx || !window.Chart) return;
        const moon = window.SITE_DATA.moon;
        const data = Object.values(window.SITE_DATA).map(s => {
            const dist = Math.sqrt(Math.pow(s.meanRough - moon.meanRough, 2) + Math.pow(s.p95Rough - moon.p95Rough, 2));
            const similarity = Math.max(0, 100 - (dist * 15));
            return { site: s.name.substring(0, 12), sim: similarity.toFixed(0) };
        });
        if (this.chart) this.chart.destroy();
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.site),
                datasets: [{ label: 'Moon Similarity %', data: data.map(d => d.sim), backgroundColor: ['#4E8C6E', '#2E7D9A', '#C9821A', '#E07A5F', '#F08080'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    };

    window.Calculator = C;
})();