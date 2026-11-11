/* API client: optional server-side refresh of bundled site metrics.
   Independent of every feature module; only talks to /api/sites. */
'use strict';

(function () {
    const SiteMetrics = {
        async load() {
            try {
                const response = await fetch('/api/sites');
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const payload = await response.json();
                if (!Array.isArray(payload.sites)) throw new Error('malformed payload');

                payload.sites.forEach(record => {
                    const site = window.SITE_DATA[record.id];
                    if (!site) return;
                    if (Number.isFinite(record.area_km2)) site.area = record.area_km2;
                    if (Number.isFinite(record.mean_rough_m)) site.meanRough = record.mean_rough_m;
                    if (Number.isFinite(record.p95_rough_m)) site.p95Rough = record.p95_rough_m;
                    if (Number.isFinite(record.max_rough_m)) site.maxRough = record.max_rough_m;
                });

                const set = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = value;
                };
                set('moon-area', window.fmt(window.SITE_DATA.moon.area));
                set('moon-rough', window.fmt(window.SITE_DATA.moon.meanRough));
                set('mars-area', window.fmt(window.SITE_DATA.jezero.area));
                set('mars-rough', window.fmt(window.SITE_DATA.jezero.meanRough));

                const refreshIfOpen = (id, fn) => {
                    const modal = document.getElementById('modal-' + id);
                    if (modal && modal.classList.contains('open')) fn();
                };
                if (window.MapViewer) refreshIfOpen('map', () => { window.MapViewer.renderSiteList(); window.MapViewer.updateSiteList(); });
                if (window.Selector) refreshIfOpen('selector', () => window.Selector.run());
                if (window.Calculator) refreshIfOpen('calculator', () => window.Calculator.updateChart());
                if (window.Comparator) refreshIfOpen('compare', () => window.Comparator.render());
            } catch (error) {
                console.warn('Using bundled site metrics: ' + error.message);
            }
        }
    };

    window.SiteMetrics = SiteMetrics;
})();