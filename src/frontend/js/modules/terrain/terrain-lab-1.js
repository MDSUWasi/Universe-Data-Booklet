/* 3D Terrain Lab: loads local DEM windows and renders them with Three.js.
   Classic script: registers window.TerrainLab. */
'use strict';

(function () {
    const T = {
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
        // Incremented on every loadSelectedSite call so a slow in-flight
        // load for an older site cannot overwrite the geometry of a newer one.
        _loadGen: 0,

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
            bodySelect.addEventListener('change', () => { this.populateSites(bodySelect.value); this.loadSelectedSite(); });
            siteSelect.addEventListener('change', () => this.loadSelectedSite());
            modeSelect.addEventListener('change', () => { this.mode = modeSelect.value; this.updateGeometry(); });
            exaggeration.addEventListener('input', () => {
                this.exaggeration = Number(exaggeration.value);
                document.getElementById('terrain-exaggeration-value').textContent = this.exaggeration + '\u00d7';
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
        }
    };

    window.TerrainLab = T;
})();