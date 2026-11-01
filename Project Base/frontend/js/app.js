/**
 * Planetary Analog Explorer — app.js
 *
 * Core functionality:
 *   • Three.js starfield (animated background)
 *   • Leaflet map with Earth/Moon/Mars layer switching
 *   • Open-Meteo elevation API + browser cache for Discovery Lab
 *   • Base Site Selector (weighted ranking)
 *   • Analogy Calculator (Euclidean distance scoring)
 *   • Mission Planner wizard
 *   • Full comparison table + Chart.js visualizations
 *
 * External services (all free, no key required):
 *   • Open-Meteo Elevation API (up to 100 coordinates per request)
 *   • NASA Solar System Treks WMTS tiles (Moon/Mars basemaps)
 *   • Leaflet + OpenStreetMap (Earth base)
 *
 * Attribution required: CC BY 4.0 for Open-Meteo data
 */

/* =========================== DATA =========================== */

// All metrics derived from offline GDAL pipeline (LRO/CTX/Copernicus DEMs at matched 90 m windows)
const SITE_DATA = {
    moon: {
        id: 'moon',
        name: 'Lunar South Pole (Shackleton)',
        lat: -89.9, lng: 0.0,
        body: 'Moon',
        area: 3.875,
        meanRough: 2.462,
        p95Rough: 4.138,
        maxRough: 5.22,
        slopeDiscipline: 0.92,
        vsMoon: 100,
        analogy: 'baseline',
        color: '#f5c451',
        description: 'Target landing zone near Shackleton Crater rim — permanent sunlight peaks, permanently shadowed craters nearby.',
        hasWeather: false
    },
    mcmurdo: {
        id: 'mcmurdo',
        name: 'McMurdo Dry Valleys',
        lat: -77.6, lng: 162.2,
        body: 'Earth',
        area: 250.242,
        meanRough: 2.294,
        p95Rough: 3.865,
        maxRough: 4.8,
        slopeDiscipline: 0.93,
        vsMoon: 93,
        analogy: 'strong analog',
        color: '#5ee6a8',
        description: 'Extreme polar desert, minimal biology, permafrost — most studied Mars analog on Earth.',
        hasWeather: true
    },
    axel: {
        id: 'axel',
        name: 'Axel Heiberg Island',
        lat: 79.4, lng: -90.0,
        body: 'Earth',
        area: 81.175,
        meanRough: 2.232,
        p95Rough: 3.611,
        maxRough: 4.5,
        slopeDiscipline: 0.91,
        vsMoon: 91,
        analogy: 'strong analog',
        color: '#4dabff',
        description: 'Canadian Arctic, freeze-thaw cycles, exposed bedrock — accessible northern polar analog.',
        hasWeather: true
    },
    kerguelen: {
        id: 'kerguelen',
        name: 'Kerguelen Islands',
        lat: -49.35, lng: 69.35,
        body: 'Earth',
        area: 1.241,
        meanRough: 1.352,
        p95Rough: 3.946,
        maxRough: 6.0,
        slopeDiscipline: 0.55,
        vsMoon: 55,
        analogy: 'weak analog',
        color: '#ff9e54',
        description: 'Volcanic basalt highlands, isolated oceanic — tests "unexpected" analog hypothesis.',
        hasWeather: true
    },
    jezero: {
        id: 'jezero',
        name: 'Jezero Crater',
        lat: 18.4, lng: 77.6,
        body: 'Mars',
        area: 506.277,
        meanRough: 2.110,
        p95Rough: 3.744,
        maxRough: 5.1,
        slopeDiscipline: 0.86,
        vsMoon: 86,
        analogy: 'reference (Mars)',
        color: '#ff7a59',
        description: 'Perseverance rover site — ancient delta fan, lakebed — benchmark for Martian terrain.',
        hasWeather: false
    }
};

const PLANET_COLORS = {
    Earth: '#5ee6a8',
    Moon: '#f5c451',
    Mars: '#ff7a59'
};

/* =========================== SMART CACHE (Discovery Lab) =========================== */

