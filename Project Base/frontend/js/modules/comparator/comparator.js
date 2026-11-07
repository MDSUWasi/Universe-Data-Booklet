/* Full Comparison: sortable table, cross-body matches, and a chart.
   Classic script: registers window.Comparator. */
'use strict';

(function () {
    const C = {
        sortCol: 'sim',
        sortDir: 'desc',
        filterBody: 'all'
    };

    C.render = function () {
        this.bindFilters();
        this.bindSort();
        this.drawTable();
        this.drawCrossTable();
        this.drawChart();
    };

    C.bindFilters = function () {
        document.querySelectorAll('.cmp-filter').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.cmp-filter').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                e.target.classList.add('active');
                e.target.setAttribute('aria-pressed', 'true');
                this.filterBody = e.target.dataset.body;
                this.drawTable();
            };
        });
    };

    C.bindSort = function () {
        document.querySelectorAll('.cmp-table th[data-sort]').forEach(th => {
            th.onclick = () => {
                const col = th.dataset.sort;
                if (this.sortCol === col) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
                else { this.sortCol = col; this.sortDir = 'asc'; }
                document.querySelectorAll('.cmp-table th').forEach(h => h.setAttribute('aria-sort', 'none'));
                th.setAttribute('aria-sort', this.sortDir);
                this.drawTable();
            };
        });
    };

    C.getData = function () {
        let data = Object.values(window.SITE_DATA);
        if (this.filterBody !== 'all') data = data.filter(s => s.body.toLowerCase() === this.filterBody);
        return data.sort((a, b) => {
            let va = a[this.sortCol], vb = b[this.sortCol];
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            return this.sortDir === 'asc' ? va > vb : va < vb;
        });
    };

    C.drawTable = function () {
        const tbody = document.querySelector('#cmp-table tbody');
        if (!tbody) return;
        tbody.innerHTML = this.getData().map(s =>
            '<tr>' +
            '<td>' + s.name + '</td>' +
            '<td><span style="color:' + window.PLANET_COLORS[s.body] + '">' + s.body + '</span></td>' +
            '<td class="num">' + window.fmt(s.area) + '</td>' +
            '<td class="num">' + window.fmt(s.meanRough) + '</td>' +
            '<td class="num">' + window.fmt(s.p95Rough) + '</td>' +
            '<td class="num"><b>' + s.vsMoon + '%</b></td>' +
            '</tr>'
        ).join('');
    };

    C.drawCrossTable = function () {
        const tbody = document.querySelector('#cross-cmp-table tbody');
        if (!tbody) return;
        const sites = Object.values(window.SITE_DATA);
        const rows = [];
        for (let i = 0; i < sites.length; i++) {
            for (let j = i + 1; j < sites.length; j++) {
                const a = sites[i], b = sites[j];
                const sim = Math.max(0, 100 - Math.abs(a.meanRough - b.meanRough) * 10);
                rows.push({ a: a.name, ab: a.body, b: b.name, bb: b.body, sim: sim.toFixed(0) });
            }
        }
        tbody.innerHTML = rows.map(r =>
            '<tr>' +
            '<td>' + r.a + '</td><td><span style="color:' + window.PLANET_COLORS[r.ab] + '">' + r.ab + '</span></td>' +
            '<td>' + r.b + '</td><td><span style="color:' + window.PLANET_COLORS[r.bb] + '">' + r.bb + '</span></td>' +
            '<td class="num">' + r.sim + '%</td>' +
            '</tr>'
        ).join('');
    };

    C.drawChart = function () {
        const ctx = document.getElementById('cmp-chart');
        if (!ctx || !window.Chart) return;
        if (window.CmpChart) window.CmpChart.destroy();
        const data = this.getData().map(s => ({ site: s.name, sim: s.vsMoon }));
        window.CmpChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.site),
                datasets: [{
                    label: 'Moon Similarity %',
                    data: data.map(d => d.sim),
                    backgroundColor: data.map(d => window.PLANET_COLORS[window.SITE_DATA[d.site.split(' ')[0].toLowerCase()] ? window.SITE_DATA[d.site.split(' ')[0].toLowerCase()].body : 'Earth'])
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    };

    window.Comparator = C;
})();