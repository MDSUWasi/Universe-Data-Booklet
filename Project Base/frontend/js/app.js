/**
 * Planetary Analog Explorer — app.js
 * 
 * COMPLETE VERSION
 * Includes: Site Data, Cache, Discovery (API), Sidebar, UI, Starfield, Map, 
 * Selectors, Calculators, Planner, Comparator, and Toast Notifications.
 */
'use strict';

/* ============================== GLOBAL DATA ============================== */

const SITE_DATA = {
    moon: {
        id: 'moon', name: 'Lunar South Pole (Shackleton)', lat: -89.9, lng: 0.0,
        body: 'Moon', area: 3.875, meanRough: 2.462, p95Rough: 4.138, maxRough: 5.22,
        slopeDiscipline: 0.92, vsMoon: 100, analogy: 'baseline', color: '#C9821A',
        description: 'Target landing zone near Shackleton Crater rim — permanent sunlight peaks with permanently shadowed craters nearby.',
        hasWeather: false
    },
    mcmurdo: {
        id: 'mcmurdo', name: 'McMurdo Dry Valleys', lat: -77.6, lng: 162.2,
        body: 'Earth', area: 250.242, meanRough: 2.294, p95Rough: 3.865, maxRough: 4.8,
        slopeDiscipline: 0.93, vsMoon: 93, analogy: 'strong analog', color: '#4E8C6E',
        description: 'Extreme polar desert, minimal biology, permafrost — the most studied Mars analog on Earth.',
        hasWeather: true
    },
    axel: {
        id: 'axel', name: 'Axel Heiberg Island', lat: 79.4, lng: -90.0,
        body: 'Earth', area: 81.175, meanRough: 2.232, p95Rough: 3.611, maxRough: 4.5,
        slopeDiscipline: 0.91, vsMoon: 91, analogy: 'strong analog', color: '#2E7D9A',
        description: 'Canadian Arctic, freeze-thaw cycles, exposed bedrock — an accessible northern polar analog.',
        hasWeather: true
    },
    kerguelen: {
        id: 'kerguelen', name: 'Kerguelen Islands', lat: -49.35, lng: 69.35,
        body: 'Earth', area: 1.241, meanRough: 1.352, p95Rough: 3.946, maxRough: 6.0,
        slopeDiscipline: 0.55, vsMoon: 55, analogy: 'weak analog', color: '#E07A5F',
        description: 'Volcanic basalt highlands, isolated oceanic — tests the "unexpected analog" hypothesis.',
        hasWeather: true
    },
    jezero: {
        id: 'jezero', name: 'Jezero Crater', lat: 18.4, lng: 77.6,
        body: 'Mars', area: 506.277, meanRough: 2.110, p95Rough: 3.744, maxRough: 5.1,
        slopeDiscipline: 0.86, vsMoon: 86, analogy: 'reference (Mars)', color: '#F08080',
        description: 'Perseverance rover site — ancient delta fan and lakebed — a benchmark for Martian terrain.',
        hasWeather: false
    }
};

const PLANET_COLORS = { Earth: '#4E8C6E', Moon: '#C9821A', Mars: '#F08080' };

const SITES = () => Object.values(SITE_DATA);
const fmt = (n, d = 3) => (Number.isFinite(n) ? n.toFixed(d) : '—');

/* ========================= OPTIONAL API REFRESH ========================= */

