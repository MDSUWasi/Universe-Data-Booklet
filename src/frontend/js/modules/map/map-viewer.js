/* MapViewer: complete Leaflet atlas for Earth / Moon / Mars terrain sites +
   deep-space orbital view for Near-Earth Asteroids and Exoplanets.
   Classic script: registers window.MapViewer and window.fmt. */
'use strict';

(function () {
    // ---- Number formatter used by detail panels ----
    window.fmt = function (n, decimals) {
        if (n === null || n === undefined || !Number.isFinite(n)) return '—';
        return Number(n).toLocaleString(undefined, {
            minimumFractionDigits: decimals === undefined ? 2 : decimals,
            maximumFractionDigits: decimals === undefined ? 2 : decimals,
        });
    };

    const M = {
        map: null,
        layerGroup: null,
        markers: [],
        markerLayer: null,
        currentLayer: 'earth',
        hoverTooltip: null,
        activeMarker: null,
        tileLayer: null,
        scale: null,
        basemapIndex: 0,
        initialized: false,
        spaceMode: false,
        spaceCanvas: null,
        spaceCtx: null,
        spaceObjects: [],
    };

    // ---- Helpers ----
    function getSiteFromMarker(marker) {
        return marker && marker._udbSite || null;
    }

    function markerColor(body) {
        const colors = { Earth: '#4E8C6E', Moon: '#C9821A', Mars: '#F08080' };
        return colors[body] || '#ffffff';
    }

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ---- Initialisation ----
    M.init = function (layerName = 'earth') {
        if (this.initialized) {
            this.switchLayer(layerName);
            return;
        }
        const container = document.getElementById('map');
        if (!container) return;
        if (!window.L) {
            console.error('Leaflet not loaded');
            return;
        }

        this.map = L.map('map', {
            center: [10, 20], zoom: 2, minZoom: 1, zoomControl: true,
            attributionControl: true, doubleClickZoom: false,
            fadeAnimation: true, zoomAnimation: true, markerZoomAnimation: true,
            touchZoom: true, scrollWheelZoom: true,
        });

        this.map.on('dblclick', e => {
            if (this.spaceMode) return;
            const nearest = this.findNearestSite(e.latlng.lat, e.latlng.lng);
            if (nearest) this.focusOnSite(nearest.id);
        });
        this.map.on('mousemove', () => this.clearHoverTooltip());
        this.map.on('click', () => this.clearHoverTooltip());

        this.layerGroup = L.layerGroup().addTo(this.map);
        this.markerLayer = L.layerGroup();
        this.scale = L.control.scale({ position: 'bottomright', metric: true, imperial: false, maxLength: 100 });
        this.scale.addTo(this.map);

        this.buildMarkers();
        this.renderSiteList();
        this.switchLayer(layerName);
        this.updateSiteCount();

        document.querySelectorAll('.layer-btn').forEach(btn => {
            btn.onclick = () => this.switchLayer(btn.dataset.layer);
        });
        const fitBtn = document.getElementById('map-fit');
        if (fitBtn) fitBtn.onclick = () => this.fitAll();
        const baseBtn = document.getElementById('map-tiles');
        if (baseBtn) baseBtn.onclick = () => this.cycleBasemap();
        const retryBtn = document.getElementById('map-retry');
        if (retryBtn) retryBtn.onclick = () => this.retryTiles();
        const search = document.getElementById('map-search');
        if (search) {
            search.oninput = () => this.filterSiteList(search.value);
            search.onkeydown = (e) => { if (e.key === 'Escape') { search.value = ''; this.filterSiteList(''); } };
        }
        this.clearDetail();

        this.initialized = true;
    };

    // ---- Build markers from SITE_DATA ----
    M.buildMarkers = function () {
        this.markers = [];
        this.markerLayer.clearLayers();
        const data = window.SITE_DATA || {};
        Object.values(data).forEach(site => {
            if (!site || typeof site.lat !== 'number' || typeof site.lng !== 'number') return;
            const marker = L.marker([site.lat, site.lng], {
                title: site.name,
                riseOnHover: true,
                riseOffset: 300,
            });
            marker._udbSite = site;
            marker.bindPopup(
                '<strong>' + escapeHtml(site.name) + '</strong><br>' +
                escapeHtml(site.body) + ' \u2022 ' + escapeHtml(site.siteClass || '') + '<br>' +
                'Flat area: ' + window.fmt(site.area) + ' km\u00b2<br>' +
                'Mean rough: ' + window.fmt(site.meanRough) + ' m',
                { direction: 'top', offset: [0, -10], className: 'udb-popup' }
            );
            marker.on('click', () => this.focusOnSite(site.id));
            marker.on('mouseover', () => this.showHoverTooltip(site));
            marker.on('mouseout', () => this.clearHoverTooltip());
            this.markers.push(marker);
            this.markerLayer.addLayer(marker);
        });
    };

    // ---- Layer switching ----
    M.switchLayer = function (name) {
        if (name === 'space') {
            this.activateSpaceMode();
            return;
        }
        this.deactivateSpaceMode();
        this.currentLayer = name;
        document.querySelectorAll('.layer-btn').forEach(b => {
            const isActive = b.dataset.layer === name;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-pressed', isActive);
        });
        this.layerGroup.clearLayers();
        const bodyFilter = name === 'earth' ? 'Earth' : name === 'moon' ? 'Moon' : 'Mars';
        this.markers.forEach(m => {
            const site = getSiteFromMarker(m);
            if (site && site.body === bodyFilter) this.layerGroup.addLayer(m);
        });
        let url, attribution;
        if (name === 'moon') {
            url = window.trekLayers && window.trekLayers.moon ? window.trekLayers.moon.url : '';
            attribution = window.trekLayers && window.trekLayers.moon ? window.trekLayers.moon.attribution : '';
        } else if (name === 'mars') {
            url = window.trekLayers && window.trekLayers.mars ? window.trekLayers.mars.url : '';
            attribution = window.trekLayers && window.trekLayers.mars ? window.trekLayers.mars.attribution : '';
        } else {
            const bm = window.basemaps && window.basemaps[this.basemapIndex] ? window.basemaps[this.basemapIndex] : null;
            url = bm ? bm.url : '';
            attribution = bm ? bm.attribution : '';
        }
        try {
            if (this.tileLayer && this.map.hasLayer(this.tileLayer)) this.map.removeLayer(this.tileLayer);
            if (url) {
                this.tileLayer = L.tileLayer(url, {
                    attribution, maxZoom: 6, opacity: 0.9,
                    detectRetina: false,
                }).addTo(this.map);
                this.tileLayer.on('tileerror', () => {
                    this.showTileFallback();
                });
            } else {
                this.showTileFallback();
            }
        } catch (e) {
            console.error('Tile Load Error', e);
            this.showTileFallback();
        }
        this.map.addLayer(this.markerLayer);
        this.updateSiteCount();
    };

    // ---- Tile fallback when external Earth tiles fail ----
    M.showTileFallback = function () {
        const container = document.getElementById('map');
        if (!container) return;
        if (this.tileLayer && this.map.hasLayer(this.tileLayer)) {
            this.map.removeLayer(this.tileLayer);
        }
        // Add a solid colored fallback layer so the map is not blank
        const fallback = L.layerGroup();
        const rect = L.rectangle([[-90, -180], [90, 180]], {
            color: '#0a0f1a',
            weight: 0,
            fill: true,
            fillOpacity: 1,
            fillColor: '#0a0f1a',
        }).addTo(fallback);
        fallback.addTo(this.map);
        this._fallbackLayer = fallback;
        const hint = document.getElementById('map-status');
        if (hint) hint.textContent = 'Tiles unavailable \u2014 showing site markers only.';
        showToast ? showToast('Basemap tiles unavailable \u2014 markers still visible', 'warning', 3000) : null;
    };

    M.hideTileFallback = function () {
        if (this._fallbackLayer) {
            this.map.removeLayer(this._fallbackLayer);
            this._fallbackLayer = null;
        }
    };

    // ---- Basemap cycling (Earth only) ----
    M.cycleBasemap = function () {
        if (this.currentLayer !== 'earth') {
            this.switchLayer('earth');
            return;
        }
        const count = window.basemaps ? window.basemaps.length : 0;
        if (count === 0) return;
        this.basemapIndex = (this.basemapIndex + 1) % count;
        this.switchLayer('earth');
        const bm = window.basemaps[this.basemapIndex];
        if (bm) showToast ? showToast('Basemap: ' + bm.name, 'info', 2000) : null;
    };

    // ---- Tile retry ----
    M.retryTiles = function () {
        this.switchLayer(this.currentLayer);
        showToast ? showToast('Tiles refreshed', 'info', 1500) : null;
    };

    // ================= SPACE MODE (Asteroids + Exoplanets) =================

    M.activateSpaceMode = function () {
        this.spaceMode = true;
        const container = document.getElementById('map');
        if (!container) return;

        // Hide Leaflet controls and layers
        this.map.getContainer().style.display = 'none';

        // Create space canvas overlay
        if (!this.spaceCanvas) {
            this.spaceCanvas = document.createElement('canvas');
            this.spaceCanvas.id = 'map-space-canvas';
            this.spaceCanvas.style.position = 'absolute';
            this.spaceCanvas.style.top = '0';
            this.spaceCanvas.style.left = '0';
            this.spaceCanvas.style.width = '100%';
            this.spaceCanvas.style.height = '100%';
            this.spaceCanvas.style.zIndex = '1';
            this.spaceCanvas.style.background = '#02040a';
            container.appendChild(this.spaceCanvas);
            this.spaceCtx = this.spaceCanvas.getContext('2d');

            // Interaction
            this.spaceCanvas.addEventListener('click', e => this.onSpaceClick(e));
            this.spaceCanvas.addEventListener('mousemove', e => this.onSpaceMove(e));
            window.addEventListener('resize', () => this.resizeSpaceCanvas());
        }
        this.resizeSpaceCanvas();
        this.spaceCanvas.style.display = 'block';
        this.drawSpaceView();

        // Update UI: hide layer buttons, show space controls
        this.updateSpaceUI(true);
    };

    M.deactivateSpaceMode = function () {
        this.spaceMode = false;
        const container = document.getElementById('map');
        if (!container) return;
        this.map.getContainer().style.display = 'block';
        if (this.spaceCanvas) this.spaceCanvas.style.display = 'none';
        this.updateSpaceUI(false);
    };

    M.resizeSpaceCanvas = function () {
        if (!this.spaceCanvas) return;
        const dpr = window.devicePixelRatio || 1;
        const rect = this.spaceCanvas.parentElement.getBoundingClientRect();
        this.spaceCanvas.width = rect.width * dpr;
        this.spaceCanvas.height = rect.height * dpr;
        this.spaceCanvas.style.width = rect.width + 'px';
        this.spaceCanvas.style.height = rect.height + 'px';
        this.spaceCtx.scale(dpr, dpr);
        if (this.spaceMode) this.drawSpaceView();
    };

    // Build space objects from current data (asteroids or exoplanets)
    M.buildSpaceObjects = function () {
        const data = window.State ? window.State.currentData : [];
        const view = window.State ? window.State.currentView : 'asteroids';
        const objs = [];

        if (view === 'asteroids') {
            data.forEach((item, i) => {
                const dist = parseFloat(item.distance_au) || 1;
                const angle = (i / data.length) * Math.PI * 2;
                const hazard = item.hazardous === true || item.hazardous === 'true' || item.hazardous === 1;
                objs.push({
                    id: 'ast-' + i,
                    name: item.name || item.designation || 'Asteroid',
                    type: 'asteroid',
                    x: Math.cos(angle) * dist * 60,
                    y: Math.sin(angle) * dist * 60,
                    dist: dist,
                    diameter: parseFloat(item.diameter_km) || 0,
                    velocity: parseFloat(item.velocity_kmh) || 0,
                    hazardous: hazard,
                    date: item.date || '—',
                });
            });
            // Draw Sun at center and Earth orbit
            objs.unshift({
                id: 'sun', name: 'Sun', type: 'sun', x: 0, y: 0, dist: 0,
                diameter: 0, velocity: 0, hazardous: false, date: '—',
            });
            objs.push({
                id: 'earth-orbit', name: "Earth's Orbit", type: 'orbit', x: 0, y: 0, dist: 1,
                diameter: 0, velocity: 0, hazardous: false, date: '—',
            });
        } else {
            data.forEach((item, i) => {
                const dist = parseFloat(item.sy_dist) || 10;
                const esi = parseFloat(item.esi) || 0;
                const angle = (i / data.length) * Math.PI * 2;
                objs.push({
                    id: 'exo-' + i,
                    name: item.pl_name || 'Exoplanet',
                    type: 'exoplanet',
                    x: Math.cos(angle) * Math.log1p(dist) * 40,
                    y: Math.sin(angle) * Math.log1p(dist) * 40,
                    dist: dist,
                    esi: esi,
                    radius: parseFloat(item.pl_rade) || 0,
                    hostname: item.hostname || '—',
                    discovery: item.pl_disc || '—',
                });
            });
        }
        this.spaceObjects = objs;
    };

    M.drawSpaceView = function () {
        if (!this.spaceCtx || !this.spaceCanvas) return;
        const ctx = this.spaceCtx;
        const w = this.spaceCanvas.width / (window.devicePixelRatio || 1);
        const h = this.spaceCanvas.height / (window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#02040a';
        ctx.fillRect(0, 0, w, h);

        // Draw starfield
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 150; i++) {
            const sx = (Math.sin(i * 123.45) * w + w) % w;
            const sy = (Math.cos(i * 97.31) * h + h) % h;
            const sz = Math.random() * 1.2 + 0.3;
            const alpha = 0.3 + Math.random() * 0.7;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(sx, sy, sz, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        const cx = w / 2;
        const cy = h / 2;

        this.buildSpaceObjects();

        // Draw orbits and objects
        this.spaceObjects.forEach(obj => {
            if (obj.type === 'sun') {
                // Sun at center
                const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
                gradient.addColorStop(0, '#ffd700');
                gradient.addColorStop(0.4, '#ff8c00');
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(cx, cy, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px monospace';
                ctx.fillText(obj.name, cx - 12, cy - 20);
                return;
            }
            if (obj.type === 'orbit') {
                // Earth orbit ring (1 AU)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.arc(cx, cy, 60, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.font = '10px monospace';
                ctx.fillText('1 AU (Earth)', cx + 62, cy);
                return;
            }
            // Regular object (asteroid or exoplanet)
            const px = cx + obj.x;
            const py = cy + obj.y;

            // Orbit line from center
            if (obj.type === 'asteroid') {
                ctx.strokeStyle = obj.hazardous ? 'rgba(239, 68, 68, 0.3)' : 'rgba(6, 182, 212, 0.25)';
            } else {
                const esiCol = obj.esi > 0.7 ? '#22c55e' : obj.esi > 0.4 ? '#f4a261' : '#94a3b8';
                ctx.strokeStyle = esiCol + '40';
            }
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(px, py);
            ctx.stroke();

            // Object dot
            const size = obj.type === 'asteroid' ? (obj.hazardous ? 4 : 3) : 3;
            if (obj.type === 'asteroid') {
                ctx.fillStyle = obj.hazardous ? '#ef4444' : '#06b6d4';
            } else {
                const esiCol = obj.esi > 0.7 ? '#22c55e' : obj.esi > 0.4 ? '#f4a261' : '#94a3b8';
                ctx.fillStyle = esiCol;
            }
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();

            // Label on hover handled separately; draw small name for hazardous/high-ESI
            if ((obj.type === 'asteroid' && obj.hazardous) || (obj.type === 'exoplanet' && obj.esi > 0.6)) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '9px monospace';
                ctx.fillText(obj.name, px + 6, py + 3);
            }
        });
    };

    M.onSpaceClick = function (e) {
        if (!this.spaceCtx || !this.spaceCanvas) return;
        const rect = this.spaceCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        let hit = null;
        let bestDist = Infinity;
        this.spaceObjects.forEach(obj => {
            if (obj.type === 'sun' || obj.type === 'orbit') return;
            const px = cx + obj.x;
            const py = cy + obj.y;
            const d = Math.hypot(px - mx, py - my);
            if (d < 12 && d < bestDist) { bestDist = d; hit = obj; }
        });

        if (hit) {
            if (hit.type === 'asteroid') {
                this.renderSpaceDetail(hit);
            } else if (hit.type === 'exoplanet') {
                this.renderSpaceDetail(hit);
            }
        }
    };

    M.onSpaceMove = function (e) {
        // hover highlight handled simply
    };

    M.renderSpaceDetail = function (obj) {
        const panel = document.getElementById('map-detail');
        if (!panel) return;
        if (obj.type === 'asteroid') {
            panel.innerHTML =
                '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">' +
                '<div>' +
                '<h4 id="map-detail-name" style="font-family: var(--font-display); font-weight: 600; color: var(--color-space-50); margin: 0;">' + escapeHtml(obj.name) + '</h4>' +
                '<p id="map-detail-body" style="font-size: 0.75rem; color: var(--color-space-400); margin: 0.25rem 0 0 0;">Near-Earth Asteroid \u2022 ' + escapeHtml(obj.date) + '</p>' +
                '</div>' +
                '<button class="btn btn-ghost btn-sm" id="map-detail-close" style="padding: 0.25rem;">✕</button>' +
                '</div>' +
                '<div id="map-detail-metrics" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.75rem; margin-bottom: 0.75rem;">' +
                '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">Distance</div><div style="font-weight: 600; color: var(--color-space-100);">' + obj.dist.toFixed(2) + ' AU</div></div>' +
                '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">Diameter</div><div style="font-weight: 600; color: var(--color-space-100);">' + window.fmt(obj.diameter) + ' km</div></div>' +
                '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">Velocity</div><div style="font-weight: 600; color: var(--color-space-100);">' + window.fmt(obj.velocity) + ' km/h</div></div>' +
                '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">Hazard</div><div style="font-weight: 600; color: ' + (obj.hazardous ? 'var(--color-danger-400)' : 'var(--color-success-400)') + ';">' + (obj.hazardous ? 'HAZARDOUS' : 'Safe') + '</div></div>' +
                '</div>' +
                '<div class="map-detail-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">' +
                '<button class="btn btn-sm btn-secondary" type="button" onclick="window.openModal ? window.openModal(\'compare\')">\ud83c\udfea Compare</button>' +
                '</div>';
        } else {
            panel.innerHTML =
                '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">' +
                '<div>' +
                '<h4 id="map-detail-name" style="font-family: var(--font-display); font-weight: 600; color: var(--color-space-50); margin: 0;">' + escapeHtml(obj.name) + '</h4>' +
                '<p id="map-detail-body" style="font-size: 0.75rem; color: var(--color-space-400); margin: 0.25rem 0 0 0;">Exoplanet \u2022 Host: ' + escapeHtml(obj.hostname) + '</p>' +
                '</div>' +
                '<button class="btn btn-ghost btn-sm" id="map-detail-close" style="padding: 0.25rem;">✕</button>' +
                '</div>' +
                '<div id="map-detail-metrics" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.75rem; margin-bottom: 0.75rem;">' +
                '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">Distance</div><div style="font-weight: 600; color: var(--color-space-100);">' + obj.dist.toFixed(1) + ' ly</div></div>' +
                '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">ESI</div><div style="font-weight: 600; color: var(--color-space-100);">' + obj.esi.toFixed(3) + '</div></div>' +
                '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">Radius</div><div style="font-weight: 600; color: var(--color-space-100);">' + window.fmt(obj.radius) + ' R\u2295</div></div>' +
                '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">Discovery</div><div style="font-weight: 600; color: var(--color-space-100);">' + escapeHtml(obj.discovery) + '</div></div>' +
                '</div>' +
                '<div class="map-detail-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">' +
                '<button class="btn btn-sm btn-secondary" type="button" onclick="window.openModal ? window.openModal(\'compare\')">\ud83c\udfea Compare</button>' +
                '</div>';
        }
        panel.style.transform = 'translateY(0)';
        panel.style.opacity = '1';
        document.getElementById('map-detail-close')?.addEventListener('click', () => this.clearDetail(), { once: true });
    };

    M.updateSpaceUI = function (show) {
        const layerBtns = document.querySelectorAll('.layer-btn');
        const fitBtn = document.getElementById('map-fit');
        const baseBtn = document.getElementById('map-tiles');
        const search = document.getElementById('map-search');
        const listWrap = document.getElementById('map-sites-list')?.parentElement;

        if (show) {
            layerBtns.forEach(b => b.style.display = 'none');
            fitBtn?.style.setProperty('display', 'none', 'important');
            baseBtn?.style.setProperty('display', 'none', 'important');
            search?.style.setProperty('display', 'none', 'important');
            listWrap?.style.setProperty('display', 'none', 'important');
            // Add space toggle button if not present
            if (!document.getElementById('map-space-toggle')) {
                const btn = document.createElement('button');
                btn.id = 'map-space-toggle';
                btn.className = 'btn btn-sm btn-secondary';
                btn.textContent = '\ud83d\udcab Planetary Map';
                btn.onclick = () => this.switchLayer('earth');
                const parent = document.getElementById('map')?.parentElement;
                // insert near top of map container controls
                const controls = document.querySelector('#modal-map .modal-body > div > div:nth-child(2)');
                if (controls) controls.insertBefore(btn, controls.firstChild);
            }
        } else {
            layerBtns.forEach(b => b.style.display = '');
            fitBtn?.style.removeProperty('display');
            baseBtn?.style.removeProperty('display');
            search?.style.removeProperty('display');
            listWrap?.style.removeProperty('display');
            const btn = document.getElementById('map-space-toggle');
            if (btn) btn.remove();
        }
    };

    // ---- Fit all visible markers ----
    M.fitAll = function () {
        const visible = this.markers.filter(m => {
            const site = getSiteFromMarker(m);
            return site && site.body === (this.currentLayer === 'earth' ? 'Earth' : this.currentLayer === 'moon' ? 'Moon' : 'Mars');
        });
        if (visible.length === 0) return;
        const group = L.featureGroup(visible.map(m => m));
        this.map.fitBounds(group.getBounds().pad(0.15), { maxZoom: 5 });
    };

    // ---- Find nearest site to a lat/lng ----
    M.findNearestSite = function (lat, lng) {
        let nearest = null;
        let bestDist = Infinity;
        const bodyFilter = this.currentLayer === 'earth' ? 'Earth' : this.currentLayer === 'moon' ? 'Moon' : 'Mars';
        this.markers.forEach(m => {
            const site = getSiteFromMarker(m);
            if (!site || site.body !== bodyFilter) return;
            const d = Math.hypot(site.lat - lat, site.lng - lng);
            if (d < bestDist) { bestDist = d; nearest = site; }
        });
        return nearest;
    };

    // ---- Focus on a site (pan map + show detail) ----
    M.focusOnSite = function (id) {
        const site = window.SITE_DATA && window.SITE_DATA[id] ? window.SITE_DATA[id] : null;
        if (!site) return;
        this.map.setView([site.lat, site.lng], 4, { animate: true, duration: 1 });
        this.markers.forEach(m => {
            const s = getSiteFromMarker(m);
            if (s && s.id === id) m.openPopup();
        });
        this.renderDetail(site);
    };

    // ---- Site list rendering ----
    M.renderSiteList = function () {
        this.filterSiteList(document.getElementById('map-search') ? document.getElementById('map-search').value : '');
    };

    M.filterSiteList = function (query) {
        const container = document.getElementById('map-sites-list');
        if (!container) return;
        const q = (query || '').toLowerCase().trim();
        const bodyFilter = this.currentLayer === 'earth' ? 'Earth' : this.currentLayer === 'moon' ? 'Moon' : 'Mars';
        const data = window.SITE_DATA || {};
        const sites = Object.values(data).filter(s => {
            if (!s || s.body !== bodyFilter) return false;
            if (!q) return true;
            const haystack = (s.name + ' ' + s.region + ' ' + s.body + ' ' + s.siteClass).toLowerCase();
            return haystack.indexOf(q) >= 0;
        }).sort((a, b) => a.name.localeCompare(b.name));

        if (sites.length === 0) {
            container.innerHTML = '<div style="color: var(--color-space-500); font-size: 0.75rem; padding: 1rem;">No matching sites.</div>';
            this.updateSiteCount();
            return;
        }

        container.innerHTML = sites.map(site => {
            const active = this.activeMarker && this.activeMarker._udbSite && this.activeMarker._udbSite.id === site.id ? ' active' : '';
            return '<div class="map-site-item' + active + '" style="padding: 0.6rem 0.75rem; border-radius: var(--radius-md); cursor: pointer; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.04); background: ' + (active ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.02)') + '; color: var(--color-space-100);" onclick="MapViewer.focusOnSite(\'' + escapeHtml(site.id) + '\')">' +
                '<div style="font-weight: 600; color: var(--color-space-50);">' + escapeHtml(site.name) + '</div>' +
                '<div style="font-size: 0.65rem; color: var(--color-space-500);">' + escapeHtml(site.region) + ' \u2022 ' + escapeHtml(site.body) + '</div>' +
                '</div>';
        }).join('');

        this.updateSiteCount();
    };

    // ---- Site count ----
    M.updateSiteCount = function () {
        const list = document.getElementById('map-sites-list');
        const bodyFilter = this.currentLayer === 'earth' ? 'Earth' : this.currentLayer === 'moon' ? 'Moon' : 'Mars';
        const data = window.SITE_DATA || {};
        const count = Object.values(data).filter(s => s && s.body === bodyFilter).length;
        const h4 = list ? list.parentElement && list.parentElement.querySelector('h4') : null;
        if (h4) h4.textContent = count + ' site' + (count !== 1 ? 's' : '') + ' \u2022 ' + bodyFilter;
    };

    // ---- Detail panel ----
    M.renderDetail = function (site) {
        const panel = document.getElementById('map-detail');
        if (!panel) return;
        const body = window.PLANET_COLORS && window.PLANET_COLORS[site.body] ? window.PLANET_COLORS[site.body] : '#ffffff';
        panel.innerHTML =
            '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">' +
            '<div>' +
            '<h4 id="map-detail-name" style="font-family: var(--font-display); font-weight: 600; color: var(--color-space-50); margin: 0;">' + escapeHtml(site.name) + '</h4>' +
            '<p id="map-detail-body" style="font-size: 0.75rem; color: var(--color-space-400); margin: 0.25rem 0 0 0;">' + escapeHtml(site.body) + ' \u2022 ' + escapeHtml(site.siteClass || '') + ' \u2022 ' + escapeHtml(site.region || '') + '</p>' +
            '</div>' +
            '<button class="btn btn-ghost btn-sm" id="map-detail-close" style="padding: 0.25rem;">✕</button>' +
            '</div>' +
            '<div id="map-detail-metrics" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.75rem; margin-bottom: 0.75rem;">' +
            '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">Flat area</div><div style="font-weight: 600; color: var(--color-space-100);">' + window.fmt(site.area) + ' km\u00b2</div></div>' +
            '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">Mean rough</div><div style="font-weight: 600; color: var(--color-space-100);">' + window.fmt(site.meanRough) + ' m</div></div>' +
            '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">p95 rough</div><div style="font-weight: 600; color: var(--color-space-100);">' + window.fmt(site.p95Rough || site.p95_rough_m) + ' m</div></div>' +
            '<div style="border: 1px solid rgba(255,255,255,0.06); border-radius: var(--radius-sm); padding: 0.5rem; background: rgba(255,255,255,0.02);"><div style="font-size: 0.65rem; color: var(--color-space-500); text-transform: uppercase;">Site class</div><div style="font-weight: 600; color: var(--color-space-100);">' + escapeHtml(site.siteClass || '') + '</div></div>' +
            '</div>' +
            '<p class="map-detail-desc" style="font-size: 0.75rem; color: var(--color-space-300); margin: 0 0 0.75rem 0; line-height: 1.5;">' + escapeHtml(site.description || '') + '</p>' +
            '<div class="map-detail-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">' +
            '<button class="btn btn-sm btn-secondary" type="button" onclick="MapViewer.focusOnSite(\'' + escapeHtml(site.id) + '\')">\ud83d\uddfa Focus</button>' +
            '<button class="btn btn-sm btn-secondary" type="button" onclick="window.openModal ? window.openModal(\'compare\') : null">\ud83c\udfea Compare</button>' +
            '<button class="btn btn-sm btn-secondary" type="button" onclick="MapViewer.openTerrainFor(\'' + escapeHtml(site.id) + '\')">\u26f0\ufe0f 3D Terrain</button>' +
            '</div>';
        panel.style.transform = 'translateY(0)';
        panel.style.opacity = '1';
        document.getElementById('map-detail-close')?.addEventListener('click', () => this.clearDetail(), { once: true });
    };

    M.clearDetail = function () {
        const el = document.getElementById('map-detail');
        if (el) {
            el.innerHTML = '<div style="padding: 1rem; color: var(--color-space-500); text-align: center; font-size: 0.75rem;">Select a site or map marker to view its terrain metrics.</div>';
            el.style.transform = 'translateY(100%)';
            el.style.opacity = '0';
        }
        this.activeMarker = null;
        this.filterSiteList(document.getElementById('map-search') ? document.getElementById('map-search').value : '');
    };

    M.openTerrainFor = function (siteId) {
        const site = window.SITE_DATA && window.SITE_DATA[siteId] ? window.SITE_DATA[siteId] : null;
        if (!site) return;
        if (window.openModal) window.openModal('terrain');
        if (window.TerrainLab) {
            const bodySelect = document.getElementById('terrain-body');
            if (bodySelect) {
                bodySelect.value = site.body;
                if (typeof window.TerrainLab.populateSites === 'function') window.TerrainLab.populateSites(site.body);
            }
            const siteSelect = document.getElementById('terrain-site');
            if (siteSelect) {
                siteSelect.value = siteId;
                if (typeof window.TerrainLab.loadSelectedSite === 'function') window.TerrainLab.loadSelectedSite();
            }
        }
    };

    // ---- Hover tooltip ----
    M.showHoverTooltip = function (site) {
        if (this.hoverTooltip) this.map.removeLayer(this.hoverTooltip);
        this.hoverTooltip = L.tooltip({ permanent: false, offset: [0, 10], direction: 'top', opacity: 0.9 })
            .setContent('<strong>' + escapeHtml(site.name) + '</strong><br>' + escapeHtml(site.body) + ' \u2022 ' + escapeHtml(site.siteClass || ''))
            .setLatLng([site.lat, site.lng]);
        this.map.openTooltip(this.hoverTooltip);
    };

    M.clearHoverTooltip = function () {
        if (this.hoverTooltip) {
            this.map.closeTooltip(this.hoverTooltip);
            this.map.removeLayer(this.hoverTooltip);
            this.hoverTooltip = null;
        }
    };

    // ---- Open / close ----
    M.open = function () {
        if (!this.initialized) this.init();
        if (this.map) this.map.invalidateSize();
        this.filterSiteList(document.getElementById('map-search') ? document.getElementById('map-search').value : '');
    };

    M.close = function () { /* handled by modal close */ };

    window.MapViewer = M;

})();
