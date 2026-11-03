/* Data-backed terrain, patch, and scale-sensitivity views. */

const TerrainLab = {
    assets: new Map(),
    site: null,
    mode: 'elevation',
    renderer: null,
    scene: null,
    camera: null,
    mesh: null,
    geometry: null,
    exaggeration: 4,
    pointer: null,
    rotationX: -0.75,
    rotationY: 0.45,
    initialized: false,

    open() {
        if (!this.initialized) this.initialize();
        const body = document.getElementById('terrain-body').value;
        this.populateSites(body);
        this.loadSelectedSite();
    },

    initialize() {
        this.initialized = true;
        const bodySelect = document.getElementById('terrain-body');
        const siteSelect = document.getElementById('terrain-site');
        const modeSelect = document.getElementById('terrain-mode');
        const exaggeration = document.getElementById('terrain-exaggeration');
        bodySelect.addEventListener('change', () => {
            this.populateSites(bodySelect.value);
            this.loadSelectedSite();
        });
        siteSelect.addEventListener('change', () => this.loadSelectedSite());
        modeSelect.addEventListener('change', () => {
            this.mode = modeSelect.value;
            this.updateGeometry();
        });
        exaggeration.addEventListener('input', () => {
            this.exaggeration = Number(exaggeration.value);
            document.getElementById('terrain-exaggeration-value').textContent = `${this.exaggeration}×`;
            this.updateGeometry();
        });
        this.createRenderer();
    },

    populateSites(body) {
        const sites = Object.values(window.SITE_DATA).filter(site => site.body === body);
        const select = document.getElementById('terrain-site');
        select.replaceChildren(...sites.map(site => {
            const option = document.createElement('option');
            option.value = site.id;
            option.textContent = site.name;
            return option;
        }));
        this.site = sites[0] || null;
    },

    createRenderer() {
        const canvas = document.getElementById('terrain-canvas');
        if (!window.THREE || !canvas) {
            this.setStatus('Three.js could not load. Check the CDN connection and reopen the lab.');
            return;
        }
        try {
            this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
        } catch {
            this.setStatus('WebGL is unavailable in this browser. The terrain data is still available in the repository.');
            return;
        }
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#080b12');
        this.scene.add(new THREE.HemisphereLight(0xdce9ff, 0x141820, 2.0));
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
        keyLight.position.set(-2, 4, 3);
        this.scene.add(keyLight);
        this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
        this.camera.position.set(0, 2.25, 2.9);
        this.camera.lookAt(0, 0, 0);
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(canvas.parentElement);
        this.bindPointer(canvas);
        this.resize();
    },

    bindPointer(canvas) {
        canvas.addEventListener('pointerdown', event => {
            this.pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
            canvas.setPointerCapture(event.pointerId);
        });
        canvas.addEventListener('pointermove', event => {
            if (!this.pointer || this.pointer.id !== event.pointerId) return;
            this.rotationY += (event.clientX - this.pointer.x) * 0.008;
            this.rotationX = Math.max(-1.35, Math.min(-0.15, this.rotationX + (event.clientY - this.pointer.y) * 0.006));
            this.pointer.x = event.clientX;
            this.pointer.y = event.clientY;
            this.render();
        });
        const endDrag = event => {
            if (this.pointer?.id === event.pointerId) this.pointer = null;
        };
        canvas.addEventListener('pointerup', endDrag);
        canvas.addEventListener('pointercancel', endDrag);
        canvas.addEventListener('wheel', event => {
            event.preventDefault();
            this.camera.position.multiplyScalar(event.deltaY > 0 ? 1.08 : 0.92);
            this.camera.position.clampLength(1.7, 6);
            this.render();
        }, { passive: false });
    },

    resize() {
        if (!this.renderer || !this.camera) return;
        const canvas = this.renderer.domElement;
        const width = Math.max(1, canvas.clientWidth);
        const height = Math.max(1, canvas.clientHeight);
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.render();
    },

    async loadSelectedSite() {
        const id = document.getElementById('terrain-site').value;
        const site = Object.values(window.SITE_DATA).find(candidate => candidate.id === id);
        if (!site) return;
        this.site = site;
        this.setStatus(`Loading ${site.name} DEM window…`);
        try {
            let asset = this.assets.get(id);
            if (!asset) {
                const response = await fetch(`assets/terrain/${encodeURIComponent(id)}.json`);
                if (!response.ok) throw new Error(`Terrain asset returned HTTP ${response.status}`);
                asset = await response.json();
                this.validateAsset(asset, id);
                this.assets.set(id, asset);
            }
            this.asset = asset;
            this.updateGeometry();
            document.getElementById('terrain-meta').innerHTML = `
                <span>Source: <strong>${asset.source_dem}</strong></span>
                <span>Window: <strong>${asset.window_m} m</strong></span>
                <span>Valid non-filled cells: <strong>${(asset.valid_fraction * 100).toFixed(1)}%</strong></span>
                <span>≤3° screen: <strong>${(asset.slope_screen_fraction * 100).toFixed(1)}%</strong></span>
                <span>Elevation range: <strong>${asset.elevation_min_m.toFixed(1)}–${asset.elevation_max_m.toFixed(1)} m</strong></span>
            `;
            this.setStatus(`${site.name} terrain loaded from local DEM assets.`);
        } catch (error) {
            this.setStatus(`Terrain unavailable: ${error.message}`);
        }
    },

    validateAsset(asset, id) {
        const expected = asset.grid_size * asset.grid_size;
        if (asset.id !== id || asset.schema_version !== 1 || asset.grid_size !== 128) {
            throw new Error('Unsupported or mismatched terrain asset');
        }
        for (const key of ['elevation_u8', 'slope_u8', 'roughness_u8', 'valid_mask', 'slope_screen_mask']) {
            if (!Array.isArray(asset[key]) || asset[key].length !== expected) {
                throw new Error(`Terrain asset has an invalid ${key} grid`);
            }
        }
    },

    updateGeometry() {
        if (!this.asset || !window.THREE || !this.scene) return;
        const size = this.asset.grid_size;
        const elevations = this.asset.elevation_u8;
        const slopes = this.asset.slope_u8;
        const roughness = this.asset.roughness_u8;
        const valid = this.asset.valid_mask;
        const safe = this.asset.slope_screen_mask;
        const positions = new Float32Array(size * size * 3);
        const colors = new Float32Array(size * size * 3);
        const color = new THREE.Color();
        const useElevation = this.mode === 'elevation' || this.mode === 'safe';
        const unitsScale = this.mode === 'slope' ? this.asset.slope_scale_deg : this.asset.roughness_scale_m;
        const values = this.mode === 'slope' ? slopes : roughness;

        for (let row = 0; row < size; row++) {
            for (let column = 0; column < size; column++) {
                const index = row * size + column;
                const positionIndex = index * 3;
                const value = values[index] / 255 * unitsScale;
                const height = useElevation
                    ? (elevations[index] / 255 - 0.5) * 0.34 * this.exaggeration
                    : value / unitsScale * 0.34 * this.exaggeration;
                positions[positionIndex] = (column / (size - 1) - 0.5) * 2;
                positions[positionIndex + 1] = valid[index] ? height : -0.18;
                positions[positionIndex + 2] = (row / (size - 1) - 0.5) * 2;

                if (!valid[index]) {
                    color.set('#252a33');
                } else if (this.mode === 'safe') {
                    color.set(safe[index] ? '#55d6a5' : '#e16b63');
                } else if (this.mode === 'elevation') {
                    color.setHSL(0.58 - elevations[index] / 255 * 0.48, 0.68, 0.42 + elevations[index] / 255 * 0.12);
                } else {
                    const intensity = Math.min(1, value / unitsScale);
                    color.setHSL(0.34 - intensity * 0.33, 0.78, 0.46);
                }
                colors[positionIndex] = color.r;
                colors[positionIndex + 1] = color.g;
                colors[positionIndex + 2] = color.b;
            }
        }

        const indices = [];
        for (let row = 0; row < size - 1; row++) {
            for (let column = 0; column < size - 1; column++) {
                const topLeft = row * size + column;
                const topRight = topLeft + 1;
                const bottomLeft = topLeft + size;
                const bottomRight = bottomLeft + 1;
                if (valid[topLeft] && valid[topRight] && valid[bottomLeft]) {
                    indices.push(topLeft, bottomLeft, topRight);
                }
                if (valid[topRight] && valid[bottomLeft] && valid[bottomRight]) {
                    indices.push(topRight, bottomLeft, bottomRight);
                }
            }
        }

        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.geometry.setIndex(indices);
        this.geometry.computeVertexNormals();
        this.mesh = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.9,
            metalness: 0.02,
            side: THREE.DoubleSide
        }));
        this.mesh.rotation.set(this.rotationX, this.rotationY, 0);
        this.scene.add(this.mesh);
        this.render();
    },

    render() {
        if (!this.renderer || !this.scene || !this.camera) return;
        if (this.mesh) this.mesh.rotation.set(this.rotationX, this.rotationY, 0);
        this.renderer.render(this.scene, this.camera);
    },

    setStatus(message) {
        const element = document.getElementById('terrain-status');
        if (element) element.textContent = message;
    }
};