const SiteMetrics = {
    async load() {
        try {
            const response = await fetch('/api/sites');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const payload = await response.json();
            if (!Array.isArray(payload.sites)) throw new Error('malformed payload');

            payload.sites.forEach(record => {
                const site = SITE_DATA[record.id];
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
            set('moon-area', fmt(SITE_DATA.moon.area));
            set('moon-rough', fmt(SITE_DATA.moon.meanRough));
            set('mars-area', fmt(SITE_DATA.jezero.area));
            set('mars-rough', fmt(SITE_DATA.jezero.meanRough));

            const refreshIfOpen = (id, fn) => {
                if (document.getElementById(`modal-${id}`)?.classList.contains('open')) fn();
            };
            refreshIfOpen('map', () => { MapViewer.renderSiteList(); MapViewer.updateSiteList(); });
            refreshIfOpen('selector', () => Selector.run());
            refreshIfOpen('calculator', () => Calculator.updateChart());
            refreshIfOpen('compare', () => Comparator.render());
        } catch (error) {
            console.warn(`Using bundled site metrics: ${error.message}`);
        }
    }
};

/* ============================== CACHE ============================== */

const Cache = {
    _store: {},
    KEY: 'analog_cache_v1',
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
    maxEntries: 300,

    _read(key, fallback = '') {
        try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
    },
    _write(key, value) {
        try { localStorage.setItem(key, value); } catch { /* storage disabled or full */ }
    },
    round(v, d) { return Math.round(v * 10 ** d) / 10 ** d; },

    init() {
        try {
            const saved = JSON.parse(this._read(this.KEY, '{}'));
            const cutoff = Date.now() - this.maxAgeMs;
            this._store = Object.fromEntries(
                Object.entries(saved).filter(([, e]) => e && e.ts > cutoff && e.data)
            );
        } catch {
            this._store = {};
        }
        this.updateStats();
    },

    lookup(lat, lng) {
        const key = `${this.round(lat, 4)},${this.round(lng, 4)}`;
        const entry = this._store[key];
        if (!entry) return null;
        if (Date.now() - entry.ts > this.maxAgeMs) {
            delete this._store[key];
            return null;
        }
        return entry;
    },

    set(lat, lng, result) {
        const key = `${this.round(lat, 4)},${this.round(lng, 4)}`;
        this._store[key] = { ts: Date.now(), data: result };
        this._store = Object.fromEntries(
            Object.entries(this._store).sort((a, b) => b[1].ts - a[1].ts).slice(0, this.maxEntries)
        );
        this._write(this.KEY, JSON.stringify(this._store));
        this.updateStats();
    },

    clear() {
        this._store = {};
        this._write(this.KEY, '{}');
        this._write('analog_hits', '0');
        this._write('analog_misses', '0');
        this.updateStats();
    },

    recordHit() {
        this._write('analog_hits', String(Number(this._read('analog_hits', '0')) + 1));
        this.updateStats();
    },

    incrementMiss() {
        this._write('analog_misses', String(Number(this._read('analog_misses', '0')) + 1));
        this.updateStats();
    },

    updateStats() {
        const entries = Object.keys(this._store).length;
        const hits = this._read('analog_hits', '0');
        const misses = this._read('analog_misses', '0');
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        setText('cache-hits', hits);
        setText('cache-entries', entries);
        setText('cache-misses', misses);
        setText('stat-cache', entries);
        setText('cache-live', Object.keys(Discovery._live || {}).length);
        setText('cache-summary', `${entries} locations remembered`);
    }
};

/* ============================= DISCOVERY ============================= */

const Discovery = {
    _live: {},

    async analyze(lat, lng) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -85 || lat > 85 || lng < -180 || lng > 180) {
            this.renderError('Enter a valid Earth coordinate.');
            return null;
        }

        lat = Cache.round(lat, 4);
        lng = Cache.round(lng, 4);
        const cached = Cache.lookup(lat, lng);
        if (cached) {
            Cache.recordHit();
            Toast.show('Cache hit — returning cached metrics');
            this.render(cached.data);
            return cached.data;
        }

        const key = `${lat},${lng}`;
        if (this._live[key]) {
            return this._live[key];
        }

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
            Cache.incrementMiss();
            const grid = await this.fetchGrid(coords);
            const metrics = this.computeMetrics(grid);
            const result = { lat, lng, grid, metrics };
            Cache.set(lat, lng, result);
            this.render(result);
            return result;
        })();
        
        this._live[key] = request;
        Cache.updateStats();
        try {
            return await request;
        } catch (error) {
            this.renderError('Terrain data unavailable. Check connection.');
            Toast.show('Elevation lookup failed');
            return null;
        } finally {
            delete this._live[key];
            Cache.updateStats();
        }
    },

    async fetchGrid(coords) {
        const lats = coords.map(c => c[0]).join(',');
        const lngs = coords.map(c => c[1]).join(',');
        const params = new URLSearchParams({ latitude: lats, longitude: lngs });
        // Using Open-Meteo Elevation API endpoint (mocked structure for demo)
        // Real URL: https://api.open-meteo.com/v1/elevation?latitude=...&longitude=...
        const res = await fetch(`https://api.open-meteo.com/v1/elevation?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // Validate shape
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
        const txt = passes ? 'Within 3° slope screen' : 'Above 3° slope screen';

        el.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
        <span class="score-big">${result.metrics.slope.toFixed(1)}°</span>
        <span class="verdict ${cls}">${txt}</span>
        </div>
        <div><b>Mean local relief:</b> ${result.metrics.meanRelief.toFixed(2)} m</div>
        <div><b>p95 local relief:</b> ${result.metrics.p95Relief.toFixed(2)} m</div>
        <div><b>Elevation range:</b> ${result.metrics.range.toFixed(1)} m</div>
        <div class="disc-grid">${result.grid.map((e,i) => `<div class="disc-cell">${Number.isFinite(e)?e.toFixed(1):'-'}'</div>`).join('')}</div>
        <div style="margin-top:10px;font-size:0.78rem;color:var(--text-muted)">
        Grid: 3×3 at ~278 m spacing. Not a direct analog score.
        </div>`;
    },

    renderError(msg) {
        const el = document.getElementById('disc-result');
        if (el) el.textContent = msg;
    },

    random() {
        const earths = Object.values(SITE_DATA).filter(s => s.body === 'Earth');
        const pick = earths[Math.floor(Math.random() * earths.length)];
        document.getElementById('disc-lat').value = pick.lat;
        document.getElementById('disc-lng').value = pick.lng;
        this.analyze(pick.lat, pick.lng);
    },

    renderCacheStats() { Cache.updateStats(); }
};

/* ============================== SIDEBAR ============================== */

const Sidebar = {
    el: null,
    toggleBtn: null,
    overlay: null,
    isOpen: true, // Default to OPEN
    MOBILE_BREAKPOINT: 960,

    init() {
        this.el = document.getElementById('sidebar');
        this.toggleBtn = document.getElementById('hamburger');
        this.overlay = document.getElementById('sidebar-overlay');
        if (!this.el || !this.toggleBtn) return;

        // Escape key closes sidebar
        document.addEventListener('keydown', evt => {
            if (evt.key === 'Escape' && this.isOpen) this.close();
        });

        // Nav items close sidebar on mobile
        this.el.querySelectorAll('.side-nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= this.MOBILE_BREAKPOINT) this.close();
            });
        });

        // Start Open
        this.open();

        // Resize handler for map redraw
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (this.overlay) {
                    this.overlay.classList.toggle('visible', this.isOpen && window.innerWidth <= this.MOBILE_BREAKPOINT);
                }
                if (window.MapViewer?.map) window.MapViewer.map.invalidateSize();
            }, 150);
        }, { passive: true });
    },

    toggle() { this.isOpen ? this.close() : this.open(); },
    
    open() {
        this.isOpen = true;
        this.apply(true);
    },
    
    close() {
        this.isOpen = false;
        this.apply(false);
    },

    apply(open) {
        this.el.classList.toggle('open', open);
        this.toggleBtn.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('sidebar-open', open);
        document.body.classList.toggle('sidebar-closed', !open);

        if (this.overlay) {
            this.overlay.classList.toggle('visible', open && window.innerWidth <= this.MOBILE_BREAKPOINT);
        }

        if (window.MapViewer?.map) {
            requestAnimationFrame(() => window.MapViewer.map.invalidateSize());
        }
    }
};

/* ================================ UI ================================ */

const UI = {
    openModal(id, mapLayer = 'earth') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        const modal = document.getElementById('modal-' + id);
        if (!modal) return;
        modal.classList.add('open');
        if (window.gsap) gsap.fromTo(modal, {opacity: 0, y: 30}, {opacity: 1, y: 0, duration: 0.3});

        // Init triggers
        if (id === 'map') {
            MapViewer.init(mapLayer);
            requestAnimationFrame(() => MapViewer.map?.invalidateSize());
        }
        if (id === 'selector') Selector.run();
        if (id === 'calculator') Calculator.init();
        if (id === 'planner') Planner.start();
        if (id === 'compare') Comparator.render();
        if (id === 'discovery') Discovery.renderCacheStats();
        // Research Labs (in separate file)
        if (id === 'terrain') { if(window.TerrainLab) window.TerrainLab.open(); }
        if (id === 'patches') { if(window.PatchExplorer) window.PatchExplorer.open(); }
        if (id === 'scale') { if(window.ScaleSensitivity) window.ScaleSensitivity.open(); }
    },

    closeModal(id) {
        const modal = document.getElementById('modal-' + id);
        if (modal) modal.classList.remove('open');
    },

    overlayClose(evt, id) {
        if (evt.target === document.getElementById('modal-' + id)) {
            this.closeModal(id);
        }
    }
};

/* ============================= STARFIELD ============================= */

const Starfield = {
    canvas: null,
    ctx: null,
    stars: [],
    rafId: null,
    running: false,
    dpr: 1,
    width: 0,
    height: 0,
    pointer: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
    pan: { x: 0, y: 0 },
    _frameInterval: 1000 / 40, // 40fps
    _time: 0,
    PALETTE: ['#E07A5F', '#8F00FF', '#B200ED', '#F2CC8F', '#FFFFFF'],

    init() {
        const canvas = document.getElementById('starfield');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        this.canvas = canvas;
        this.ctx = ctx;

        this.resize();
        this.spawn();
        this.bindInput();
        this.bindLifecycle();
        this.start();
    },

    spawn() {
        const count = window.innerWidth <= 600 ? 80 : window.innerWidth <= 960 ? 120 : 180;
        this.stars = [];
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                r: Math.random() * 1.8 + 0.5,
                o: Math.random() * 0.8 + 0.2,
                v: Math.random() * 0.5 + 0.2,
                c: this.PALETTE[Math.floor(Math.random() * this.PALETTE.length)],
                tw: Math.random() * Math.PI * 2
            });
        }
    },

    bindInput() {
        window.addEventListener('mousemove', evt => {
            this.target.x = evt.clientX;
            this.target.y = evt.clientY;
        }, { passive: true });
    },

    bindLifecycle() {
        window.addEventListener('resize', () => {
            this.resize();
            this.spawn();
        }, { passive: true });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.pause(); else this.start();
        });
    },

    resize() {
        this.dpr = window.devicePixelRatio || 1;
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.scale(this.dpr, this.dpr);
    },

    start() {
        if (this.running) return;
        this.running = true;
        this._loop();
    },

    pause() {
        this.running = false;
        if (this.rafId) cancelAnimationFrame(this.rafId);
    },

    _loop(timestamp = 0) {
        if (!this.running) return;
        this.rafId = requestAnimationFrame(t => this._loop(t));
        
        const dt = timestamp - this._lastFrame;
        this._lastFrame = timestamp;
        if (dt < this._frameInterval) return;

        this._update(dt);
        this._draw();
    },

    _update(dt) {
        this._time += dt * 0.001;
        this.pan.x += (this.target.x - this.pan.x) * 0.05;
        this.pan.y += (this.target.y - this.pan.y) * 0.05;

        this.stars.forEach(star => {
            // Drift Upwards
            star.y -= star.v * 0.5;
            if (star.y < 0) {
                star.y = this.height;
                star.x = Math.random() * this.width;
            }
            // Twinkle
            star.tw += dt * 0.005;
            star.o = 0.4 + Math.sin(star.tw) * 0.3;
            // Parallax from mouse
            star.x += (this.pan.x - star.x) * 0.0001;
        });
    },

    _draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#FFFFFF';

        this.stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.r * (0.6 + Math.abs(Math.sin(this._time))), 0, Math.PI * 2);
            ctx.fillStyle = star.c;
            ctx.globalAlpha = star.o;
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }
};

/* ============================== MAP VIEWER ============================== */

const MapViewer = {
    map: null,
    layerGroup: null,
    markers: [],
    currentLayer: 'earth',

    init(layerName = 'earth') {
        if (this.map) {
            this.switchLayer(layerName);
            return;
        }

        const container = document.getElementById('map');
        if (!container) return;

        this.map = L.map('map', {
            center: [10, 20],
            zoom: 2,
            zoomControl: true,
            attributionControl: true
        });

        this.layerGroup = L.layerGroup().addTo(this.map);

        // Add Markers
        this.renderSiteList();
        this.switchLayer(layerName);
        this.updateSiteCount();

        // Layer Buttons
        document.querySelectorAll('.layer-btn').forEach(btn => {
            btn.onclick = () => this.switchLayer(btn.dataset.layer);
        });

        // Retry Button
        const retryBtn = document.getElementById('map-retry');
        if (retryBtn) retryBtn.onclick = () => this.retryTiles();
    },

    switchLayer(name) {
        this.currentLayer = name;
        // Update Buttons
        document.querySelectorAll('.layer-btn').forEach(b => {
            const isActive = b.dataset.layer === name;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-pressed', isActive);
        });

        // Clear existing markers
        this.layerGroup.clearLayers();
        this.markers.forEach(m => this.layerGroup.addLayer(m));

        // Tiles (Mocking Moon/Mars with colored divs since no public tile servers guaranteed)
        // In production, use NASA Worldview or similar URLs.
        const url = name === 'earth' 
            ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            : (name === 'moon'
                ? 'https://tiles.maps.eox.at/?service=WMTS&request=GetTile&version=1.0.0&layer=sso&Style=default&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}'
                : 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'); // Placeholder for Mars
        
        try {
            if (window.L && !this.map.hasLayer(this.tileLayer)) {
                this.tileLayer = L.tileLayer(url, {
                    attribution: '&copy; OpenStreetMap contributors',
                    maxZoom: 19
                }).addTo(this.map);
            } else if (this.map.hasLayer(this.tileLayer) && this.tileLayer._url !== url) {
                this.map.removeLayer(this.tileLayer);
                this.tileLayer = L.tileLayer(url).addTo(this.map);
            }
        } catch (e) {
            console.error('Tile Load Error', e);
            document.getElementById('map-status').textContent = 'Tiles loading... (fallback active)';
        }

        this.updateSiteCount();
    },

    renderSiteList() {
        const list = document.getElementById('map-sites');
        if (!list) return;
        list.innerHTML = '';

        Object.values(SITE_DATA).forEach(site => {
            const card = document.createElement('button');
            card.className = 'map-site';
            card.type = 'button';
            card.dataset.id = site.id;
            card.onclick = () => this.focusOnSite(site.id);
            
            card.innerHTML = `
                <b>${site.name}</b>
                <span>${site.body}</span>
                <div class="ms-metric">${fmt(site.area)} km²</div>
            `;
            list.appendChild(card);

            // Create Marker
            const marker = L.marker([site.lat, site.lng], {
                icon: L.divIcon({
                    className: 'custom-pin',
                    html: `<div style="background:${site.color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3)"></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                })
            }).bindPopup(`<b>${site.name}</b><br>${fmt(site.meanRough)} m roughness`);
            
            this.markers.push(marker);
        });
    },

    updateSiteList() {
        // Refresh markers if data changed
        this.markers = [];
        this.renderSiteList();
        this.switchLayer(this.currentLayer);
    },

    focusOnSite(id) {
        const site = SITE_DATA[id];
        if (!site) return;
        this.map.setView([site.lat, site.lng], 8);
        this.markers.find(m => m.getLatLng().lat === site.lat)?.openPopup();
        
        // Highlight card
        document.querySelectorAll('.map-site').forEach(c => {
            c.classList.toggle('active', c.dataset.id === id);
        });
    },

    updateSiteCount() {
        const counter = document.getElementById('map-site-count');
        if (!counter) return;
        const count = SITES().filter(s => s.body.toLowerCase() === (this.currentLayer === 'earth' ? 'earth' : this.currentLayer)).length;
        const total = SITES().length;
        const text = this.currentLayer === 'all' ? 'Showing 5 sites' : `Showing ${count} ${this.currentLayer} sites`;
        counter.textContent = text;
    },

    retryTiles() {
        const btn = document.getElementById('map-retry');
        if (btn) btn.hidden = true;
        if (this.map) this.map.invalidateSize();
    }
};

