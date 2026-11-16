/* MapViewer: three.js planetary globe views for Earth / Moon / Mars +
   orbital space views for Asteroids and Exoplanets.
   Earth shows the planet only — no site data. Moon and Mars show landing sites.
   Self-contained orbit controls (no THREE.OrbitControls dependency).
   Fixed: friction, scaling, black screen issues. Enhanced visual quality. */
'use strict';

(function () {
    window.fmt = function (n, decimals) {
        if (n === null || n === undefined || !Number.isFinite(n)) return '—';
        return Number(n).toLocaleString(undefined, {
            minimumFractionDigits: decimals === undefined ? 2 : decimals,
            maximumFractionDigits: decimals === undefined ? 2 : decimals,
        });
    };

    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#039;');
    }

    function showToast(msg, type) {
        if (window.showToast) window.showToast(msg, type || 'info');
    }

    // ---- Self-contained Orbit Controls (Fixed friction & damping) ----
    function OrbitControls(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = new THREE.Vector3(0, 0, 0);

        this.enableDamping = true;
        this.dampingFactor = 0.08;
        this.enableZoom = true;
        this.enableRotate = true;
        this.enablePan = false;
        this.minDistance = 1;
        this.maxDistance = 100;
        this.autoRotate = false;
        this.autoRotateSpeed = 0.3;

        this._isMouseDown = false;
        this._mouseButtons = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };
        this._state = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2 };
        this._stateCurrent = this._state.NONE;
        this._mousePrev = new THREE.Vector2();
        this._spherical = new THREE.Spherical();
        this._sphericalDelta = new THREE.Spherical();
        this._scale = 1;
        this._panOffset = new THREE.Vector3();
        this._zoomChanged = false;
        this._rotateStart = new THREE.Vector2();
        this._rotateEnd = new THREE.Vector2();
        this._rotateDelta = new THREE.Vector2();
        this._panStart = new THREE.Vector2();
        this._panEnd = new THREE.Vector2();
        this._panDelta = new THREE.Vector2();
        this._dollyStart = new THREE.Vector2();
        this._dollyEnd = new THREE.Vector2();
        this._dollyDelta = new THREE.Vector2();

        const scope = this;

        function getMouseOnCircle(pageX, pageY) {
            const rect = domElement.getBoundingClientRect();
            return new THREE.Vector2(
                ((pageX - rect.left) / rect.width) * 2 - 1,
                -((pageY - rect.top) / rect.height) * 2 + 1
            );
        }

        function rotateCamera() {
            const angle = 2 * Math.PI * scope._rotateDelta.x / domElement.clientHeight;
            scope._spherical.theta += angle;
            const phiDelta = 2 * Math.PI * scope._rotateDelta.y / domElement.clientHeight;
            scope._spherical.phi = Math.max(0.001, Math.min(Math.PI - 0.001, scope._spherical.phi + phiDelta));
        }

        function dollyCamera(dollyScale) {
            scope._spherical.radius *= dollyScale;
            scope._spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, scope._spherical.radius));
            scope._zoomChanged = true;
        }

        function panCamera() {
            const mouseChange = scope._panEnd.clone().sub(scope._panStart);
            if (mouseChange.lengthSq() === 0) return;
            mouseChange.multiplyScalar(scope._spherical.radius * 0.001);
            scope._panOffset.copy(mouseChange).applyMatrix4(scope.camera.matrix);
            scope.target.add(scope._panOffset);
        }

        function update() {
            if (scope.enableRotate && !scope.autoRotate) {
                rotateCamera();
            }
            if (scope.autoRotate) {
                scope._spherical.theta += 0.001 * scope.autoRotateSpeed;
            }
            scope._spherical.makeSafe();
            scope.camera.position.setFromSpherical(scope._spherical);
            scope.camera.position.add(scope.target);
            scope.camera.lookAt(scope.target);

            if (scope.enableDamping) {
                scope._rotateDelta.multiplyScalar(1 - scope.dampingFactor);
                scope._panDelta.multiplyScalar(1 - scope.dampingFactor);
                scope._scale = 1 + (scope._scale - 1) * (1 - scope.dampingFactor);
            }
        }

        function onMouseDown(event) {
            event.preventDefault();
            scope._mousePrev.set(event.clientX, event.clientY);
            if (event.button === scope._mouseButtons.LEFT) scope._stateCurrent = scope._state.ROTATE;
            else if (event.button === scope._mouseButtons.MIDDLE) scope._stateCurrent = scope._state.DOLLY;
            else if (event.button === scope._mouseButtons.RIGHT) scope._stateCurrent = scope._state.PAN;
            scope._isMouseDown = true;
            scope._rotateStart.copy(scope._mousePrev);
            scope._dollyStart.copy(scope._mousePrev);
            scope._panStart.copy(scope._mousePrev);
            domElement.style.cursor = scope._stateCurrent === scope._state.ROTATE ? 'grab' : (scope._stateCurrent === scope._state.PAN ? 'grabbing' : 'default');
        }

        function onMouseMove(event) {
            if (!scope._isMouseDown) return;
            const mouseNew = new THREE.Vector2(event.clientX, event.clientY);
            const deltaX = mouseNew.x - scope._mousePrev.x;
            const deltaY = mouseNew.y - scope._mousePrev.y;
            scope._mousePrev.copy(mouseNew);

            if (scope._stateCurrent === scope._state.ROTATE && scope.enableRotate) {
                scope._rotateEnd.set(event.clientX, event.clientY);
                scope._rotateDelta.subVectors(scope._rotateEnd, scope._rotateStart).multiplyScalar(-1);
                scope._rotateStart.copy(scope._rotateEnd);
            } else if (scope._stateCurrent === scope._state.DOLLY && scope.enableZoom) {
                scope._dollyEnd.set(event.clientX, event.clientY);
                scope._dollyDelta.subVectors(scope._dollyEnd, scope._dollyStart);
                const dollyScale = Math.pow(0.95, scope._dollyDelta.y);
                dollyCamera(dollyScale);
                scope._dollyStart.copy(scope._dollyEnd);
            } else if (scope._stateCurrent === scope._state.PAN && scope.enablePan) {
                scope._panEnd.set(event.clientX, event.clientY);
                scope._panDelta.subVectors(scope._panEnd, scope._panStart);
                scope._panStart.copy(scope._panEnd);
            }
        }

        function onMouseUp() {
            scope._isMouseDown = false;
            scope._stateCurrent = scope._state.NONE;
            domElement.style.cursor = 'grab';
        }

        function onMouseWheel(event) {
            event.preventDefault();
            if (!scope.enableZoom) return;
            const delta = event.deltaY < 0 ? 0.95 : 1.05;
            dollyCamera(delta);
        }

        function onContextMenu(event) {
            event.preventDefault();
        }

        function onTouchStart(event) {
            if (event.touches.length === 1) {
                const touch = event.touches[0];
                onMouseDown({ clientX: touch.clientX, clientY: touch.clientY, button: 0, preventDefault: () => event.preventDefault() });
            } else if (event.touches.length === 2) {
                const dx = event.touches[0].clientX - event.touches[1].clientX;
                const dy = event.touches[0].clientY - event.touches[1].clientY;
                scope._touchDistance = Math.sqrt(dx * dx + dy * dy);
                scope._stateCurrent = scope._state.DOLLY;
            }
        }

        function onTouchMove(event) {
            event.preventDefault();
            if (event.touches.length === 1 && scope._stateCurrent === scope._state.ROTATE) {
                const touch = event.touches[0];
                onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
            } else if (event.touches.length === 2 && scope._stateCurrent === scope._state.DOLLY) {
                const dx = event.touches[0].clientX - event.touches[1].clientX;
                const dy = event.touches[0].clientY - event.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (scope._touchDistance) {
                    const dollyScale = scope._touchDistance / distance;
                    dollyCamera(dollyScale);
                    scope._touchDistance = distance;
                }
            }
        }

        function onTouchEnd() {
            scope._isMouseDown = false;
            scope._stateCurrent = scope._state.NONE;
            scope._touchDistance = null;
        }

        domElement.addEventListener('mousedown', onMouseDown, false);
        domElement.addEventListener('wheel', onMouseWheel, { passive: false });
        domElement.addEventListener('contextmenu', onContextMenu, false);
        domElement.addEventListener('touchstart', onTouchStart, { passive: false });
        domElement.addEventListener('touchmove', onTouchMove, { passive: false });
        domElement.addEventListener('touchend', onTouchEnd, false);

        window.addEventListener('mousemove', onMouseMove, false);
        window.addEventListener('mouseup', onMouseUp, false);

        this.update = update;
        this.dispose = function () {
            domElement.removeEventListener('mousedown', onMouseDown);
            domElement.removeEventListener('wheel', onMouseWheel);
            domElement.removeEventListener('contextmenu', onContextMenu);
            domElement.removeEventListener('touchstart', onTouchStart);
            domElement.removeEventListener('touchmove', onTouchMove);
            domElement.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }

    OrbitControls.prototype.updateSpherical = function () {
        const scope = this;
        scope._spherical.setFromVector3(scope.camera.position.clone().sub(scope.target));
    };

    // ---- Module State ----
    const M = {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        container: null,
        canvas: null,
        raycaster: null,
        pointer: null,
        initialized: false,
        currentLayer: 'earth',
        spaceMode: false,
        planetMesh: null,
        planetGroup: null,
        atmosphereMesh: null,
        cloudsMesh: null,
        starfield: null,
        siteMarkers: [],
        siteLabels: [],
        landingSites: [],
        spaceData: { asteroids: null, exoplanets: null },
        spaceView: 'all',
        spaceTime: 0,
        spaceOrbitGroup: null,
        detailPanel: null,
        detailCloseBtn: null,
        detailNameEl: null,
        detailBodyEl: null,
        detailMetricsEl: null,
        searchInput: null,
        sitesListEl: null,
        sitesHeadingEl: null,
        statusEl: null,
        disclaimerEl: null,
        activeSiteId: null,
    };

    const PLANET_TEXTURES = {
        earth: '/assets/encyclopedia/earth.jpg',
        moon: '/assets/encyclopedia/moon.jpg',
        mars: '/assets/encyclopedia/mars.jpg',
    };

    const PLANET_INFO = {
        earth: { name: 'Earth', radius: 1, hasSites: false, color: 0x4E8C6E, axialTilt: 0.41, rotationSpeed: 0.002 },
        moon: { name: 'Moon', radius: 0.27, hasSites: true, color: 0xC9821A, axialTilt: 0.02, rotationSpeed: 0.0005 },
        mars: { name: 'Mars', radius: 0.53, hasSites: true, color: 0xF08080, axialTilt: 0.44, rotationSpeed: 0.0018 },
    };

    const LANDING_SITES = {
        moon: [
            { id: 'shackleton', name: 'Lunar South Pole (Shackleton)', lat: -89.9, lng: 0.0, body: 'Moon', siteClass: 'lunar baseline', area: 3.875, meanRough: 2.462, p95Rough: 4.138, maxRough: 7.775, description: 'Permanently shadowed crater floor with nearby peaks of eternal light. Prime candidate for water-ice harvesting and sustained lunar presence.' },
            { id: 'tycho', name: 'Tycho Crater', lat: -43.4, lng: 11.2, body: 'Moon', siteClass: 'young impact site', area: 12.5, meanRough: 3.120, p95Rough: 5.480, maxRough: 9.210, description: 'A young, prominent impact crater with bright rays and a steep central peak. Rough ejecta blanket makes it a hazard-rich landing reference.' },
            { id: 'maris', name: 'Mare Serenitatis', lat: 26.0, lng: 18.0, body: 'Moon', siteClass: 'mare site', area: 45.0, meanRough: 1.890, p95Rough: 3.210, maxRough: 5.430, description: 'A broad, dark basaltic mare formed by ancient lava flows. Relatively smooth terrain suitable for rover traverses.' },
            { id: 'apennines', name: 'Montes Apenninus', lat: 20.0, lng: -3.5, body: 'Moon', siteClass: 'highland site', area: 8.0, meanRough: 4.340, p95Rough: 7.120, maxRough: 11.800, description: 'Rugged lunar mountain range forming the rim of Mare Imbrium. Steep slopes and shadowed valleys — a highland site for challenging terrain.' },
        ],
        mars: [
            { id: 'jezero', name: 'Jezero Crater', lat: 18.4, lng: 77.6, body: 'Mars', siteClass: 'martian reference', area: 506.277, meanRough: 2.110, p95Rough: 3.744, maxRough: 7.600, description: "Perseverance's landing region — an ancient delta fan and lakebed. A benchmark for Martian terrain and the search for past microbial life." },
            { id: 'gusev', name: 'Gusev Crater', lat: -14.6, lng: 175.5, body: 'Mars', siteClass: 'lakebed site', area: 210.0, meanRough: 2.780, p95Rough: 4.520, maxRough: 7.310, description: "Spirit rover's landing site — a crater that may once have held a lake. Sedimentary deposits and volcanic plains make it a diverse geological site." },
            { id: 'gale', name: 'Gale Crater', lat: -4.6, lng: 137.4, body: 'Mars', siteClass: 'mound site', area: 300.0, meanRough: 2.450, p95Rough: 3.980, maxRough: 6.890, description: "Curiosity rover's landing site, dominated by Mount Sharp, a layered sedimentary mound preserving Mars' environmental history." },
            { id: 'eos_chasma', name: 'Eos Chasma', lat: -12.0, lng: 315.0, body: 'Mars', siteClass: 'canyon site', area: 180.0, meanRough: 3.910, p95Rough: 6.230, maxRough: 10.450, description: 'A large canyon in the Valles Marineris system. Steep walls, landslide deposits, and layered strata — a challenging deep-canyon site.' },
            { id: 'hellas', name: 'Hellas Planitia', lat: -43.0, lng: 70.0, body: 'Mars', siteClass: 'impact basin site', area: 600.0, meanRough: 1.760, p95Rough: 2.940, maxRough: 4.820, description: 'One of the largest impact basins in the Solar System. Its floor is the lowest elevation on Mars and may host seasonal frost and dust devils.' },
        ],
    };

    function $(id) { return document.getElementById(id); }

    function initDOMRefs() {
        M.detailPanel = $('map-detail');
        M.detailCloseBtn = $('map-detail-close');
        M.detailNameEl = $('map-detail-name');
        M.detailBodyEl = $('map-detail-body');
        M.detailMetricsEl = $('map-detail-metrics');
        M.searchInput = $('map-search');
        M.sitesListEl = $('map-sites-list');
        M.sitesHeadingEl = M.sitesListEl ? M.sitesListEl.parentElement?.querySelector('h4') : null;
        M.statusEl = $('map-status');
        M.disclaimerEl = $('map-disclaimer');
    }

    function clearDetail() {
        if (!M.detailPanel) return;
        M.detailPanel.style.transform = 'translateY(100%)';
        M.detailPanel.style.opacity = '0';
    }

    function renderDetail(site) {
        if (!M.detailPanel) return;
        M.detailNameEl.textContent = escapeHtml(site.name);
        M.detailBodyEl.textContent = escapeHtml(site.body) + ' • ' + escapeHtml(site.siteClass || '') + ' • ' + escapeHtml(site.region || '');
        M.detailMetricsEl.innerHTML =
            '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.5rem;background:rgba(255,255,255,0.02);">' +
            '<div style="font-size:0.65rem;color:var(--color-space-500);text-transform:uppercase;">Flat area</div>' +
            '<div style="font-weight:600;color:var(--color-space-100);">' + window.fmt(site.area) + ' km²</div></div>' +
            '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.5rem;background:rgba(255,255,255,0.02);">' +
            '<div style="font-size:0.65rem;color:var(--color-space-500);text-transform:uppercase;">Mean rough</div>' +
            '<div style="font-weight:600;color:var(--color-space-100);">' + window.fmt(site.meanRough) + ' m</div></div>' +
            '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.5rem;background:rgba(255,255,255,0.02);">' +
            '<div style="font-size:0.65rem;color:var(--color-space-500);text-transform:uppercase;">p95 rough</div>' +
            '<div style="font-weight:600;color:var(--color-space-100);">' + window.fmt(site.p95Rough) + ' m</div></div>' +
            '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.5rem;background:rgba(255,255,255,0.02);">' +
            '<div style="font-size:0.65rem;color:var(--color-space-500);text-transform:uppercase;">Coordinates</div>' +
            '<div style="font-weight:600;color:var(--color-space-100);">' + window.fmt(site.lat, 2) + ', ' + window.fmt(site.lng, 2) + '</div></div>';
        if (site.description) {
            M.detailMetricsEl.innerHTML += '<p style="font-size:0.75rem;color:var(--color-space-300);margin:0.75rem 0 0 0;line-height:1.5;grid-column:1/-1;">' + escapeHtml(site.description) + '</p>';
        }
        M.detailPanel.style.transform = 'translateY(0)';
        M.detailPanel.style.opacity = '1';
        if (M.detailCloseBtn) M.detailCloseBtn.onclick = () => clearDetail();
    }

    function latLngToVector(lat, lng, radius) {
        const phi = (90 - lat) * Math.PI / 180;
        const theta = (lng + 180) * Math.PI / 180;
        const x = -radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.cos(theta);
        return new THREE.Vector3(x, y, z);
    }

    function createStarfield() {
        const count = 3000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            const r = 80 + Math.random() * 120;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);

            const colorChoice = Math.random();
            if (colorChoice < 0.6) {
                colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.9;
            } else if (colorChoice < 0.85) {
                colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.6;
            } else {
                colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 1.0;
            }
            sizes[i] = 0.3 + Math.random() * 0.7;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
        });

        const points = new THREE.Points(geo, mat);
        M.scene.add(points);
        M.starfield = points;
        return points;
    }

    function createPlanet(bodyKey) {
        const info = PLANET_INFO[bodyKey];
        if (!info) return null;

        if (M.planetGroup) {
            M.scene.remove(M.planetGroup);
            disposeObject(M.planetGroup);
            M.planetGroup = null;
        }
        M.planetMesh = null;
        M.atmosphereMesh = null;
        M.cloudsMesh = null;

        M.siteMarkers.forEach(m => M.scene.remove(m));
        M.siteMarkers = [];
        M.siteLabels.forEach(l => M.scene.remove(l));
        M.siteLabels = [];

        M.planetGroup = new THREE.Group();
        M.planetGroup.name = 'planet-' + bodyKey;
        M.scene.add(M.planetGroup);

        const geometry = new THREE.SphereGeometry(info.radius, 128, 128);

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(
            PLANET_TEXTURES[bodyKey],
            (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.anisotropy = M.renderer.capabilities.getMaxAnisotropy();
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.needsUpdate = true;
                if (M.planetMesh && M.planetMesh.material && M.planetMesh.material.map === tex) {
                    M.planetMesh.material.needsUpdate = true;
                }
            },
            undefined,
            (err) => {
                console.warn('Failed to load texture for ' + bodyKey + ':', err);
                // Fallback: create a simple colored material
                if (M.planetMesh) {
                    const fallbackColor = PLANET_INFO[bodyKey].color;
                    M.planetMesh.material = new THREE.MeshStandardMaterial({
                        color: fallbackColor,
                        roughness: bodyKey === 'earth' ? 0.6 : bodyKey === 'moon' ? 0.9 : 0.8,
                        metalness: bodyKey === 'earth' ? 0.1 : 0.0,
                    });
                }
            }
        );

        let material;
        if (bodyKey === 'earth') {
            material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.6,
                metalness: 0.1,
                envMapIntensity: 1.0,
            });
        } else if (bodyKey === 'moon') {
            material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.9,
                metalness: 0.0,
                envMapIntensity: 0.3,
            });
        } else {
            material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.8,
                metalness: 0.05,
                envMapIntensity: 0.5,
            });
        }

        M.planetMesh = new THREE.Mesh(geometry, material);
        M.planetMesh.name = 'surface-' + bodyKey;
        M.planetMesh.castShadow = true;
        M.planetMesh.receiveShadow = true;
        M.planetGroup.add(M.planetMesh);

        if (bodyKey === 'earth') {
            const atmoGeo = new THREE.SphereGeometry(info.radius * 1.025, 64, 64);
            const atmoMat = new THREE.MeshBasicMaterial({
                color: 0x4da6ff,
                transparent: true,
                opacity: 0.12,
                side: THREE.BackSide,
                depthWrite: false,
            });
            M.atmosphereMesh = new THREE.Mesh(atmoGeo, atmoMat);
            M.planetGroup.add(M.atmosphereMesh);

            // Official NASA-based Earth clouds texture (Solar System Scope / NASA Blue Marble)
            const cloudGeo = new THREE.SphereGeometry(info.radius * 1.015, 64, 64);
            const cloudTex = textureLoader.load(
                '/assets/encyclopedia/earth_clouds.jpg',
                (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    tex.wrapS = THREE.RepeatWrapping;
                    tex.wrapT = THREE.RepeatWrapping;
                    tex.anisotropy = M.renderer.capabilities.getMaxAnisotropy();
                    tex.needsUpdate = true;
                },
                undefined,
                (err) => {
                    console.warn('Failed to load Earth clouds texture:', err);
                }
            );
            const cloudMat = new THREE.MeshStandardMaterial({
                map: cloudTex,
                transparent: true,
                opacity: 0.55,
                depthWrite: false,
                alphaMap: cloudTex,
                side: THREE.DoubleSide,
            });
            M.cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
            M.planetGroup.add(M.cloudsMesh);

            const glowGeo = new THREE.SphereGeometry(info.radius * 1.04, 64, 64);
            const glowMat = new THREE.ShaderMaterial({
                uniforms: {
                    uColor: { value: new THREE.Color(0x4da6ff) },
                    uRadius: { value: info.radius },
                },
                vertexShader: `
                    varying vec3 vNormal;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 uColor;
                    uniform float uRadius;
                    varying vec3 vNormal;
                    void main() {
                        float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
                        gl_FragColor = vec4(uColor, intensity * 0.15);
                    }
                `,
                transparent: true,
                side: THREE.BackSide,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
            const glowMesh = new THREE.Mesh(glowGeo, glowMat);
            M.planetGroup.add(glowMesh);
        }

        const dist = info.radius * 3.5;
        M.camera.position.set(0, 0, dist);
        M.controls.target.set(0, 0, 0);
        M.controls.minDistance = info.radius * 1.15;
        M.controls.maxDistance = info.radius * 30;
        M.controls.enablePan = false;
        M.controls.updateSpherical();

        if (info.hasSites) {
            const sites = LANDING_SITES[bodyKey] || [];
            const markerColor = info.color;
            sites.forEach(site => {
                const pos = latLngToVector(site.lat, site.lng, info.radius * 1.015);
                const markerGeo = new THREE.SphereGeometry(info.radius * 0.022, 16, 16);
                const markerMat = new THREE.MeshBasicMaterial({
                    color: markerColor,
                    transparent: true,
                    opacity: 1.0,
                });
                const marker = new THREE.Mesh(markerGeo, markerMat);
                marker.position.copy(pos);
                marker.lookAt(new THREE.Vector3(0, 0, 0));
                marker.userData = { ...site, type: 'landing_site' };
                M.scene.add(marker);
                M.siteMarkers.push(marker);

                const pulseGeo = new THREE.RingGeometry(info.radius * 0.022, info.radius * 0.045, 32);
                const pulseMat = new THREE.MeshBasicMaterial({
                    color: markerColor,
                    transparent: true,
                    opacity: 0.4,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                });
                const pulse = new THREE.Mesh(pulseGeo, pulseMat);
                pulse.position.copy(pos);
                pulse.lookAt(new THREE.Vector3(0, 0, 0));
                pulse.userData = { baseScale: 1, speed: 0.5 + Math.random() * 0.5 };
                M.scene.add(pulse);
                M.siteMarkers.push(pulse);

                const canvas = document.createElement('canvas');
                canvas.width = 256; canvas.height = 64;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = 'rgba(12,18,34,0.9)';
                ctx.fillRect(0, 0, 256, 64);
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.strokeRect(0, 0, 256, 64);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 20px "Space Grotesk", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(site.name.length > 20 ? site.name.slice(0, 18) + '…' : site.name, 128, 38);
                const tex = new THREE.CanvasTexture(canvas);
                tex.needsUpdate = true;
                const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthTest: false });
                const sprite = new THREE.Sprite(spriteMat);
                sprite.position.copy(pos);
                sprite.position.addScaledVector(pos.clone().normalize(), info.radius * 0.05);
                sprite.scale.set(info.radius * 1.5, info.radius * 0.35, 1);
                sprite.userData = site;
                M.scene.add(sprite);
                M.siteLabels.push(sprite);
            });
        }

        M.updateLayerButtons(bodyKey);
        updateSitesList(bodyKey);
        M.setStatus(bodyKey === 'earth' ? 'Earth — planetary view (no site data)' : bodyKey.charAt(0).toUpperCase() + bodyKey.slice(1) + ' — click landing sites for details');
    }

    function disposeObject(obj) {
        if (!obj) return;
        obj.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }

    M.activateSpaceMode = async function (view) {
        M.spaceMode = true;
        M.spaceView = view || 'all';
        clearDetail();

        if (M.planetGroup) {
            M.scene.remove(M.planetGroup);
            disposeObject(M.planetGroup);
            M.planetGroup = null;
            M.planetMesh = null;
            M.atmosphereMesh = null;
            M.cloudsMesh = null;
        }
        M.siteMarkers.forEach(m => M.scene.remove(m));
        M.siteMarkers = [];
        M.siteLabels.forEach(l => M.scene.remove(l));
        M.siteLabels = [];

        M.camera.position.set(0, 0, 15);
        M.controls.target.set(0, 0, 0);
        M.controls.minDistance = 2;
        M.controls.maxDistance = 80;
        M.controls.enablePan = true;
        M.controls.updateSpherical();

        if (M.disclaimerEl) {
            M.disclaimerEl.innerHTML = '<strong style="color:#fbbf24;">⚠ Simulated View:</strong> Asteroid and exoplanet positions are illustrative — these objects are in constant orbital motion and their locations change continuously. This visualization is for educational purposes only and not for navigation or mission planning.';
            M.disclaimerEl.style.display = 'block';
        }

        if (!M.spaceOrbitGroup) {
            M.spaceOrbitGroup = new THREE.Group();
            M.scene.add(M.spaceOrbitGroup);
        }

        await ensureSpaceData();
        buildSpaceObjects();
        drawSpaceView();
        M.updateSpaceUI();
        M.updateLayerButtons('space');
        M.setStatus((M.spaceView === 'asteroids' ? 'Asteroids' : M.spaceView === 'exoplanets' ? 'Exoplanets' : 'All Space') + ' — simulated orbital view (objects in motion)');
    };

    M.deactivateSpaceMode = function () {
        M.spaceMode = false;
        if (M.disclaimerEl) M.disclaimerEl.style.display = 'none';
        if (M.spaceOrbitGroup) {
            M.scene.remove(M.spaceOrbitGroup);
            disposeObject(M.spaceOrbitGroup);
            M.spaceOrbitGroup = null;
        }
        M.spaceObjects = [];
        M.controls.enablePan = false;
        M.controls.updateSpherical();
        const layer = M.currentLayer;
        if (layer !== 'space' && layer !== 'asteroids' && layer !== 'exoplanets') {
            createPlanet(layer);
            M.setStatus(layer.charAt(0).toUpperCase() + layer.slice(1) + ' — ' + (layer === 'earth' ? 'Planetary view (no site data)' : 'Click landing sites for details'));
            M.updateLayerButtons(layer);
        }
    };

    async function ensureSpaceData() {
        try {
            if ((M.spaceView === 'all' || M.spaceView === 'asteroids') && !M.spaceData.asteroids) {
                const res = await fetch('/api/asteroids?limit=200');
                const json = await res.json();
                M.spaceData.asteroids = Array.isArray(json.data) ? json.data : [];
            }
            if ((M.spaceView === 'all' || M.spaceView === 'exoplanets') && !M.spaceData.exoplanets) {
                const res = await fetch('/api/exoplanets?limit=200');
                const json = await res.json();
                M.spaceData.exoplanets = Array.isArray(json.data) ? json.data : [];
            }
        } catch (e) {
            console.error('Failed to load space data:', e);
            showToast('Failed to load space data: ' + e.message, 'error');
        }
    }

    function buildSpaceObjects() {
        M.spaceObjects = [];
        if (!M.spaceOrbitGroup) return;

        while (M.spaceOrbitGroup.children.length > 0) {
            const obj = M.spaceOrbitGroup.children[0];
            M.spaceOrbitGroup.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        }

        const sunGeo = new THREE.SphereGeometry(0.5, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
        const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: createGlowTexture('rgba(255,215,0,1)', 'rgba(255,150,0,0)'),
            color: 0xffffaa,
            blending: THREE.AdditiveBlending,
        }));
        sunGlow.scale.set(8, 8, 1);
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.add(sunGlow);
        sun.userData = { id: 'sun', name: 'Sun', type: 'sun' };
        M.spaceOrbitGroup.add(sun);
        M.spaceObjects.push({ mesh: sun, type: 'sun', name: 'Sun', angle: 0, orbitRadius: 0 });

        const sunLight = new THREE.PointLight(0xffe0b0, 2.5, 200);
        M.spaceOrbitGroup.add(sunLight);

        if (M.spaceView === 'all' || M.spaceView === 'asteroids') {
            const asteroids = M.spaceData.asteroids || [];
            const orbitRadius = 5;
            asteroids.forEach((item, i) => {
                const angle = (i / Math.max(1, asteroids.length)) * Math.PI * 2 * 0.9 + Math.random() * 0.2;
                const hazard = item.hazardous === true || item.hazardous === 'true' || item.hazardous === 1;
                const color = hazard ? 0xef4444 : 0x06b6d4;
                const size = 0.03 + Math.random() * 0.05;
                const geo = new THREE.SphereGeometry(size, 8, 8);
                const mat = new THREE.MeshBasicMaterial({ color: color });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(Math.cos(angle) * orbitRadius, (Math.random() - 0.5) * 0.5, Math.sin(angle) * orbitRadius);
                mesh.userData = {
                    id: 'ast-' + i, name: item.name || item.designation || 'Asteroid ' + (i + 1),
                    type: 'asteroid', angle: angle, orbitRadius: orbitRadius,
                    dist: parseFloat(item.distance_au) || 0.5,
                    diameter: parseFloat(item.diameter_km) || 0,
                    velocity: parseFloat(item.velocity_kmh) || 0,
                    hazardous: hazard,
                    date: item.date || '—',
                    raw: item,
                };
                M.spaceOrbitGroup.add(mesh);
                M.spaceObjects.push({ mesh: mesh, type: 'asteroid', angle: angle, orbitRadius: orbitRadius, userData: mesh.userData, speed: 0.001 + Math.random() * 0.002 });
            });
        }

        if (M.spaceView === 'all' || M.spaceView === 'exoplanets') {
            const exoplanets = M.spaceData.exoplanets || [];
            const baseRadius = M.spaceView === 'all' ? 12 : 10;
            exoplanets.forEach((item, i) => {
                const esi = parseFloat(item.esi) || 0;
                const dist = Math.max(1, parseFloat(item.sy_dist) || (10 + i * 2));
                const angle = (i / Math.max(1, exoplanets.length)) * Math.PI * 2 + Math.random() * 0.1;
                const r = baseRadius + Math.log1p(dist) * 2;
                const color = esi > 0.7 ? 0x22c55e : esi > 0.4 ? 0xf4a261 : 0x94a3b8;
                const geo = new THREE.SphereGeometry(0.06, 12, 12);
                const mat = new THREE.MeshBasicMaterial({ color: color });
                const mesh = new THREE.Mesh(geo, mat);
                const x = Math.cos(angle) * r;
                const z = Math.sin(angle) * r;
                mesh.position.set(x, (Math.random() - 0.5) * 0.3, z);
                mesh.userData = {
                    id: 'exo-' + i, name: item.pl_name || 'Exoplanet ' + (i + 1),
                    type: 'exoplanet', angle: angle, orbitRadius: r,
                    dist: dist, esi: esi,
                    radius: parseFloat(item.pl_rade) || 0,
                    mass: parseFloat(item.pl_bmasse) || 0,
                    hostname: item.hostname || '—',
                    discovery: item.pl_discmethod || '—',
                    water: item.water_status || '—',
                    raw: item,
                };
                M.spaceOrbitGroup.add(mesh);
                M.spaceObjects.push({ mesh: mesh, type: 'exoplanet', angle: angle, orbitRadius: r, userData: mesh.userData, speed: 0.0003 + Math.random() * 0.0005 });

                const orbitGeo = new THREE.RingGeometry(r - 0.02, r + 0.02, 64);
                const orbitMat = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.15,
                    side: THREE.DoubleSide,
                    depthWrite: false,
                });
                const orbit = new THREE.Mesh(orbitGeo, orbitMat);
                orbit.rotation.x = -Math.PI / 2;
                M.spaceOrbitGroup.add(orbit);
            });
        }
    }

    function createGlowTexture(inner, outer) {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const ctx = c.getContext('2d');
        const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
        g.addColorStop(0, inner);
        g.addColorStop(1, outer);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        return new THREE.CanvasTexture(c);
    }

    function updateSpaceOrbits() {
        if (!M.spaceMode) return;
        M.spaceTime += 0.01;
        M.spaceObjects.forEach(obj => {
            if (obj.type === 'sun' || !obj.mesh) return;
            obj.angle += obj.speed || 0.001;
            const yOffset = obj.type === 'asteroid' ? Math.sin(M.spaceTime * 2 + obj.angle * 10) * 0.1 : Math.sin(M.spaceTime * 0.5 + obj.angle * 5) * 0.05;
            obj.mesh.position.set(Math.cos(obj.angle) * obj.orbitRadius, yOffset, Math.sin(obj.angle) * obj.orbitRadius);
        });
    }

    function drawSpaceView() {
        if (!M.spaceOrbitGroup) return;
        updateSpaceOrbits();
        updateSitesList('space');
    }

    function onPlanetClick(event) {
        if (!M.renderer || !M.camera || !M.scene) return;
        const rect = M.renderer.domElement.getBoundingClientRect();
        M.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        M.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        M.raycaster.setFromCamera(M.pointer, M.camera);

        const targets = M.spaceMode ? M.spaceObjects.filter(o => o.mesh).map(o => o.mesh) : M.siteMarkers;
        if (targets.length === 0) return;

        const intersects = M.raycaster.intersectObjects(targets);
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            const data = obj.userData;
            if (data && data.type !== 'sun') {
                if (data.type === 'asteroid' || data.type === 'exoplanet') {
                    renderSpaceDetail(data);
                } else if (data.type === 'landing_site' || data.id) {
                    renderDetail(data);
                }
            }
        }
    }

    function renderSpaceDetail(data) {
        if (!M.detailPanel) return;
        const hazardous = data.type === 'asteroid' && data.hazardous;
        M.detailNameEl.textContent = escapeHtml(data.name);
        M.detailBodyEl.textContent = (data.type === 'asteroid' ? 'Near-Earth Asteroid' : 'Exoplanet') +
            (data.hostname ? ' • Host: ' + escapeHtml(data.hostname) : '') +
            ' • ' + escapeHtml(String(data.date || ''));
        M.detailMetricsEl.innerHTML =
            '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.5rem;background:rgba(255,255,255,0.02);">' +
            '<div style="font-size:0.65rem;color:var(--color-space-500);text-transform:uppercase;">Distance</div>' +
            '<div style="font-weight:600;color:var(--color-space-100);">' + (data.dist ? data.dist.toFixed(2) : '—') + (data.type === 'asteroid' ? ' AU' : ' ly') + '</div></div>' +
            (data.type === 'asteroid'
                ? '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.5rem;background:rgba(255,255,255,0.02);">' +
                  '<div style="font-size:0.65rem;color:var(--color-space-500);text-transform:uppercase;">Diameter</div>' +
                  '<div style="font-weight:600;color:var(--color-space-100);">' + window.fmt(data.diameter) + ' km</div></div>' +
                  '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.5rem;background:rgba(255,255,255,0.02);">' +
                  '<div style="font-size:0.65rem;color:var(--color-space-500);text-transform:uppercase;">Velocity</div>' +
                  '<div style="font-weight:600;color:var(--color-space-100);">' + window.fmt(data.velocity, 0) + ' km/h</div></div>' +
                  '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.5rem;background:rgba(255,255,255,0.02);">' +
                  '<div style="font-size:0.65rem;color:var(--color-space-500);text-transform:uppercase;">Hazard</div>' +
                  '<div style="font-weight:600;color:' + (hazardous ? 'var(--color-danger-400)' : 'var(--color-success-400)') + ';">' + (hazardous ? 'HAZARDOUS' : 'Safe') + '</div></div>'
                : '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.5rem;background:rgba(255,255,255,0.02);">' +
                  '<div style="font-size:0.65rem;color:var(--color-space-500);text-transform:uppercase;">ESI</div>' +
                  '<div style="font-weight:600;color:var(--color-space-100);">' + (data.esi !== undefined ? data.esi.toFixed(3) : '—') + '</div></div>' +
                  '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.5rem;background:rgba(255,255,255,0.02);">' +
                  '<div style="font-size:0.65rem;color:var(--color-space-500);text-transform:uppercase;">Radius</div>' +
                  '<div style="font-weight:600;color:var(--color-space-100);">' + window.fmt(data.radius) + ' R⊕</div></div>' +
                  '<div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:0.5rem;background:rgba(255,255,255,0.02);">' +
                  '<div style="font-size:0.65rem;color:var(--color-space-500);text-transform:uppercase;">Water</div>' +
                  '<div style="font-weight:600;color:var(--color-space-100);">' + escapeHtml(String(data.water)) + '</div></div>');
        M.detailPanel.style.transform = 'translateY(0)';
        M.detailPanel.style.opacity = '1';
        if (M.detailCloseBtn) M.detailCloseBtn.onclick = () => clearDetail();
    }

    M.switchLayer = function (name) {
        if (name === 'space' || name === 'asteroids' || name === 'exoplanets') {
            M.currentLayer = name;
            M.activateSpaceMode(name === 'space' ? 'all' : name);
            return;
        }
        M.deactivateSpaceMode();
        M.currentLayer = name;
        createPlanet(name);
        M.setStatus(name.charAt(0).toUpperCase() + name.slice(1) + ' — ' + (name === 'earth' ? 'Planetary view (no site data)' : 'Click landing sites for details'));
    };

    M.updateLayerButtons = function (active) {
        document.querySelectorAll('.layer-btn').forEach(b => {
            const isActive = b.dataset.layer === active;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-pressed', isActive);
        });
    };

    function updateLayerButtons(active) {
        M.updateLayerButtons(active);
    }

    function updateSitesList(bodyKey) {
        if (!M.sitesListEl || !M.sitesHeadingEl) return;
        M.sitesListEl.innerHTML = '';

        if (M.spaceMode) {
            const items = M.spaceObjects.filter(o => o.type !== 'sun');
            const q = (M.searchInput?.value || '').toLowerCase().trim();
            const filtered = items.filter(o => !q || o.userData.name.toLowerCase().includes(q));
            if (M.sitesHeadingEl) M.sitesHeadingEl.textContent = filtered.length + ' objects • ' + (M.spaceView === 'asteroids' ? 'Asteroids' : M.spaceView === 'exoplanets' ? 'Exoplanets' : 'All Space');
            if (!filtered.length) {
                M.sitesListEl.innerHTML = '<div style="color:var(--color-space-500);font-size:0.75rem;padding:1rem;">No matching objects.</div>';
                return;
            }
            M.sitesListEl.innerHTML = filtered.slice(0, 100).map(obj => {
                const color = obj.type === 'asteroid' ? (obj.userData.hazardous ? '#ef4444' : '#06b6d4') : (obj.userData.esi > 0.7 ? '#22c55e' : obj.userData.esi > 0.4 ? '#f4a261' : '#94a3b8');
                const sub = obj.type === 'asteroid' ? (obj.userData.dist.toFixed(2) + ' AU') : ('ESI ' + obj.userData.esi.toFixed(3) + ' • ' + obj.userData.dist.toFixed(1) + ' ly');
                return '<div style="padding:0.6rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.75rem;border:1px solid rgba(255,255,255,0.04);background:rgba(255,255,255,0.02);" data-id="' + escapeHtml(obj.userData.id) + '">' +
                    '<div style="display:flex;align-items:center;gap:0.5rem;"><span style="width:8px;height:8px;border-radius:50%;background:' + color + ';flex-shrink:0;"></span><span style="font-weight:600;color:var(--color-space-50);">' + escapeHtml(obj.userData.name) + '</span></div>' +
                    '<div style="font-size:0.65rem;color:var(--color-space-500);margin-left:1rem;">' + sub + '</div></div>';
            }).join('');
            M.sitesListEl.querySelectorAll('div[data-id]').forEach(el => {
                el.addEventListener('click', () => {
                    const obj = M.spaceObjects.find(o => o.userData.id === el.dataset.id);
                    if (obj) {
                        const v = obj.mesh.position;
                        M.controls.target.set(v.x, v.y, v.z);
                        M.camera.position.set(v.x, v.y, v.z + 4);
                        M.controls.updateSpherical();
                        renderSpaceDetail(obj.userData);
                    }
                });
            });
            return;
        }

        const sites = LANDING_SITES[bodyKey] || [];
        const q = (M.searchInput?.value || '').toLowerCase().trim();
        const filtered = sites.filter(s => !q || s.name.toLowerCase().includes(q));
        if (M.sitesHeadingEl) M.sitesHeadingEl.textContent = filtered.length + ' site' + (filtered.length !== 1 ? 's' : '') + ' • ' + (bodyKey.charAt(0).toUpperCase() + bodyKey.slice(1));

        if (!filtered.length) {
            M.sitesListEl.innerHTML = '<div style="color:var(--color-space-500);font-size:0.75rem;padding:1rem;">No sites on this body.</div>';
            return;
        }

        M.sitesListEl.innerHTML = filtered.map(site => {
            const active = M.activeSiteId === site.id ? ' active' : '';
            return '<div style="padding:0.6rem 0.75rem;border-radius:6px;cursor:pointer;font-size:0.75rem;border:1px solid rgba(255,255,255,0.04);background:' + (active ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.02)') + ';color:var(--color-space-100);" data-id="' + escapeHtml(site.id) + '">' +
                '<div style="font-weight:600;color:var(--color-space-50);">' + escapeHtml(site.name) + '</div>' +
                '<div style="font-size:0.65rem;color:var(--color-space-500);">' + escapeHtml(site.region || '') + ' • ' + escapeHtml(site.body) + '</div>' +
                '</div>';
        }).join('');

        M.sitesListEl.querySelectorAll('div[data-id]').forEach(el => {
            el.addEventListener('click', () => {
                const site = LANDING_SITES[bodyKey].find(s => s.id === el.dataset.id);
                if (site) {
                    M.activeSiteId = site.id;
                    updateSitesList(bodyKey);
                    const info = PLANET_INFO[bodyKey];
                    const pos = latLngToVector(site.lat, site.lng, info.radius * 1.05);
                    M.controls.target.copy(pos);
                    M.camera.position.set(pos.x * 1.3, pos.y * 1.3, pos.z * 1.3);
                    M.controls.updateSpherical();
                    renderDetail(site);
                }
            });
        });
    }

    M.filterSiteList = function (query) {
        if (M.spaceMode) { updateSitesList('space'); return; }
        updateSitesList(M.currentLayer);
    };

    M.fitAll = function () {
        if (M.spaceMode) {
            M.camera.position.set(0, 0, 15);
            M.controls.target.set(0, 0, 0);
            M.controls.updateSpherical();
            return;
        }
        const info = PLANET_INFO[M.currentLayer];
        const dist = info.radius * 4;
        M.camera.position.set(0, 0, dist);
        M.controls.target.set(0, 0, 0);
        M.controls.updateSpherical();
    };

    M.setStatus = function (msg) {
        if (M.statusEl) M.statusEl.textContent = msg || '';
    };

    M.updateSpaceUI = function () {
        if (M.spaceMode) {
            updateSitesList('space');
        }
    };

    M.open = function () {
        if (!M.initialized) {
            setTimeout(() => M.init(), 50);
            return;
        }
        if (M.renderer && M.container) {
            M.renderer.setSize(M.container.clientWidth, M.container.clientHeight);
            M.camera.aspect = M.container.clientWidth / M.container.clientHeight;
            M.camera.updateProjectionMatrix();
            if (M.controls) M.controls.updateSpherical();
        }
    };

    M.close = function () {};

    M.init = function () {
        if (M.initialized) {
            M.switchLayer(M.currentLayer);
            return;
        }
        initDOMRefs();
        M.container = $('map');
        if (!M.container) return;
        if (typeof THREE === 'undefined') {
            console.error('Three.js not loaded');
            return;
        }

        if (M.container.clientWidth === 0 || M.container.clientHeight === 0) {
            setTimeout(() => M.init(), 50);
            return;
        }

        M.scene = new THREE.Scene();
        M.scene.background = new THREE.Color(0x02040a);
        M.scene.fog = new THREE.FogExp2(0x02040a, 0.001);

        M.camera = new THREE.PerspectiveCamera(45, M.container.clientWidth / M.container.clientHeight, 0.1, 1000);

        M.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        M.renderer.setSize(M.container.clientWidth, M.container.clientHeight);
        M.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        M.renderer.shadowMap.enabled = true;
        M.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        M.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        M.renderer.toneMappingExposure = 1.0;
        M.container.appendChild(M.renderer.domElement);
        M.canvas = M.renderer.domElement;

        M.raycaster = new THREE.Raycaster();
        M.pointer = new THREE.Vector2();

        // FIXED LIGHTING: Full planet illumination for simulation
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        M.scene.add(ambient);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444466, 0.5);
        hemiLight.position.set(0, 100, 0);
        M.scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(200, 100, 150);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 10;
        sunLight.shadow.camera.far = 300;
        sunLight.shadow.camera.left = -150;
        sunLight.shadow.camera.right = 150;
        sunLight.shadow.camera.top = 150;
        sunLight.shadow.camera.bottom = -150;
        sunLight.shadow.bias = -0.0005;
        M.scene.add(sunLight);

        const fillLight = new THREE.DirectionalLight(0x4da6ff, 0.4);
        fillLight.position.set(-200, -50, -100);
        M.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xffcc88, 0.3);
        rimLight.position.set(0, -100, -200);
        M.scene.add(rimLight);

        createStarfield();

        M.controls = new OrbitControls(M.camera, M.renderer.domElement);
        M.controls.enablePan = false;
        M.controls.minDistance = 1;
        M.controls.maxDistance = 50;
        M.controls.autoRotate = false;

        M.renderer.domElement.addEventListener('click', onPlanetClick);
        window.addEventListener('resize', onWindowResize);

        M.initialized = true;
        M.switchLayer(M.currentLayer);
        animate();
    };

    function onWindowResize() {
        if (!M.camera || !M.renderer || !M.container) return;
        M.camera.aspect = M.container.clientWidth / M.container.clientHeight;
        M.camera.updateProjectionMatrix();
        M.renderer.setSize(M.container.clientWidth, M.container.clientHeight);
    }

    function animate() {
        requestAnimationFrame(animate);

        if (M.controls) M.controls.update();

        if (M.planetGroup) {
            const info = PLANET_INFO[M.currentLayer];
            if (info) {
                M.planetGroup.rotation.y += info.rotationSpeed;
                if (M.cloudsMesh) {
                    M.cloudsMesh.rotation.y += info.rotationSpeed * 1.02;
                }
            }
        }

        if (M.spaceMode && M.spaceOrbitGroup) {
            updateSpaceOrbits();
        }

        if (M.starfield) {
            M.starfield.rotation.y += 0.00002;
        }

        if (M.siteMarkers) {
            const time = Date.now() * 0.001;
            M.siteMarkers.forEach(marker => {
                if (marker.userData && marker.userData.baseScale !== undefined) {
                    const scale = 1 + Math.sin(time * marker.userData.speed) * 0.3;
                    marker.scale.setScalar(scale);
                    marker.material.opacity = 0.4 + Math.sin(time * marker.userData.speed) * 0.2;
                }
            });
            M.siteLabels.forEach(label => {
                if (label.material && label.material.opacity !== undefined) {
                    const camDir = new THREE.Vector3();
                    M.camera.getWorldDirection(camDir);
                    const toLabel = label.position.clone().sub(M.camera.position).normalize();
                    const visibility = Math.max(0, camDir.dot(toLabel));
                    label.material.opacity = visibility * visibility;
                }
            });
        }

        if (M.renderer && M.scene && M.camera) {
            M.renderer.render(M.scene, M.camera);
        }
    }

    // Wire UI handlers after DOM is ready
    function wireUI() {
        document.querySelectorAll('.layer-btn').forEach(btn => {
            btn.addEventListener('click', () => M.switchLayer(btn.dataset.layer));
        });
        const fitBtn = $('map-fit');
        if (fitBtn) fitBtn.addEventListener('click', () => M.fitAll());
        const search = $('map-search');
        if (search) {
            search.addEventListener('input', () => M.filterSiteList(search.value));
            search.addEventListener('keydown', (e) => { if (e.key === 'Escape') { search.value = ''; M.filterSiteList(''); } });
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireUI);
    } else {
        wireUI();
    }

    window.MapViewer = M;
})();