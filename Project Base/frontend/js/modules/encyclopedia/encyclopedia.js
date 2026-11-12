/* Encyclopedia: browse planets, moons, and diverse terrain candidate sites
   across the Solar System. Not tied to any single landing base — every body
   lists multiple regions. Data comes from /api/encyclopedia/* (static) and the
   real-time endpoints are handled by the Realtime module.
   Classic script: registers window.Encyclopedia. */
'use strict';

(function () {
    const E = {
        _planets: [],
        _moons: [],
        _sites: [],
        _activeTab: 'planets',

        async load(initialTab) {
            if (initialTab) this._activeTab = initialTab;
            try {
                const res = await fetch('/api/encyclopedia');
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                this._planets = data.planets || [];
                this._moons = data.moons || [];
                this._sites = data.sites || [];
            } catch (error) {
                console.error('Encyclopedia load failed', error);
                this.renderError('Encyclopedia data unavailable.');
            }
        },

        render() {
            const panel = document.getElementById('encyclopedia-content');
            if (!panel) return;
            panel.innerHTML = this._tabs() + this._tabContent();
            this._bindTabs();
        },

        _tabs() {
            return `
              <div class="encyclopedia-tabs" role="tablist" aria-label="Browse by category">
                <button class="tab-btn${this._activeTab === 'planets' ? ' active' : ''}" type="button" data-tab="planets" role="tab">Planets</button>
                <button class="tab-btn${this._activeTab === 'moons' ? ' active' : ''}" type="button" data-tab="moons" role="tab">Moons</button>
                <button class="tab-btn${this._activeTab === 'sites' ? ' active' : ''}" type="button" data-tab="sites" role="tab">Terrain Sites</button>
              </div>
            `;
        },

        _tabContent() {
            if (this._activeTab === 'planets') return this._planetsList();
            if (this._activeTab === 'moons') return this._moonsList();
            return this._sitesList();
        },

        _bindTabs() {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.tab-btn').forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-pressed', 'false');
                    });
                    btn.classList.add('active');
                    btn.setAttribute('aria-pressed', 'true');
                    this._activeTab = btn.dataset.tab;
                    const content = document.getElementById('encyclopedia-tab-content');
                    if (content) content.innerHTML = this._tabContent();
                };
            });
        },

        /* ---------------- Planets ---------------- */

        _planetsList() {
            const items = this._planets.map(p => this._planetCard(p)).join('');
            return `<div id="encyclopedia-tab-content" class="encyclopedia-grid">${items}</div>`;
        },

        _planetCard(p) {
            const phys = p.physical || {};
            const imgHtml = p.image
                ? `<div class="ency-card-image"><img src="../assets/encyclopedia/${p.image}" alt="${p.name}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
                : '';
            const warnHtml = p.image_warning
                ? `<div class="ency-card-warning" role="alert">⚠️ ${p.image_warning}</div>`
                : '';
            return `
              <article class="ency-card planet-card" style="border-color:${p.color}">
                <div class="ency-card-head">
                  <span class="ency-symbol" style="font-size:2rem">${p.symbol}</span>
                  <span class="ency-name">${p.name}</span>
                </div>
                ${imgHtml}
                ${warnHtml}
                <div class="ency-type">${p.type}</div>
                <p class="ency-desc">${p.description}</p>
                <table class="ency-table">
                  <tr><td>Mean diameter</td><td>${phys.mean_diameter_km !== undefined ? phys.mean_diameter_km + ' km' : '—'}</td></tr>
                  <tr><td>Surface gravity</td><td>${phys.surface_gravity_ms2 !== undefined ? phys.surface_gravity_ms2 + ' m/s²' : '—'}</td></tr>
                  <tr><td>Distance from Sun</td><td>${phys.mean_distance_sun_au !== undefined ? phys.mean_distance_sun_au + ' AU' : phys.mean_distance_earth_km !== undefined ? phys.mean_distance_earth_km + ' km' : '—'}</td></tr>
                  <tr><td>Orbital period</td><td>${phys.orbital_period_days !== undefined ? phys.orbital_period_days + ' days' : phys.orbital_period_years !== undefined ? phys.orbital_period_years + ' years' : '—'}</td></tr>
                  <tr><td>Rotation period</td><td>${phys.rotation_period_hours !== undefined ? phys.rotation_period_hours + ' hours' : phys.rotation_period_days !== undefined ? phys.rotation_period_days + ' days' : '—'}</td></tr>
                  <tr><td>Surface temperature</td><td>${phys.surface_temp_c !== undefined ? phys.surface_temp_c : '—'}</td></tr>
                  <tr><td>Atmosphere</td><td>${phys.atmosphere !== undefined ? phys.atmosphere : '—'}</td></tr>
                  <tr><td>Natural satellites</td><td>${phys.natural_satellites !== undefined ? phys.natural_satellites : '—'}</td></tr>
                </table>
                <div class="ency-footer">Encyclopedia entry · Data: NASA / USGS / ESA (public domain & open data) · Image: ${p.image_attribution || 'Wikimedia Commons'}</div>
              </article>
            `;
        },

        /* ---------------- Moons ---------------- */

        _moonsList() {
            const items = this._moons.map(m => this._moonCard(m)).join('');
            return `<div id="encyclopedia-tab-content" class="encyclopedia-grid">${items}</div>`;
        },

        _moonCard(m) {
            const phys = m.physical || {};
            const imgHtml = m.image
                ? `<div class="ency-card-image"><img src="../assets/encyclopedia/${m.image}" alt="${m.name}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
                : '';
            return `
              <article class="ency-card moon-card" style="border-color:${m.color}">
                <div class="ency-card-head">
                  <span class="ency-symbol" style="font-size:2rem">${m.symbol}</span>
                  <span class="ency-name">${m.name} <span style="font-size:0.85rem;opacity:0.7">of ${m.parent}</span></span>
                </div>
                ${imgHtml}
                <div class="ency-type">${m.type}</div>
                <p class="ency-desc">${m.description}</p>
                <table class="ency-table">
                  <tr><td>Mean diameter</td><td>${phys.mean_diameter_km !== undefined ? phys.mean_diameter_km + ' km' : '—'}</td></tr>
                  <tr><td>Surface gravity</td><td>${phys.surface_gravity_ms2 !== undefined ? phys.surface_gravity_ms2 + ' m/s²' : '—'}</td></tr>
                  <tr><td>Orbit distance</td><td>${phys.orbit_km !== undefined ? phys.orbit_km : '—'}</td></tr>
                  <tr><td>Orbital period</td><td>${phys.orbital_period_hours !== undefined ? phys.orbital_period_hours + ' hours' : '—'}</td></tr>
                  <tr><td>Mean density</td><td>${phys.mean_density_g_cm3 !== undefined ? phys.mean_density_g_cm3 + ' g/cm³' : '—'}</td></tr>
                  <tr><td>Albedo</td><td>${phys.albedo !== undefined ? phys.albedo : '—'}</td></tr>
                  <tr><td>Shape</td><td>${phys.shape !== undefined ? phys.shape : '—'}</td></tr>
                </table>
                <div class="ency-footer">Encyclopedia entry · Data: NASA / USGS (public domain) · Image: ${m.image_attribution || 'Wikimedia Commons'}</div>
              </article>
            `;
        },

        /* ---------------- Sites ---------------- */

        _sitesList() {
            const byBody = {};
            for (const s of this._sites) {
                (byBody[s.body] = byBody[s.body] || []).push(s);
            }
            const sections = Object.entries(byBody).map(([body, sites]) => {
                const color = window.PLANET_COLORS && window.PLANET_COLORS[body] ? window.PLANET_COLORS[body] : '#888';
                const items = sites.map(s => this._siteCard(s, color)).join('');
                return `
                  <section class="ency-section">
                    <h3 style="color:${color}">${body} <span style="font-size:0.8rem;opacity:0.7">(${sites.length} sites)</span></h3>
                    <div class="encyclopedia-grid">${items}</div>
                  </section>
                `;
            }).join('');
            return `<div id="encyclopedia-tab-content" class="encyclopedia-sites">${sections}</div>`;
        },

        _siteCard(s, color) {
            return `
              <article class="ency-card site-card" style="border-color:${color}">
                <div class="ency-card-head">
                  <span class="ency-symbol" style="font-size:1.5rem">${s.body === 'Earth' ? '🌍' : s.body === 'Moon' ? '🌙' : '🔴'}</span>
                  <span class="ency-name">${s.name}</span>
                </div>
                <div class="ency-type">${s.region}</div>
                <p class="ency-desc">${s.description}</p>
                <table class="ency-table">
                  <tr><td>Flat area</td><td>${s.area_km2 !== undefined ? s.area_km2.toFixed(3) + ' km²' : '—'}</td></tr>
                  <tr><td>Mean roughness</td><td>${s.mean_rough_m !== undefined ? s.mean_rough_m.toFixed(3) + ' m' : '—'}</td></tr>
                  <tr><td>p95 roughness</td><td>${s.p95_rough_m !== undefined ? s.p95_rough_m.toFixed(3) + ' m' : '—'}</td></tr>
                  <tr><td>Similarity</td><td>${s.similarity_pct !== undefined ? s.similarity_pct + '%' : '—'}</td></tr>
                  <tr><td>Site class</td><td>${s.siteClass}</td></tr>
                  ${s.has_weather !== false ? '<tr><td>Live weather</td><td>Available via Open-Meteo</td></tr>' : ''}
                </table>
                <div class="ency-footer">Terrain data: Copernicus / LRO / MRO CTX (NASA / USGS / ESA)</div>
              </article>
            `;
        },

        renderError(msg) {
            const panel = document.getElementById('encyclopedia-content');
            if (panel) panel.innerHTML = `<p style="color:var(--bad);padding:16px">${msg}</p>`;
        },
    };

    window.Encyclopedia = E;
})();