/* ============================= SELECTOR ============================= */

const Selector = {
    weights: { smooth: 7, hazard: 5, area: 6, slope: 8 },

    init() {
        const inputs = ['smooth', 'hazard', 'area', 'slope'];
        inputs.forEach(k => {
            const el = document.getElementById(`w-${k}`);
            const disp = document.getElementById(`wv-${k}`);
            if (el && disp) {
                el.oninput = (e) => {
                    this.weights[k] = parseInt(e.target.value, 10);
                    disp.textContent = this.weights[k];
                    this.run();
                };
            }
        });
    },

    run() {
        const results = document.getElementById('selector-results');
        if (!results) return;

        const sites = SITES().map(s => {
            const normArea = s.area / 500; // 500km2 cap
            const normRough = 5 - s.meanRough; // Lower is better
            const normHazard = 6 - s.p95Rough; // Lower is better
            const normSlope = s.slopeDiscipline;

            const score = 
                (normRough * this.weights.smooth) +
                (normHazard * this.weights.hazard) +
                (normArea * this.weights.area) +
                (normSlope * this.weights.slope);

            return { ...s, score };
        }).sort((a, b) => b.score - a.score);

        results.innerHTML = sites.map((s, i) => `
            <div class="rank-item ${i===0?'top':''}">
                <div class="rank-pos">#${i+1}</div>
                <div>
                    <div class="rank-name">${s.name}</div>
                    <div class="rank-sub">${s.body} • ${s.analogy}</div>
                </div>
                <div class="rank-score">${Math.round(s.score)}</div>
            </div>
        `).join('');
    }
};