const Cache = {
    _store: {},
    maxAgeMs: 7 * 24 * 60 * 60 * 1000,
    maxEntries: 300,

    _read(key, fallback = '') {
        try { return localStorage.getItem(key) ?? fallback; }
        catch { return fallback; }
    },

    _write(key, value) {
        try { localStorage.setItem(key, value); }
        catch { /* Storage can be disabled or full; in-memory results still work. */ }
    },

    init() {
        try {
            const saved = JSON.parse(this._read('analog_cache_v1', '{}'));
            const cutoff = Date.now() - this.maxAgeMs;
            this._store = Object.fromEntries(Object.entries(saved)
                .filter(([, entry]) => entry && entry.ts > cutoff && entry.data));
        } catch {
            this._store = {};
        }
        this.updateStats();
    },

    lookup(lat, lng) {
        const key = this._round(lat, 4) + ',' + this._round(lng, 4);
        const entry = this._store[key];
        if (!entry || Date.now() - entry.ts > this.maxAgeMs) {
            delete this._store[key];
            return null;
        }
        return entry;
    },

    set(lat, lng, result) {
        const key = this._round(lat, 4) + ',' + this._round(lng, 4);
        this._store[key] = {
            ts: Date.now(),
            data: result
        };
        const entries = Object.entries(this._store)
            .sort((a, b) => b[1].ts - a[1].ts)
            .slice(0, this.maxEntries);
        this._store = Object.fromEntries(entries);
        this._write('analog_cache_v1', JSON.stringify(this._store));
        this.updateStats();
    },

    clear() {
        this._store = {};
        this._write('analog_cache_v1', '{}');
        this._write('analog_hits', '0');
        this._write('analog_misses', '0');
        this.updateStats();
    },

    updateStats() {
        const entries = Object.keys(this._store).length;
        const hits = this._read('analog_hits', '0');
        const misses = this._read('analog_misses', '0');
        const setText = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };
        setText('cache-hits', hits);
        setText('cache-entries', entries);
        setText('cache-misses', misses);
        setText('cache-live', Discovery ? Object.keys(Discovery._live).length : 0);
        setText('cache-summary', `${entries} locations remembered on this device`);
        setText('stat-cache', entries);
    },

    recordHit() {
        this._write('analog_hits', String(Number(this._read('analog_hits', '0')) + 1));
        this.updateStats();
    },

    incrementMiss() {
        const misses = Number(this._read('analog_misses', '0')) + 1;
        this._write('analog_misses', String(misses));
        this.updateStats();
    },

    _round(v, d) {
        return Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
    }
};

/* =========================== DISCOVERY LAB (Open-Meteo) =========================== */

const Discovery = {
    async analyze(lat, lng) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -85 || lat > 85 || lng < -180 || lng > 180) {
            this.renderError('Enter a valid Earth coordinate between 85°S and 85°N.');
            return null;
        }

        lat = Cache._round(lat, 4);
        lng = Cache._round(lng, 4);
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

        // Keep the sample spacing near 278 m in both directions; this is a coarse proxy, not the offline DEM window.
        const latStep = 278 / 111320;
        const lngStep = latStep / Math.max(Math.cos(lat * Math.PI / 180), 0.087);
        const coords = [];
        for (const row of [-1, 0, 1]) {
            for (const column of [-1, 0, 1]) {
                coords.push([lat + row * latStep, lng + column * lngStep]);
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
            this.renderError('Terrain data is unavailable right now. Check your connection and try again.');
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
        const res = await fetch(`/api/elevation?${params}`);
        if (!res.ok) throw new Error(`Elevation API returned HTTP ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json.elevation) || json.elevation.length !== 9 || !json.elevation.every(Number.isFinite)) {
            throw new Error('Elevation API returned an invalid grid');
        }
        return json.elevation;
    },

    computeMetrics(grid) {
        if (!Array.isArray(grid) || grid.length !== 9 || !grid.every(Number.isFinite)) {
            throw new Error('A complete 3×3 elevation grid is required');
        }
        const relief = [];
        for (let row = 0; row < 2; row++) {
            for (let column = 0; column < 2; column++) {
                const window = [
                    grid[row * 3 + column], grid[row * 3 + column + 1],
                    grid[(row + 1) * 3 + column], grid[(row + 1) * 3 + column + 1]
                ];
                relief.push(Math.max(...window) - Math.min(...window));
            }
        }
        const gradientX = (grid[5] - grid[3]) / (2 * 278);
        const gradientY = (grid[7] - grid[1]) / (2 * 278);
        const sortedRelief = [...relief].sort((a, b) => a - b);
        return {
            slope: Math.atan(Math.hypot(gradientX, gradientY)) * 180 / Math.PI,
            meanRelief: relief.reduce((sum, value) => sum + value, 0) / relief.length,
            p95Relief: sortedRelief[Math.ceil(sortedRelief.length * 0.95) - 1],
            range: Math.max(...grid) - Math.min(...grid)
        };
    },

    render(result) {
        const el = document.getElementById('disc-result');
        const passesSlope = result.metrics.slope <= 3;
        const verdictClass = passesSlope ? 'good' : 'warn';
        const verdictText = passesSlope ? 'Within 3° slope screen' : 'Above 3° slope screen';

        el.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <span class="score-big">${result.metrics.slope.toFixed(1)}°</span>
        <span class="verdict ${verdictClass}">${verdictText}</span>
        </div>
        <div><b>Mean local relief proxy:</b> ${result.metrics.meanRelief.toFixed(2)} m</div>
        <div><b>p95 local relief proxy:</b> ${result.metrics.p95Relief.toFixed(2)} m</div>
        <div><b>Sample elevation range:</b> ${result.metrics.range.toFixed(1)} m</div>
        <div class="disc-grid">${result.grid.map((e,i) =>
            `<div class="disc-cell">${Number.isFinite(e) ? e.toFixed(1) : '-'}</div>`
        ).join('')}</div>
        <div style="margin-top:10px;font-size:0.75rem;color:var(--ink-dim)">
        Grid: 3×3 at approximately 278 m spacing. These API-derived local indicators are exploratory and are not directly comparable to the offline 90 m DEM metrics.
        </div>
        `;
    },

    renderError(message) {
        const el = document.getElementById('disc-result');
        if (el) el.textContent = message;
    },

    random() {
        const earths = Object.values(SITE_DATA).filter(s => s.body === 'Earth');
        const pick = earths[Math.floor(Math.random() * earths.length)];
        document.getElementById('disc-lat').value = pick.lat;
        document.getElementById('disc-lng').value = pick.lng;
        this.analyze(pick.lat, pick.lng);
    },

    renderCacheStats() { Cache.updateStats(); },

    _live: {}
};

/* =========================== UI & MODALS =========================== */

const UI = {
    openModal(id, mapLayer = 'earth') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        const modal = document.getElementById('modal-' + id);
        if (!modal) return;
        modal.classList.add('open');
        if (window.gsap) gsap.fromTo(modal, {opacity: 0, y: 30}, {opacity: 1, y: 0, duration: 0.3});

        // Special init triggers
        if (id === 'map') {
            MapViewer.init(mapLayer);
            requestAnimationFrame(() => MapViewer.map?.invalidateSize());
        }
        if (id === 'selector') Selector.run();
        if (id === 'calculator') Calculator.init();
        if (id === 'planner') Planner.start();
        if (id === 'compare') Comparator.render();
    },

    closeModal(id) {
        document.getElementById('modal-' + id).classList.remove('open');
    },

    overlayClose(evt, id) {
        if (evt.target === document.getElementById('modal-' + id)) {
            this.closeModal(id);
        }
    }
};

