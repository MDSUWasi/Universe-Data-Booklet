/* Patch Explorer: filters every recorded patch by body and filled-surface flag. */
'use strict';

(function () {
    const P = {
        records: null,
        initialized: false,

        open() {
            if (!this.initialized) {
                document.getElementById('patch-body').addEventListener('change', () => this.render());
                document.getElementById('patch-kind').addEventListener('change', () => this.render());
                this.initialized = true;
            }
            if (!this.records) {
                this.setStatus('Loading committed patch report\u2026');
                (async () => {
                    try {
                        const response = await fetch('/api/patches');
                        if (!response.ok) throw new Error('Patch report returned HTTP ' + response.status);
                        const data = await response.json();
                        this.records = data.records;
                        this.render();
                    } catch (error) {
                        this.setStatus('Patch report unavailable: ' + error.message);
                    }
                })();
                return;
            }
            this.render();
        },

        render() {
            if (!this.records) return;
            const bodyFilter = document.getElementById('patch-body').value;
            const kindFilter = document.getElementById('patch-kind').value;
            const records = this.records.filter(record =>
                (bodyFilter === 'all' || record.body === bodyFilter) &&
                (kindFilter === 'all' || (kindFilter === 'filled' ? record.filled : !record.filled))
            );
            const tbody = document.getElementById('patch-rows');
            tbody.replaceChildren(...records.map(record => {
                const row = document.createElement('tr');
                if (record.filled) row.classList.add('is-filled');
                const values = [
                    record.site, record.body, this.number(record.area_km2, 3),
                    this.number(record.rough_mean_m, 3), this.number(record.rough_p95_m, 3),
                    this.number(record.rough_max_m, 3), this.number(record.zero_frac, 4),
                    record.filled ? 'Filled / flagged' : 'Non-filled'
                ];
                values.forEach((value, index) => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    if (index === 7) cell.className = record.filled ? 'fill-flag' : 'clear-flag';
                    row.appendChild(cell);
                });
                return row;
            }));
            document.getElementById('patch-count').textContent = records.length + ' of ' + this.records.length + ' recorded patches';
            if (!records.length && bodyFilter === 'Mars') {
                this.setStatus('No Mars patch-level records are present in analog_comparison.csv. Jezero is available in the site-summary report, but its patch classifications are not in this checkout.');
            } else if (!records.length) {
                this.setStatus('No recorded patches match these filters.');
            } else {
                this.setStatus('Source: output/reports/analog_comparison.csv. Values and flags are shown as recorded.');
            }
        },

        number(value, digits) { return Number.isFinite(value) ? value.toFixed(digits) : '-'; },

        setStatus(message) { document.getElementById('patch-status').textContent = message; }
    };

    window.PatchExplorer = P;
})();