/* =========================== CALCULATOR =========================== */

const Calculator = {
    chart: null,

    init() {
        // Bind Sliders
        ['rough', 'p95', 'slope', 'area'].forEach(k => {
            const el = document.getElementById(`c-${k}`);
            const disp = document.getElementById(`cv-${k}`);
            if (el && disp) {
                el.oninput = (e) => {
                    const val = el.type === 'range' && k === 'slope' ? e.target.value + '%' : e.target.value;
                    disp.textContent = val;
                    this.updateChart();
                };
            }
        });
        this.updateChart();
    },

    updateChart() {
        const ctx = document.getElementById('calc-chart');
        if (!ctx || !window.Chart) return;

        // Simulated calculation based on distance from Moon reference
        const moon = SITE_DATA.moon;
        const data = SITES().map(s => {
            const dist = Math.sqrt(
                Math.pow(s.meanRough - moon.meanRough, 2) +
                Math.pow(s.p95Rough - moon.p95Rough, 2)
            );
            const similarity = Math.max(0, 100 - (dist * 15));
            return { site: s.name.substring(0, 12), sim: similarity.toFixed(0) };
        });

        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.site),
                datasets: [{
                    label: 'Moon Similarity %',
                    data: data.map(d => d.sim),
                    backgroundColor: ['#4E8C6E', '#2E7D9A', '#C9821A', '#E07A5F', '#F08080']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 100 } }
            }
        });
    }
};