/* =========================== THREE.JS STARFIELD =========================== */

const Starfield = {
    init() {
        const canvas = document.getElementById('starfield');
        if (!window.THREE || !canvas) return;
        const webgl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!webgl) return;
        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
        } catch {
            return;
        }
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 50;

        const stars = new THREE.BufferGeometry();
        const count = window.matchMedia('(max-width: 640px)').matches ? 250 : 650;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 200;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 200;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
        }
        stars.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const material = new THREE.PointsMaterial({ size: 0.4, color: 0xffffff, transparent: true, opacity: 0.8 });
        const points = new THREE.Points(stars, material);
        scene.add(points);

        const resize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
            renderer.setSize(window.innerWidth, window.innerHeight, false);
            renderer.render(scene, camera);
        };
        resize();
        window.addEventListener('resize', resize, { passive: true });

    }
};

/* =========================== LEAFLET MAP =========================== */

const MapViewer = {
    map: null,
    markers: [],
    baseLayer: null,
    currentLayer: 'earth',
    selectedSiteId: null,

    init(initialLayer = 'earth') {
        if (this.map) {
            if (initialLayer !== this.currentLayer) this.switchLayer(initialLayer);
            return;
        }
        if (!window.L) {
            document.getElementById('map-footnote').textContent = 'Map library unavailable. Check your connection and reload to use the atlas.';
            return;
        }

        this.currentLayer = ['earth', 'moon', 'mars'].includes(initialLayer) ? initialLayer : 'earth';
        this.createMap();
        this.renderSiteList();
        this.updateSiteList();
        this.updateFootnote();

        document.getElementById('layer-switch').addEventListener('click', e => {
            const button = e.target.closest('.layer-btn');
            if (button) this.switchLayer(button.dataset.layer);
        });
        document.getElementById('map-sites').addEventListener('click', e => {
            const button = e.target.closest('.map-site');
            if (button) this.focusSite(button.dataset.site);
        });
        document.getElementById('map-retry').addEventListener('click', () => this.retryTiles());

        this.prefetchWeather();
    },

    createMap() {
        const isEarth = this.currentLayer === 'earth';
        this.map = L.map('map', {
            crs: isEarth ? L.CRS.EPSG3857 : L.CRS.EPSG4326,
            center: isEarth ? [20, 0] : [0, 0],
            zoom: 2,
            minZoom: isEarth ? 1 : 0,
            maxZoom: 6,
            attributionControl: false,
            worldCopyJump: isEarth
        });

        this.createBaseLayer();
        this.renderMarkers();
    },

    createBaseLayer() {
        const sources = {
            earth: {
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
                maxZoom: 19
            },
            moon: {
                url: '/api/tiles/moon/{z}/{y}/{x}.jpg',
                attribution: '&copy; NASA/JPL Solar System Treks',
                maxZoom: 6,
                noWrap: true
            },
            mars: {
                url: '/api/tiles/mars/{z}/{y}/{x}.jpg',
                attribution: '&copy; NASA/JPL Solar System Treks',
                maxZoom: 6,
                noWrap: true
            }
        };
        const source = sources[this.currentLayer];
        this.tileLoads = 0;
        this.tileFailures = 0;
        const layer = L.tileLayer(source.url, {
            minZoom: 0,
            maxZoom: source.maxZoom,
            noWrap: source.noWrap || false,
            attribution: source.attribution,
            keepBuffer: 1,
            updateWhenIdle: true
        });
        layer.on('loading', () => {
            this.tileLoads = 0;
            this.tileFailures = 0;
            this.setTileStatus(`Loading ${this.currentLayer} map tiles…`, false);
        });
        layer.on('tileload', () => { this.tileLoads++; });
        layer.on('tileerror', () => { this.tileFailures++; });
        layer.on('load', () => {
            if (this.tileFailures && !this.tileLoads) {
                this.setTileStatus('Map tiles could not be loaded. Check your connection and retry.', true);
            } else if (this.tileFailures) {
                this.setTileStatus(`Map ready; ${this.tileFailures} tile(s) failed to load.`, true);
            } else {
                this.setTileStatus('Map background loaded.', false);
            }
        });
        this.baseLayer = layer.addTo(this.map);
    },

    setTileStatus(message, canRetry) {
        const status = document.getElementById('map-status');
        const retry = document.getElementById('map-retry');
        if (status) status.textContent = message;
        if (retry) retry.hidden = !canRetry;
    },

    retryTiles() {
        if (!this.map) return;
        this.baseLayer?.remove();
        this.createBaseLayer();
    },

    renderSiteList() {
        const container = document.getElementById('map-sites');
        container.innerHTML = Object.values(SITE_DATA).map(site => `
            <button class="map-site" type="button" data-site="${site.id}" aria-pressed="false" style="--site-color:${site.color}">
                <span class="map-site-name">${site.name}</span>
                <span class="map-site-meta">${site.body} · ${site.area.toFixed(2)} km² flat area</span>
            </button>
        `).join('');
    },

    updateSiteList() {
        const activeBody = this.currentLayer === 'earth' ? 'Earth' : this.currentLayer === 'moon' ? 'Moon' : 'Mars';
        const visibleCount = Object.values(SITE_DATA).filter(site => site.body === activeBody).length;
        document.getElementById('map-site-count').textContent = `Showing ${visibleCount} ${activeBody} site${visibleCount === 1 ? '' : 's'} · 5 total across all bodies`;
        document.querySelectorAll('.layer-btn').forEach(button => {
            const selected = button.dataset.layer === this.currentLayer;
            button.classList.toggle('active', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        document.querySelectorAll('.map-site').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.site === this.selectedSiteId));
        });
    },

    updateFootnote() {
        const messages = {
            earth: 'OpenStreetMap basemap. Earth sites show live weather when selected.',
            moon: 'NASA Moon Trek global mosaic with the lunar South Pole reference marker.',
            mars: 'NASA Mars Trek global mosaic with the Jezero Crater reference marker.'
        };
        document.getElementById('map-footnote').textContent = messages[this.currentLayer];
    },

    focusSite(siteId) {
        const site = SITE_DATA[siteId];
        if (!site || !this.map) return;
        const layer = site.body.toLowerCase();
        if (layer !== this.currentLayer) this.switchLayer(layer);
        this.selectedSiteId = site.id;
        this.updateSiteList();
        this.map.setView([site.lat, site.lng], site.body === 'Earth' ? 5 : 4, { animate: true });
        this.showPopup(site);
    },

    renderMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        const body = this.currentLayer === 'earth' ? 'Earth' : this.currentLayer === 'moon' ? 'Moon' : 'Mars';
        Object.values(SITE_DATA).filter(site => site.body === body).forEach(site => {
            const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="width:14px;height:14px;border-radius:50%;background:${site.color};border:2px solid #fff;box-shadow:0 0 10px ${site.color}"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            const marker = L.marker([site.lat, site.lng], {
                icon,
                title: `${site.name} (${site.body})`,
                alt: `${site.name}, ${site.body}`,
                riseOnHover: true
            }).addTo(this.map);
            marker.siteId = site.id;
            marker.on('click', () => {
                this.selectedSiteId = site.id;
                this.updateSiteList();
                this.showPopup(site);
            });
            this.markers.push(marker);
        });
    },

    switchLayer(layer) {
        if (!['earth', 'moon', 'mars'].includes(layer) || layer === this.currentLayer) return;
        this.currentLayer = layer;
        this.selectedSiteId = null;
        if (this.map) this.map.remove();
        this.map = null;
        this.baseLayer = null;
        this.markers = [];
        this.createMap();
        this.updateFootnote();
        this.updateSiteList();
    },

    showPopup(site) {
        const content = `
        <div style="font-weight:700;margin-bottom:8px;">${site.name}</div>
        <div class="popup-metric"><b>Body:</b> ${site.body}</div>
        <div class="popup-metric"><b>Flat area:</b> ${site.area.toFixed(2)} km²</div>
        <div class="popup-metric"><b>Mean roughness:</b> ${site.meanRough.toFixed(2)} m</div>
        <div class="popup-metric"><b>p95 hazard:</b> ${site.p95Rough.toFixed(2)} m</div>
        <div class="popup-metric"><b>Similarity to Moon:</b> ${site.vsMoon}%</div>
        <div style="margin-top:8px;color:#9aa0c3;font-size:0.75rem">${site.description}</div>
        ${site.hasWeather ? '<div id="weather-' + site.id + '" style="margin-top:8px;font-size:0.72rem;color:#f5c451">Fetching weather…</div>' : ''}
        `;

        L.popup({ offset: [0, -10] })
        .setContent(content)
        .setLatLng([site.lat, site.lng])
        .openOn(this.map);

        if (site.hasWeather) {
            this.fetchWeather(site);
        }
    },

    async fetchWeather(site) {
        const params = new URLSearchParams({ lat: site.lat, lon: site.lng });
        try {
            const res = await fetch(`/api/weather?${params}`);
            if (!res.ok) throw new Error(`Weather service returned HTTP ${res.status}`);
            const json = await res.json();
            const w = json.current;
            const el = document.getElementById('weather-' + site.id);
            if (el) {
                const stale = res.headers.get('X-Cache') === 'STALE' ? ' · saved reading' : '';
                el.textContent = `Weather: ${w.temperature_2m}°C, wind ${w.wind_speed_10m} km/h (Open-Meteo${stale})`;
            }
        } catch {
            const el = document.getElementById('weather-' + site.id);
            if (el) el.textContent = 'Weather unavailable';
        }
    },

    prefetchWeather() {
        // One-time fetch for all Earth sites when modal opens
        Object.values(SITE_DATA).forEach(s => {
            if (s.hasWeather && !this.weatherFetched?.has(s.id)) {
                this.fetchWeather(s);
            }
        });
        this.weatherFetched = this.weatherFetched || new Set();
        Object.values(SITE_DATA).forEach(s => this.weatherFetched.add(s.id));
    }
};

