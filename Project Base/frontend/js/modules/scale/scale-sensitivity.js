/* Scale Sensitivity: plots 12 m fingerprints beside the 90 m lunar reference. */
'use strict';

(function () {
    const S = {
        data: null,
        chart: null,

        open() {
            if (!this.data) {
                document.getElementById('scale-status').textContent = 'Loading recorded fingerprints and matched-window reference\u2026';
                (async () => {
                    try {
                        const response = await fetch('/api/scale-sensitivity');
                        if (!response.ok) throw new Error('Scale data returned HTTP ' + response.status);
                        this.data = await response.json();
                        this.render();
                    } catch (error) {
                        document.getElementById('scale-status').textContent = 'Scale data unavailable: ' + error.message;
                    }
                })();
                return;
            }
            this.render();
        },

        render() {
            const data = this.data;
            const fingerprints = data.fingerprints;
            const reference = data.comparison_reference;
            const shortWindow = data.fingerprint_window_m;
            const longWindow = data.comparison_window_m;
            const warning = data.warning;
            const labels = fingerprints.map(point => 'Patch ' + point.patch_id + ' (' + shortWindow + ' m)').concat(['Main reference (' + longWindow + ' m)']);
            const means = fingerprints.map(point => point.roughness_mean_m).concat([reference.mean_roughness_m]);
            const p95s = fingerprints.map(point => point.roughness_p95_m).concat([reference.p95_roughness_m]);
            document.getElementById('scale-summary').textContent = warning;
            const areas = fingerprints.map(point => point.area_km2);
            const slopes = fingerprints.map(point => point.slope_mean_deg);
            document.getElementById('scale-status').textContent = 'Recorded ' + shortWindow + ' m fingerprints: mean ' + means.slice(0, -1).map(value => value.toFixed(3)).join(', ') + ' m; area ' + areas.map(value => value.toFixed(3)).join(', ') + ' km²; slope ' + slopes.map(value => (Number.isFinite(value) ? value.toFixed(3) : '-') ).join(', ') + '°. ' + longWindow + ' m reference: mean ' + reference.mean_roughness_m.toFixed(3) + ' m, p95 ' + reference.p95_roughness_m.toFixed(3) + '.';
            if (typeof Chart === 'undefined') return;
            const canvas = document.getElementById('scale-chart');
            const chartData = {
                labels,
                datasets: [
                    { label: 'Mean roughness (m)', data: means, backgroundColor: '#55d6a5' },
                    { label: 'p95 roughness (m)', data: p95s, backgroundColor: '#f5c451' }
                ]
            };
            if (this.chart) { this.chart.data = chartData; this.chart.update('none'); return; }
            this.chart = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#e8eaf6' } } },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Roughness (m)', color: '#9aa0c3' }, ticks: { color: '#9aa0c3' } },
                        x: { ticks: { color: '#e8eaf6', maxRotation: 0, minRotation: 0 } }
                    }
                }
            });
        }
    };

    window.ScaleSensitivity = S;
})();