/* =============================== PLANNER =============================== */

const Planner = {
    step: 0,
    steps: ['Mission Type', 'Duration', 'Team Size', 'Summary'],
    choices: {
        0: ['Exploration', 'Resource Survey', 'Scientific Outpost'],
        1: ['1 Week', '1 Month', '6 Months'],
        2: ['Solo', '2-Person', 'Full Crew']
    },
    plan: {},

    start() {
        this.step = 0;
        this.plan = {};
        this.renderStep();
    },

    renderStep() {
        const el = document.getElementById('planner-steps');
        if (!el) return;
        el.innerHTML = `
            <div class="planner-step">
                <h3>${this.steps[this.step]}</h3>
                <div class="planner-options">
                    ${(this.choices[this.step] || []).map((opt, i) => `
                        <button class="opt" data-val="${opt}" data-step="${this.step}" type="button">${opt}</button>
                    `).join('')}
                </div>
            </div>
        `;

        el.querySelectorAll('.opt').forEach(btn => {
            btn.onclick = (e) => {
                this.plan[this.steps[this.step]] = e.target.dataset.val;
                if (this.step < this.steps.length - 1) {
                    this.step++;
                    this.renderStep();
                } else {
                    this.finish();
                }
            };
        });
    },

    finish() {
        const out = document.getElementById('planner-output');
        if (!out) return;
        out.innerHTML = `
            <h3>Mission Draft Ready</h3>
            <ul>
                <li>${Object.entries(this.plan).map(([k,v]) => `<b>${k}:</b> ${v}`).join('</li><li>')}</li>
            </ul>
            <p style="margin-top:12px;font-size:0.85rem">Next step: Export to CSV.</p>
        `;
        Toast.show('Mission draft generated');
        document.querySelector('#planner-next').hidden = true;
        document.querySelector('#planner-back').hidden = true;
    }
};