/* =========================== BASE SITE SELECTOR =========================== */

const Selector = {
    weights: { smooth: 7, hazard: 5, area: 6, slope: 8 },
    slidersInitialized: false,

    initSliders() {
        if (this.slidersInitialized) return;
        this.slidersInitialized = true;
        ['smooth','hazard','area','slope'].forEach(k => {
            const inp = document.getElementById('w-' + k);
            const out = document.getElementById('wv-' + k);
            if (!inp || !out) return;
            inp.value = this.weights[k];
            out.textContent = this.weights[k];
            inp.addEventListener('input', () => {
                this.weights[k] = parseInt(inp.value);
                out.textContent = this.weights[k];
                this.run();
            });
        });
    },

    run() {
        this.initSliders();
        const weightTotal = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
        const scores = Object.entries(SITE_DATA).map(([id, site]) => {
            // Normalize: 0–1 for each dimension
            const normMean = Math.max(0, 1 - site.meanRough / 4); // lower roughness = higher score
            const normP95 = Math.max(0, 1 - site.p95Rough / 6);
            const normArea = Math.min(1, site.area / 300); // cap at 300 km²
            const normSlope = site.slopeDiscipline;

            const weighted = (
            this.weights.smooth * normMean +
            this.weights.hazard * normP95 +
            this.weights.area * normArea +
            this.weights.slope * normSlope
            ) / (weightTotal || 1) * 100;

            return { ...site, weighted, id };
        }).sort((a, b) => b.weighted - a.weighted);

        const container = document.getElementById('selector-results');
        container.innerHTML = scores.map((s, i) => `
        <div class="rank-item">
        <div class="rank-pos">#${i+1}</div>
        <div>
        <div class="rank-name">${s.name} <span class="rank-sub">(${s.body})</span></div>
        <div class="rank-bar"><div class="rank-fill" style="width:${s.weighted}%"></div></div>
        </div>
        <div class="rank-score">${Math.round(s.weighted)}%</div>
        </div>
        `).join('');
    }
};