const PatchExplorer = {
    records: null,
    initialized: false,
    async open() {
        if (!this.initialized) {
            document.getElementById('patch-body').addEventListener('change', () => this.render());
            document.getElementById('patch-kind').addEventListener('change', () => this.render());
            this.initialized = true;
        }
        if (!this.records) {
            this.setStatus('Loading committed patch report…');
            try {
                const response = await fetch('/api/patches');
                if (!response.ok) throw new Error(`Patch report returned HTTP ${response.status}`);
                const data = await response.json();
                this.records = data.records;
            } catch (error) {
                this.setStatus(`Patch report unavailable: ${error.message}`);
                return;
            }
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
        document.getElementById('patch-count').textContent = `${records.length} of ${this.records.length} recorded patches`;
        if (!records.length && bodyFilter === 'Mars') {
            this.setStatus('No Mars patch-level records are present in analog_comparison.csv. Jezero is available in the site-summary report, but its patch classifications are not in this checkout.');
        } else if (!records.length) {
            this.setStatus('No recorded patches match these filters.');
        } else {
            this.setStatus('Source: output/reports/analog_comparison.csv. Values and flags are shown as recorded.');
        }
    },
    number(value, digits) {
        return Number.isFinite(value) ? value.toFixed(digits) : '—';
    },
    setStatus(message) {
        document.getElementById('patch-status').textContent = message;
    }
};

const ScaleSensitivity = {
    data: null,
    chart: null,
    async open() {
        if (!this.data) {
            document.getElementById('scale-status').textContent = 'Loading recorded fingerprints and matched-window reference…';
            try {
                const response = await fetch('/api/scale-sensitivity');
                if (!response.ok) throw new Error(`Scale data returned HTTP ${response.status}`);
                this.data = await response.json();
            } catch (error) {
                document.getElementById('scale-status').textContent = `Scale data unavailable: ${error.message}`;
                return;
            }
        }
        this.render();
    },
    render() {
        const { fingerprints, comparison_reference: reference, fingerprint_window_m: shortWindow, comparison_window_m: longWindow, warning } = this.data;
        const labels = fingerprints.map(point => `Patch ${point.patch_id} (${shortWindow} m)`).concat([`Main reference (${longWindow} m)`]);
        const means = fingerprints.map(point => point.roughness_mean_m).concat([reference.mean_roughness_m]);
        const p95s = fingerprints.map(point => point.roughness_p95_m).concat([reference.p95_roughness_m]);
        document.getElementById('scale-summary').textContent = warning;
        document.getElementById('scale-status').textContent = `Recorded ${shortWindow} m fingerprints: mean ${means.slice(0, -1).map(value => value.toFixed(3)).join(', ')} m. ${longWindow} m reference: mean ${reference.mean_roughness_m.toFixed(3)} m, p95 ${reference.p95_roughness_m.toFixed(3)} m.`;
        if (typeof Chart === 'undefined') return;
        const canvas = document.getElementById('scale-chart');
        const data = {
            labels,
            datasets: [
                { label: 'Mean roughness (m)', data: means, backgroundColor: '#55d6a5' },
                { label: 'p95 roughness (m)', data: p95s, backgroundColor: '#f5c451' }
            ]
        };
        if (this.chart) {
            this.chart.data = data;
            this.chart.update('none');
            return;
        }
        this.chart = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#e8eaf6' } } },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Roughness (m)', color: '#9aa0c3' }, ticks: { color: '#9aa0c3' } },
                    x: { ticks: { color: '#e8eaf6', maxRotation: 0, minRotation: 0 } }
                }
            }
        });
    }
};

window.TerrainLab = TerrainLab;
window.PatchExplorer = PatchExplorer;
window.ScaleSensitivity = ScaleSensitivity;