/* ============================== COMPARATOR ============================== */

const Comparator = {
    sortCol: 'sim',
    sortDir: 'desc',
    filterBody: 'all',

    render() {
        this.bindFilters();
        this.bindSort();
        this.drawTable();
        this.drawCrossTable();
        this.drawChart();
    },

    bindFilters() {
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
    },

    bindSort() {
        document.querySelectorAll('.cmp-table th[data-sort]').forEach(th => {
            th.onclick = () => {
                const col = th.dataset.sort;
                if (this.sortCol === col) {
                    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortCol = col;
                    this.sortDir = 'asc';
                }
                
                // Reset headers
                document.querySelectorAll('.cmp-table th').forEach(h => h.setAttribute('aria-sort', 'none'));
                th.setAttribute('aria-sort', this.sortDir);
                
                this.drawTable();
            };
        });
    },

    getData() {
        let data = Object.values(SITE_DATA);
        if (this.filterBody !== 'all') {
            data = data.filter(s => s.body.toLowerCase() === this.filterBody);
        }
        return data.sort((a, b) => {
            let va = a[this.sortCol];
            let vb = b[this.sortCol];
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            return this.sortDir === 'asc' ? va > vb : va < vb;
        });
    },

    drawTable() {
        const tbody = document.querySelector('#cmp-table tbody');
        if (!tbody) return;
        tbody.innerHTML = this.getData().map(s => `
            <tr>
                <td>${s.name}</td>
                <td><span style="color:${PLANET_COLORS[s.body]}">${s.body}</span></td>
                <td class="num">${fmt(s.area)}</td>
                <td class="num">${fmt(s.meanRough)}</td>
                <td class="num">${fmt(s.p95Rough)}</td>
                <td class="num"><b>${s.vsMoon}%</b></td>
            </tr>
        `).join('');
    },

    drawCrossTable() {
        const tbody = document.querySelector('#cross-cmp-table tbody');
        if (!tbody) return;
        const sites = Object.values(SITE_DATA);
        const rows = [];
        for (let i=0; i<sites.length; i++) {
            for (let j=i+1; j<sites.length; j++) {
                const a = sites[i];
                const b = sites[j];
                // Simple diff
                const sim = Math.max(0, 100 - Math.abs(a.meanRough - b.meanRough) * 10);
                rows.push({
                    a: a.name, ab: a.body, b: b.name, bb: b.body, sim: sim.toFixed(0)
                });
            }
        }
        tbody.innerHTML = rows.map(r => `
            <tr>
                <td>${r.a}</td>
                <td><span style="color:${PLANET_COLORS[r.ab]}">${r.ab}</span></td>
                <td>${r.b}</td>
                <td><span style="color:${PLANET_COLORS[r.bb]}">${r.bb}</span></td>
                <td class="num">${r.sim}%</td>
            </tr>
        `).join('');
    },

    drawChart() {
        // Re-use chart logic or simple bars
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
                    backgroundColor: data.map(d => PLANET_COLORS[SITE_DATA[d.site.split(' ')[0].toLowerCase()]?.body || 'Earth'])
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
};

/* =============================== TOAST =============================== */

const Toast = {
    root: null,
    queue: [],

    init() {
        this.root = document.getElementById('toast-root');
    },

    show(msg, dur = 3000) {
        if (!this.root) return;
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        this.root.appendChild(el);
        this.queue.push(el);
        
        setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => el.remove(), 280);
        }, dur);
    }
};

/* ================================ INIT ================================ */

window.onload = () => {
    // Init Modules
    Sidebar.init();
    UI.init && UI.init();
    Starfield.init();
    Cache.init();
    Toast.init();
    Selector.init();

    // Discovery Lab Buttons
    const discRun = document.getElementById('disc-run');
    const discRand = document.getElementById('disc-random');
    if (discRun) discRun.onclick = () => {
        const lat = parseFloat(document.getElementById('disc-lat').value);
        const lng = parseFloat(document.getElementById('disc-lng').value);
        if (isNaN(lat) || isNaN(lng)) {
            Toast.show('Please enter valid coordinates');
            return;
        }
        Discovery.analyze(lat, lng);
    };
    if (discRand) discRand.onclick = () => Discovery.random();

    // Map Retry
    document.getElementById('map-retry')?.addEventListener('click', () => {
        MapViewer.retryTiles();
    });

    // Initial Stats
    document.getElementById('stat-sites').textContent = '5';
    document.getElementById('stat-bodies').textContent = '3';

    // Attempt API Load
    SiteMetrics.load();

    Toast.show('Welcome to Planetary Analog Explorer');
};