/* =========================== ANALOGY CALCULATOR =========================== */

const Calculator = {
    chart: null,
    controlsInitialized: false,

    init() {
        this.initControls();
        this.updateChart();
    },

    initControls() {
        if (this.controlsInitialized) return;
        this.controlsInitialized = true;
        const controls = [
            ['c-rough', 'cv-rough', 'meanRough'],
            ['c-p95', 'cv-p95', 'p95Rough'],
            ['c-slope', 'cv-slope', 'slopeGate'],
            ['c-area', 'cv-area', 'areaGate']
        ];

        controls.forEach(([inpId, outId, field]) => {
            const inp = document.getElementById(inpId);
            const out = document.getElementById(outId);
            if (!inp || !out) return;
            out.textContent = field === 'slopeGate' ? `${inp.value}%` : inp.value;
            inp.addEventListener('input', () => {
                out.textContent = field === 'slopeGate' ? `${inp.value}%` : inp.value;
                this.updateChart();
            });
        });
    },

    updateChart() {
        const ctx = document.getElementById('calc-chart').getContext('2d');
        if (typeof Chart === 'undefined') {
            document.getElementById('calc-notes').textContent = 'Chart library unavailable. Threshold controls remain visible, but the chart cannot be rendered.';
            return;
        }
        const targets = {
            meanRough: parseFloat(document.getElementById('c-rough').value),
            p95Rough: parseFloat(document.getElementById('c-p95').value),
            slopeGate: parseFloat(document.getElementById('c-slope').value),
            areaGate: parseFloat(document.getElementById('c-area').value)
        };

        const scores = Object.entries(SITE_DATA).map(([id, site]) => {
            if (site.body === 'Moon') return { name: 'Moon', color: site.color, similarity: 100 };
            if (site.area < targets.areaGate || site.slopeDiscipline * 100 < targets.slopeGate) {
                return { name: site.name, color: site.color, similarity: 0 };
            }
            const dist = Math.sqrt(
                (site.meanRough - targets.meanRough)**2 +
                (site.p95Rough - targets.p95Rough)**2
            );
            const sim = Math.max(0, 100 * (1 - dist / 3));
            return { name: site.name, color: site.color, similarity: Math.round(sim) };
        });

        const chartData = {
            labels: scores.map(s => s.name),
            datasets: [{
                label: 'Similarity %',
                data: scores.map(s => s.similarity),
                backgroundColor: scores.map(s => s.color),
                borderRadius: 6
            }]
        };
        if (this.chart) {
            this.chart.data = chartData;
            this.chart.update('none');
        } else this.chart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => `Similarity: ${ctx.parsed.y}%`
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { color: '#9aa0c3' } },
                    x: { ticks: { color: '#9aa0c3' } }
                }
            }
        });

        const notes = `Thresholds: mean roughness ${targets.meanRough} m, p95 hazard ${targets.p95Rough} m, at least ${targets.slopeGate}% of area within 3°, area ≥${targets.areaGate} km². Scores recalculate instantly.`;
        document.getElementById('calc-notes').textContent = notes;
    }
};

