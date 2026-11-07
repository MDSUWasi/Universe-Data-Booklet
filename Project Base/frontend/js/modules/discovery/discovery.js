/* Discovery Lab: samples a 3x3 elevation grid via the server proxy and
   computes local slope/relief in the browser. Independent of the map and
   comparison modules; only depends on core (Cache, SITE_DATA, fmt). */
'use strict';

(function () {
    const D = {
        _live: {},

        async analyze(lat, lng) {
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -85 || lat > 85 || lng < -180 || lng > 180) {
                this.renderError('Enter a valid Earth coordinate.');
                return null;
            }

            lat = window.Cache.round(lat, 4);
            lng = window.Cache.round(lng, 4);
            const cached = window.Cache.lookup(lat, lng);
            if (cached) {
                window.Cache.recordHit();
                window.Toast.show('Cache hit - returning cached metrics');
                this.render(cached.data);
                return cached.data;
            }

            const key = lat + ',' + lng;
            if (this._live[key]) return this._live[key];

            // Coarse grid sampling (approx 278m per step)
            const latStep = 278 / 111320;
            const lngStep = latStep / Math.max(Math.cos(lat * Math.PI / 180), 0.087);
            const coords = [];
            for (const row of [-1, 0, 1]) {
                for (const col of [-1, 0, 1]) {
                    coords.push([lat + row * latStep, lng + col * lngStep]);
                }
            }

            const request = (async () => {
                window.Cache.incrementMiss();
                const grid = await this.fetchGrid(coords);
                const metrics = this.computeMetrics(grid);
                const result = { lat, lng, grid, metrics };
                window.Cache.set(lat, lng, result);
                this.render(result);
                return result;
            })();

            this._live[key] = request;
            window.Cache.updateStats();
            try {
                return await request;
            } catch (error) {
                this.renderError('Terrain data unavailable. Check connection.');
                window.Toast.show('Elevation lookup failed');
                return null;
            } finally {
                delete this._live[key];
                window.Cache.updateStats();
            }
        },

        async fetchGrid(coords) {
            const lats = coords.map(c => c[0]).join(',');
            const lngs = coords.map(c => c[1]).join(',');
            const params = new URLSearchParams({ latitude: lats, longitude: lngs });
            // Routed through the server proxy (/api/elevation) so caching,
            // validation and TTL policy live in one place.
            const res = await fetch('/api/elevation?' + params.toString());
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const json = await res.json();
            if (!Array.isArray(json.elevation) || json.elevation.length !== 9) {
                throw new Error('Invalid grid shape from API');
            }
            return json.elevation;
        },

        computeMetrics(grid) {
            const relief = [];
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 2; col++) {
                    const w = [
                        grid[row * 3 + col], grid[row * 3 + col + 1],
                        grid[(row + 1) * 3 + col], grid[(row + 1) * 3 + col + 1]
                    ];
                    relief.push(Math.max(...w) - Math.min(...w));
                }
            }
            const gradX = (grid[5] - grid[3]) / (2 * 278);
            const gradY = (grid[7] - grid[1]) / (2 * 278);
            const sortedRelief = [...relief].sort((a, b) => a - b);
            return {
                slope: Math.atan(Math.hypot(gradX, gradY)) * 180 / Math.PI,
                meanRelief: relief.reduce((a, b) => a + b, 0) / relief.length,
                p95Relief: sortedRelief[Math.ceil(sortedRelief.length * 0.95) - 1],
                range: Math.max(...grid) - Math.min(...grid)
            };
        },

        render(result) {
            const el = document.getElementById('disc-result');
            const passes = result.metrics.slope <= 3;
            const cls = passes ? 'good' : 'warn';
            const txt = passes ? 'Within 3\u00b0 slope screen' : 'Above 3\u00b0 slope screen';

            el.innerHTML =
                '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;">' +
                '<span class="score-big">' + result.metrics.slope.toFixed(1) + '\u00b0</span>' +
                '<span class="verdict ' + cls + '">' + txt + '</span>' +
                '</div>' +
                '<div><b>Mean local relief:</b> ' + result.metrics.meanRelief.toFixed(2) + ' m</div>' +
                '<div><b>p95 local relief:</b> ' + result.metrics.p95Relief.toFixed(2) + ' m</div>' +
                '<div><b>Elevation range:</b> ' + result.metrics.range.toFixed(1) + ' m</div>' +
                '<div class="disc-grid">' + result.grid.map((e, i) =>
                    '<div class="disc-cell">' + (Number.isFinite(e) ? e.toFixed(1) : '-') + '</div>'
                ).join('') + '</div>' +
                '<div style="margin-top:10px;font-size:0.78rem;color:var(--text-muted)">Grid: 3\u00d73 at ~278 m spacing. Not a direct analog score.</div>';
        },

        renderError(msg) {
            const el = document.getElementById('disc-result');
            if (el) el.textContent = msg;
        },

        random() {
            const earths = Object.values(window.SITE_DATA).filter(s => s.body === 'Earth');
            const pick = earths[Math.floor(Math.random() * earths.length)];
            document.getElementById('disc-lat').value = pick.lat;
            document.getElementById('disc-lng').value = pick.lng;
            this.analyze(pick.lat, pick.lng);
        },

        renderCacheStats() { window.Cache.updateStats(); }
    };

    window.Discovery = D;
})();