/* =========================== MISSION PLANNER WIZARD =========================== */

const Planner = {
    step: 0,
    answers: {},

    questions: [
        {
            q: 'What mission phase are you planning?',
            opts: [
                { val: 'landing', label: 'Landing Site Selection', note: 'Prioritize flat, hazard-free zones' },
                { val: 'training', label: 'Field Training Camp', note: 'Emphasize geological similarity' },
                { val: 'testing', label: 'Equipment Testbed', note: 'Balance slope + accessibility' }
            ]
        },
        {
            q: 'Which body is your destination?',
            opts: [
                { val: 'moon', label: 'Lunar South Pole', note: 'Permanent sunlight, extreme cold' },
                { val: 'mars', label: 'Mars Surface', note: 'Lower gravity, radiation' }
            ]
        },
        {
            q: 'What\'s your top priority?',
            opts: [
                { val: 'smooth', label: 'Smoothest terrain (lowest roughness)', note: 'Minimize hazard risk' },
                { val: 'large', label: 'Largest contiguous flat area', note: 'Enable infrastructure' },
                { val: 'balanced', label: 'Balanced criteria', note: 'Weighted compromise' }
            ]
        }
    ],

    start() {
        this.step = 0;
        this.answers = {};
        document.getElementById('planner-output').textContent = '';
        document.getElementById('planner-next').style.display = '';
        document.getElementById('planner-back').style.display = '';
        this.renderStep();
        document.getElementById('planner-next').onclick = () => this.next();
        document.getElementById('planner-back').onclick = () => this.back();
    },

    renderStep() {
        const container = document.getElementById('planner-steps');
        const q = this.questions[this.step];
        container.innerHTML = `
        <div class="planner-q">Step ${this.step+1}/${this.questions.length}: ${q.q}</div>
        <div class="opt-grid">
        ${q.opts.map(o => `
            <button class="opt ${this.answers[this.step]?.val === o.val ? 'sel' : ''}" type="button" aria-pressed="${this.answers[this.step]?.val === o.val}" data-val="${o.val}" onclick="Planner.choose('${o.val}', '${o.label}')">
            <strong>${o.label}</strong>
            <small>${o.note}</small>
            </button>
            `).join('')}
            </div>
            `;
            this.updateNav();
    },

    choose(val, label) {
        this.answers[this.step] = { val, label };
        this.renderStep();
    },

    back() {
        if (this.step > 0) {
            this.step--;
            this.renderStep();
        }
    },

    next() {
        if (this.answers[this.step]) {
            if (this.step < this.questions.length - 1) {
                this.step++;
                this.renderStep();
            } else {
                this.generateBrief();
            }
        } else {
            Toast.show('Please select an option first');
        }
    },

    generateBrief() {
        const dest = this.answers[1].val;
        const priority = this.answers[2].val;
        const reference = dest === 'moon' ? SITE_DATA.moon : SITE_DATA.jezero;
        const similarityToReference = site => dest === 'moon' ? site.vsMoon : Math.round(Math.max(0, 100 * (1 - Math.hypot(site.meanRough - reference.meanRough, site.p95Rough - reference.p95Rough) / 3)));

        const candidates = Object.entries(SITE_DATA)
        .filter(([id, s]) => s.body === 'Earth')
        .map(([id, s]) => ({ ...s, id }))
        .sort((a, b) => {
            if (priority === 'smooth') return a.meanRough - b.meanRough;
            if (priority === 'large') return b.area - a.area;
            return similarityToReference(b) - similarityToReference(a);
        });

        const top = candidates[0];

        const brief = `
        <div class="brief-card">
        <h3>Recommended Earth Analog: ${top.name}</h3>
        <p><b>Destination:</b> ${dest === 'moon' ? 'Lunar South Pole' : 'Mars Surface'}</p>
        <p><b>Priority:</b> ${this.answers[2].label}</p>
        <p><b>Terrain similarity:</b> ${similarityToReference(top)}% heuristic similarity to ${dest === 'moon' ? 'the lunar baseline' : 'Jezero roughness metrics'}.</p>
        <p><b>Why this site?</b> ${top.description} With ${top.area.toFixed(1)} km² of flat terrain and mean roughness of ${top.meanRough.toFixed(2)} m, it offers ${priority === 'smooth' ? 'exceptional smoothness' : priority === 'large' ? 'substantial contiguous area' : 'balanced characteristics'} for ${dest}-bound mission planning.</p>
        <p style="margin-top:10px;color:#9aa0c3;font-size:0.78rem"><b>Next steps:</b> Review terrain rasters in repository → plan field campaign → validate with local survey.</p>
        </div>
        `;

        document.getElementById('planner-output').innerHTML = brief;
        document.getElementById('planner-next').style.display = 'none';
        document.getElementById('planner-back').style.display = 'none';
    },

    updateNav() {
        document.getElementById('planner-back').style.display = this.step > 0 ? 'block' : 'none';
        document.getElementById('planner-next').textContent = this.step === this.questions.length - 1 ? 'Generate Brief' : 'Next →';
    }
};

/* =========================== COMPARATOR TABLE =========================== */

const Comparator = {
    activeBody: 'all',

    render() {
        const tbody = document.querySelector('#cmp-table tbody');
        tbody.innerHTML = Object.entries(SITE_DATA).map(([id, site]) => `
        <tr class="row-${site.body.toLowerCase()}" data-body="${site.body.toLowerCase()}">
        <td style="color:${site.color};font-weight:700">${site.name}</td>
        <td>${site.body}</td>
        <td class="mono">${site.area.toFixed(3)}</td>
        <td class="mono">${site.meanRough.toFixed(3)}</td>
        <td class="mono">${site.p95Rough.toFixed(3)}</td>
        <td><span class="sim-pill">${site.vsMoon}%</span></td>
        </tr>
        `).join('');

        this.renderPairs();
        document.querySelectorAll('.cmp-filter').forEach(button => {
            button.onclick = () => this.filterByBody(button.dataset.body);
        });
        this.filterByBody(this.activeBody);

        // Sorting
        document.querySelectorAll('#cmp-table th').forEach(th => {
            th.onclick = () => this.sort(th.dataset.sort, th);
            th.onkeydown = event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.sort(th.dataset.sort, th);
                }
            };
        });

        // Chart
        this.renderChart();
    },

    filterByBody(body) {
        this.activeBody = body;
        document.querySelectorAll('.cmp-filter').forEach(button => {
            const selected = button.dataset.body === body;
            button.classList.toggle('active', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        document.querySelectorAll('#cmp-table tbody tr').forEach(row => {
            row.hidden = body !== 'all' && row.dataset.body !== body;
        });
        document.querySelectorAll('#cross-cmp-table tbody tr').forEach(row => {
            row.hidden = body !== 'all' && row.dataset.bodyA !== body && row.dataset.bodyB !== body;
        });
    },

    renderPairs() {
        const sites = Object.values(SITE_DATA);
        const pairs = [];
        for (let first = 0; first < sites.length; first++) {
            for (let second = first + 1; second < sites.length; second++) {
                const siteA = sites[first];
                const siteB = sites[second];
                if (siteA.body === siteB.body) continue;
                const distance = Math.hypot(siteA.meanRough - siteB.meanRough, siteA.p95Rough - siteB.p95Rough);
                pairs.push({ siteA, siteB, similarity: Math.round(Math.max(0, 100 * (1 - distance / 3))) });
            }
        }
        pairs.sort((a, b) => b.similarity - a.similarity);
        document.querySelector('#cross-cmp-table tbody').innerHTML = pairs.map(({ siteA, siteB, similarity }) => `
        <tr data-body-a="${siteA.body.toLowerCase()}" data-body-b="${siteB.body.toLowerCase()}">
          <td>${siteA.name}</td><td>${siteA.body}</td><td>${siteB.name}</td><td>${siteB.body}</td>
          <td><span class="sim-pill">${similarity}%</span></td>
        </tr>`).join('');
    },

    sort(field, header) {
        const tbody = document.querySelector('#cmp-table tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const dir = header.getAttribute('aria-sort') === 'ascending' ? -1 : 1;
        document.querySelectorAll('#cmp-table th').forEach(th => th.setAttribute('aria-sort', 'none'));
        header.setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
        const column = { name: 0, body: 1, area: 2, rough: 3, p95: 4, sim: 5 }[field];
        if (column === undefined) return;

        rows.sort((a, b) => {
            const vals = [a, b].map(row => row.cells[column].textContent.trim());
            if (column >= 2) return dir * (Number(vals[0]) - Number(vals[1]));
            return dir * vals[0].localeCompare(vals[1]);
        });

        tbody.innerHTML = rows.map(r => r.outerHTML).join('');
    },

    renderChart() {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('cmp-chart').getContext('2d');
        const data = Object.values(SITE_DATA);
        const chartData = {
            labels: ['Mean roughness score', 'p95 roughness score', 'Flat-area score', 'Slope discipline'],
            datasets: data.map(site => ({
                label: site.name,
                data: [
                    Math.max(0, (4 - site.meanRough) / 4 * 100),
                    Math.max(0, (6 - site.p95Rough) / 6 * 100),
                    Math.min(site.area, 300) / 3,
                    site.slopeDiscipline * 100
                ],
                borderColor: site.color,
                backgroundColor: site.color + '20',
                fill: true
            }))
        };
        if (window.cmpChart) {
            window.cmpChart.data = chartData;
            window.cmpChart.update('none');
            return;
        }

        window.cmpChart = new Chart(ctx, {
            type: 'radar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    r: {
                        min: 0, max: 100,
                        ticks: { color: '#9aa0c3' },
                        pointLabels: { color: '#e8eaf6' }
                    }
                }
            }
        });
    }
};

/* =========================== TOAST NOTIFICATIONS =========================== */

const Toast = {
    show(msg) {
        const root = document.getElementById('toast-root');
        const el = document.createElement('div');
        el.className = 'toast';
        el.textContent = msg;
        root.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }
};

/* =========================== INIT =========================== */

document.addEventListener('DOMContentLoaded', () => {
    Starfield.init();
    Cache.init();
    Discovery.renderCacheStats();

    // Wire up discovery lab
    document.getElementById('disc-run').onclick = () => {
        const lat = parseFloat(document.getElementById('disc-lat').value);
        const lng = parseFloat(document.getElementById('disc-lng').value);
        if (!isFinite(lat) || !isFinite(lng)) {
            Toast.show('Enter valid coordinates');
            return;
        }
        Discovery.analyze(lat, lng);
    };

    document.getElementById('disc-random').onclick = () => Discovery.random();

    // Hero stats animation
    if (window.gsap) {
        gsap.to('#stat-sites', { innerHTML: 5, duration: 1, snap: { innerHTML: 1 } });
        gsap.to('#stat-bodies', { innerHTML: 3, duration: 1, snap: { innerHTML: 1 } });
    }
});

// Export for inline handlers
window.UI = UI;
window.Discovery = Discovery;
window.Cache = Cache;
window.Selector = Selector;
window.Calculator = Calculator;
window.Planner = Planner;
window.Comparator = Comparator;
window.Toast = Toast;
