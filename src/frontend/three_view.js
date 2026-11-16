let scene, camera, renderer;
let animationFrameId = null;
let simTime = 0;
let timeScale = 1;
let autoRotate = true;
let currentMode = 'solar';

const bodies = [];
const helperMeshes = [];
const materialsToDispose = [];
const geometriesToDispose = [];
const texturesToDispose = [];

const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
let hoveredBody = null;
let tooltipEl = null;
let legendEl = null;
let controlsEl = null;

let isDragging = false;
let prevMouseX = 0, prevMouseY = 0;
let orbitYaw = 0, orbitPitch = 0.35;
let camDistance = 34;
const TARGET = new THREE.Vector3(0, 0, 0);

function $(id) { return document.getElementById(id); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function num(v, fb) { const n = parseFloat(v); return isNaN(n) ? fb : n; }
function trunc(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function safeColor(hex, fallback) {
    const c = new THREE.Color(hex);
    return c.r + c.g + c.b > 0.01 ? hex : fallback;
}

function makeGlowTexture(inner = 'rgba(255,200,80,1)', outer = 'rgba(255,120,20,0)') {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    texturesToDispose.push(tex);
    return tex;
}

function makeLabelSprite(text, color = '#ffffff') {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 96;
    const ctx = c.getContext('2d');
    ctx.font = 'bold 44px "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(trunc(text, 16), 256, 48);
    ctx.fillStyle = color;
    ctx.fillText(trunc(text, 16), 256, 48);
    const tex = new THREE.CanvasTexture(c);
    texturesToDispose.push(tex);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    materialsToDispose.push(mat);
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(9, 1.7, 1);
    sprite.position.y = 1.6;
    return sprite;
}

function buildStarfield() {
    const count = 5000;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const r = 100 + Math.random() * 300;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        const colorChoice = Math.random();
        if (colorChoice < 0.55) {
            colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.85;
        } else if (colorChoice < 0.8) {
            colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.75; colors[i * 3 + 2] = 0.5;
        } else {
            colors[i * 3] = 0.6; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1.0;
        }
        sizes[i] = 0.2 + Math.random() * 0.8;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true,
    });
    geometriesToDispose.push(geo);
    materialsToDispose.push(mat);
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    helperMeshes.push(points);
}

function makeOrbitRing(radius, color = 0xffffff, opacity = 0.2) {
    const seg = 128;
    const pts = [];
    for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    geometriesToDispose.push(geo);
    materialsToDispose.push(mat);
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    helperMeshes.push(line);
    return line;
}

function makeSphere(radius, color, emissive = 0x000000, roughness = 0.7, metalness = 0.1) {
    const geo = new THREE.SphereGeometry(radius, 64, 64);
    const mat = new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness });
    geometriesToDispose.push(geo);
    materialsToDispose.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return mesh;
}

function createPlanetWithTexture(bodyKey, radius) {
    const textures = {
        earth: '/assets/encyclopedia/earth.jpg',
        moon: '/assets/encyclopedia/moon.jpg',
        mars: '/assets/encyclopedia/mars.jpg',
    };
    const geo = new THREE.SphereGeometry(radius, 128, 128);
    const tex = new THREE.TextureLoader().load(textures[bodyKey]);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: bodyKey === 'earth' ? 0.7 : bodyKey === 'moon' ? 0.95 : 0.85,
        metalness: bodyKey === 'earth' ? 0.1 : 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return mesh;
}

// Kepler orbital elements for realistic asteroid orbits
function createAsteroidOrbit(item, index, total) {
    // Use real orbital parameters where available, otherwise generate realistic ones
    const a = 1.0 + Math.random() * 2.5; // semi-major axis in AU (0.5-3.5 AU)
    const e = 0.1 + Math.random() * 0.6; // eccentricity 0.1-0.7
    const i = Math.random() * Math.PI * 0.3; // inclination up to ~17 degrees
    const omega = Math.random() * Math.PI * 2; // argument of periapsis
    const Omega = Math.random() * Math.PI * 2; // longitude of ascending node
    const M0 = Math.random() * Math.PI * 2; // mean anomaly at epoch

    // Mean motion n = sqrt(GM/a^3) - simplified for simulation
    const n = 0.01 * Math.pow(a, -1.5); // radians per frame

    return {
        a, e, i, omega, Omega, M0, n,
        period: 2 * Math.PI / n,
    };
}

function getOrbitPosition(orbit, time) {
    // Mean anomaly
    const M = orbit.M0 + orbit.n * time;
    
    // Solve Kepler's equation for eccentric anomaly E: M = E - e*sin(E)
    let E = M;
    for (let iter = 0; iter < 10; iter++) {
        const f = E - orbit.e * Math.sin(E) - M;
        const fp = 1 - orbit.e * Math.cos(E);
        E -= f / fp;
        if (Math.abs(f) < 1e-6) break;
    }

    // True anomaly
    const nu = 2 * Math.atan2(
        Math.sqrt(1 + orbit.e) * Math.sin(E / 2),
        Math.sqrt(1 - orbit.e) * Math.cos(E / 2)
    );

    // Distance from Sun
    const r = orbit.a * (1 - orbit.e * Math.cos(E));

    // Position in orbital plane
    const x_orb = r * Math.cos(nu);
    const y_orb = r * Math.sin(nu);
    const z_orb = 0;

    // Rotate to 3D space
    const cos_omega = Math.cos(orbit.omega);
    const sin_omega = Math.sin(orbit.omega);
    const cos_Omega = Math.cos(orbit.Omega);
    const sin_Omega = Math.sin(orbit.Omega);
    const cos_i = Math.cos(orbit.i);
    const sin_i = Math.sin(orbit.i);

    const x = (cos_Omega * cos_omega - sin_Omega * sin_omega * cos_i) * x_orb +
              (-cos_Omega * sin_omega - sin_Omega * cos_omega * cos_i) * y_orb;
    const y = (sin_Omega * cos_omega + cos_Omega * sin_omega * cos_i) * x_orb +
              (-sin_Omega * sin_omega + cos_Omega * cos_omega * cos_i) * y_orb;
    const z = (sin_omega * sin_i) * x_orb + (cos_omega * sin_i) * y_orb;

    return new THREE.Vector3(x, y, z);
}

function buildSolarSystem(data) {
    currentMode = 'solar';

    // The Sun
    const sun = makeSphere(2.2, 0xffcc00, 0xff8800, 0.3, 0.0);
    const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: makeGlowTexture('rgba(255,220,100,0.9)', 'rgba(255,120,20,0)'),
        color: 0xffdd55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    }));
    sunGlow.scale.set(22, 22, 1);
    scene.add(sunGlow);
    helperMeshes.push(sunGlow);
    helperMeshes.push(sun);
    bodies.push({ mesh: sun, label: makeLabelSprite('Sun', '#ffdd55'), type: 'sun', spinSpeed: 0.001 });

    const sunLight = new THREE.PointLight(0xfff0d0, 3, 200);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    helperMeshes.push(sunLight);

    const ambient = new THREE.AmbientLight(0x222233, 0.5);
    scene.add(ambient);

    const withVel = data.filter(d => num(d.velocity_kmh) > 0);
    const pool = withVel.length ? withVel : data;

    const vArr = pool.map(d => num(d.velocity_kmh, 0));
    const vMin = Math.min.apply(null, vArr.concat([1]));
    const vMax = Math.max.apply(null, vArr.concat([1]));

    const useN = Math.min(pool.length, 120);
    const used = [];
    for (let i = 0; i < useN; i++) used.push(pool[i % pool.length]);

    used.forEach((item, i) => {
        const v = num(item.velocity_kmh, (vMin + vMax) / 2);
        const diam = num(item.diameter_km, 0);
        const size = clamp(diam > 0 ? Math.log(diam + 1) * 0.6 : 0.45, 0.4, 3.0);

        const hazardous = !!item.hazardous;
        const color = hazardous ? 0xff4444 : 0x4da6ff;
        const mesh = makeSphere(size, color, hazardous ? 0x331100 : 0x001133, 0.6, 0.2);

        // Create realistic orbital elements
        const orbit = createAsteroidOrbit(item, i, used.length);
        
        // Initial position
        const initialPos = getOrbitPosition(orbit, 0);
        mesh.position.copy(initialPos);

        const labelColor = hazardous ? '#ff9999' : '#88ccff';
        const label = makeLabelSprite(item.name || item.designation || 'NEO', labelColor);
        label.position.copy(mesh.position).add(new THREE.Vector3(0, size + 1.8, 0));
        scene.add(label);

        const entry = {
            mesh, label,
            orbit,
            spinSpeed: 0.15 + (size / 3.0) * 0.5,
            type: 'asteroid',
            data: item,
            index: data.indexOf(item)
        };
        bodies.push(entry);

        // Draw elliptical orbit ring
        const orbitPts = [];
        for (let j = 0; j <= 128; j++) {
            const t = (j / 128) * Math.PI * 2;
            const orbitTime = t / orbit.n;
            const pos = getOrbitPosition(orbit, orbitTime);
            orbitPts.push(pos);
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
        const orbitMat = new THREE.LineBasicMaterial({ 
            color: hazardous ? 0xff5544 : 0x4da6ff, 
            transparent: true, 
            opacity: hazardous ? 0.35 : 0.18 
        });
        geometriesToDispose.push(orbitGeo);
        materialsToDispose.push(orbitMat);
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        scene.add(orbitLine);
        helperMeshes.push(orbitLine);
    });

    // Earth with Moon
    const earthRadius = 18;
    const earth = createPlanetWithTexture('earth', 1.1);
    earth.position.set(earthRadius, 0, 0);
    earth.castShadow = true;
    earth.receiveShadow = true;
    helperMeshes.push(earth);
    const earthLabel = makeLabelSprite('Earth', '#88ccff');
    earthLabel.position.set(earthRadius, 2.5, 0);
    scene.add(earthLabel);

    const moon = createPlanetWithTexture('moon', 0.3);
    helperMeshes.push(moon);
    const moonLabel = makeLabelSprite('Moon', '#dddddd');
    moonLabel.position.y = 1.0;
    scene.add(moonLabel);

    const moonOrbitR = 3.0;
    makeOrbitRing(moonOrbitR, 0xaaaaaa, 0.25).position.x = earthRadius;

    bodies.push({
        mesh: earth, label: earthLabel, type: 'earth',
        radius: earthRadius, angSpeed: 0.04, phase: 0, spinSpeed: 0.35,
        moon: { mesh: moon, label: moonLabel, radius: moonOrbitR, angSpeed: 0.8, phase: 1.2 }
    });

    // Mars
    const marsRadius = 28;
    const mars = createPlanetWithTexture('mars', 0.6);
    mars.position.set(marsRadius, 0, 0);
    mars.castShadow = true;
    mars.receiveShadow = true;
    helperMeshes.push(mars);
    const marsLabel = makeLabelSprite('Mars', '#ffaa88');
    marsLabel.position.set(marsRadius, 2.0, 0);
    scene.add(marsLabel);

    bodies.push({
        mesh: mars, label: marsLabel, type: 'mars',
        radius: marsRadius, angSpeed: 0.02, phase: Math.PI * 0.5, spinSpeed: 0.33
    });
}

function buildGalaxy(data) {
    currentMode = 'galaxy';

    const planets = data.filter(d => d.pl_name);
    const useN = Math.min(planets.length, 100);

    // Group exoplanets by host star
    const starSystems = new Map();
    planets.forEach(item => {
        const host = item.hostname || 'Unknown';
        if (!starSystems.has(host)) {
            starSystems.set(host, []);
        }
        starSystems.get(host).push(item);
    });

    const stars = Array.from(starSystems.keys());
    const systemsToShow = Math.min(stars.length, 30);

    // Create a small cluster of stars with their planetary systems
    const clusterRadius = 25;

    for (let s = 0; s < systemsToShow; s++) {
        const host = stars[s];
        const systemPlanets = starSystems.get(host);
        const primaryPlanet = systemPlanets[0];

        // Position star in a loose cluster
        const starAngle = (s / systemsToShow) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const starDist = clusterRadius * (0.3 + Math.random() * 0.7);
        const starX = Math.cos(starAngle) * starDist;
        const starZ = Math.sin(starAngle) * starDist;

        // Host star
        const starColor = 0xffdd99;
        const starSize = 0.8 + Math.random() * 0.6;
        const starMesh = makeSphere(starSize, starColor, 0x886622, 0.3, 0.0);
        starMesh.position.set(starX, 0, starZ);

        const starGlow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: makeGlowTexture('rgba(255,230,150,0.8)', 'rgba(200,120,20,0)'),
            color: 0xffe9b0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        }));
        starGlow.scale.set(starSize * 10, starSize * 10, 1);
        starMesh.add(starGlow);

        const starLabel = makeLabelSprite(host, '#ffe9b0');
        starLabel.position.set(starX, starSize + 2, starZ);
        scene.add(starLabel);

        const starLight = new THREE.PointLight(0xffe0b0, 1.5, 50);
        starLight.position.set(starX, 0, starZ);
        scene.add(starLight);
        helperMeshes.push(starLight);

        helperMeshes.push(starMesh);
        bodies.push({ mesh: starMesh, label: starLabel, type: 'host_star', spinSpeed: 0.0005, systemPlanets: [] });

        // Planets orbiting this host star
        systemPlanets.forEach((item, pi) => {
            const period = num(item.pl_orbper, 365);
            const planetOrbitR = 1.5 + Math.min(period, 500) * 0.015 + pi * 0.8;
            const planetAng = (Math.PI * 2) / Math.max(period, 1);

            const esi = num(item.esi, 0);
            let color = 0x7fa8ff;
            if (esi > 0.7) color = 0x44dd88;
            else if (esi > 0.4) color = 0xf4a261;
            else if (esi > 0) color = 0xdd6655;

            const plSize = clamp(num(item.pl_rade, 1) * 0.35, 0.2, 2.0);
            const planet = makeSphere(plSize, color, 0x112233, 0.7, 0.1);
            planet.position.set(starX + planetOrbitR, 0, starZ);

            const labelColor = esi > 0.7 ? '#88ffcc' : esi > 0.4 ? '#ffd28a' : '#ff9d9d';
            const label = makeLabelSprite(item.pl_name, labelColor);
            label.position.set(planet.position.x, plSize + 1.5, planet.position.z);
            scene.add(label);

            // Orbit ring around host star
            const orbitGeo = new THREE.RingGeometry(planetOrbitR - 0.02, planetOrbitR + 0.02, 64);
            const orbitMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide,
                depthWrite: false,
            });
            const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat);
            orbitMesh.rotation.x = -Math.PI / 2;
            orbitMesh.position.set(starX, 0, starZ);
            scene.add(orbitMesh);
            helperMeshes.push(orbitMesh);

            const starBody = bodies.find(b => b.mesh === starMesh);
            if (starBody) {
                starBody.systemPlanets.push({
                    mesh: planet,
                    label,
                    orbitRadius: planetOrbitR,
                    angSpeed: planetAng,
                    phase: (pi * 2.5) % (Math.PI * 2),
                    spinSpeed: 0.25 + (plSize / 2.0) * 0.5,
                    data: item,
                    type: 'planet',
                    hostStar: starMesh,
                    hostStarPos: new THREE.Vector3(starX, 0, starZ),
                });
            }
        });
    }

    const ambient = new THREE.AmbientLight(0x111122, 0.6);
    scene.add(ambient);
}

function ensureOverlays(container) {
    if (!legendEl) {
        legendEl = document.createElement('div');
        legendEl.className = 'three-legend';
        container.appendChild(legendEl);
    }
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'three-tooltip';
        tooltipEl.style.display = 'none';
        container.appendChild(tooltipEl);
    }
    if (!controlsEl) {
        controlsEl = document.createElement('div');
        controlsEl.className = 'three-controls';
        controlsEl.innerHTML = `
            <button class="three-ctl-btn" id="three-autorotate" title="Toggle auto-rotate">🔄 Auto</button>
            <button class="three-ctl-btn" id="three-speed-down" title="Slow down">⏪</button>
            <span class="three-ctl-speed" id="three-speed-label">1×</span>
            <button class="three-ctl-btn" id="three-speed-up" title="Speed up">⏩</button>
            <button class="three-ctl-btn" id="three-reset" title="Reset view">🎯 Reset</button>
        `;
        container.appendChild(controlsEl);

        $('three-autorotate').addEventListener('click', () => {
            autoRotate = !autoRotate;
            $('three-autorotate').classList.toggle('off', !autoRotate);
        });
        $('three-speed-down').addEventListener('click', () => setTimeScale(timeScale / 1.5));
        $('three-speed-up').addEventListener('click', () => setTimeScale(timeScale * 1.5));
        $('three-reset').addEventListener('click', resetView);
    }
    updateLegend();
}

function setTimeScale(s) {
    timeScale = clamp(s, 0.05, 50);
    if ($('three-speed-label')) $('three-speed-label').textContent = timeScale.toFixed(1) + '×';
}

function updateLegend() {
    if (!legendEl) return;
    if (currentMode === 'solar') {
        legendEl.innerHTML = `
            <div class="three-legend-item"><span class="dot" style="background:#ffcc00"></span> Sun</div>
            <div class="three-legend-item"><span class="dot" style="background:#4da6ff"></span> Asteroid</div>
            <div class="three-legend-item"><span class="dot" style="background:#ff4444"></span> Hazardous</div>
            <div class="three-legend-item"><span class="dot" style="background:#3a7bd5"></span> Earth</div>
            <div class="three-legend-item"><span class="dot" style="background:#ff8844"></span> Mars</div>
            <div class="three-legend-note">Realistic elliptical orbits · Size ∝ log(diameter)</div>
            <div class="three-legend-note" style="color:#fbbf24;">⚠ Positions simulated — asteroids in constant motion</div>`;
    } else {
        legendEl.innerHTML = `
            <div class="three-legend-item"><span class="dot" style="background:#ffdd99"></span> Host star</div>
            <div class="three-legend-item"><span class="dot" style="background:#44dd88"></span> ESI > 0.7</div>
            <div class="three-legend-item"><span class="dot" style="background:#f4a261"></span> ESI 0.4–0.7</div>
            <div class="three-legend-item"><span class="dot" style="background:#dd6655"></span> ESI < 0.4</div>
            <div class="three-legend-note">Planets orbit their host stars</div>
            <div class="three-legend-note" style="color:#fbbf24;">⚠ Positions simulated — exoplanets orbit their stars</div>`;
    }
}

function onMouseMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseNDC, camera);
    const meshes = bodies.map(b => b.mesh).filter(Boolean);
    const hits = raycaster.intersectObjects(meshes);

    if (hits.length) {
        const hitBody = bodies.find(b => b.mesh === hits[0].object);
        if (hoveredBody !== hitBody) {
            hoveredBody = hitBody;
            showTooltip(hitBody, e.clientX, e.clientY);
        } else {
            moveTooltip(e.clientX, e.clientY);
        }
        renderer.domElement.style.cursor = 'pointer';
    } else {
        hoveredBody = null;
        if (tooltipEl) tooltipEl.style.display = 'none';
        renderer.domElement.style.cursor = 'grab';
    }
}

function showTooltip(body, x, y) {
    if (!tooltipEl || !body) return;
    const d = body.data;
    let html = `<div class="three-tt-name">${trunc(body.type === 'sun' ? 'Sun' : body.type === 'host_star' ? body.data || 'Host Star' : (body.type === 'earth' ? 'Earth' : body.type === 'mars' ? 'Mars' : body.type === 'moon' ? 'Moon' : (d ? (d.name || d.pl_name) : 'Object')), 28)}</div>`;

    if (body.type === 'asteroid' && d) {
        html += `<div class="three-tt-row">Diameter: <b>${num(d.diameter_km).toFixed(1)} km</b></div>`;
        html += `<div class="three-tt-row">Velocity: <b>${num(d.velocity_kmh).toFixed(0)} km/h</b></div>`;
        html += `<div class="three-tt-row">Hazardous: <b>${d.hazardous ? '⚠️ Yes' : 'No'}</b></div>`;
        html += `<div class="three-tt-row">Orbit period: <b>${body.orbit ? (body.orbit.period / 365.25).toFixed(1) : 'N/A'} years</b></div>`;
    } else if (body.type === 'planet' && d) {
        html += `<div class="three-tt-row">Radius: <b>${num(d.pl_rade).toFixed(2)} R⊕</b></div>`;
        html += `<div class="three-tt-row">Mass: <b>${num(d.pl_bmasse).toFixed(2)} M⊕</b></div>`;
        html += `<div class="three-tt-row">ESI: <b>${d.esi !== undefined ? num(d.esi).toFixed(3) : 'N/A'}</b></div>`;
        html += `<div class="three-tt-row">Orbital period: <b>${num(d.pl_orbper).toFixed(1)} days</b></div>`;
        html += `<div class="three-tt-row">Host: <b>${trunc(d.hostname, 20)}</b></div>`;
    } else if (body.type === 'earth') {
        html += `<div class="three-tt-row">Radius: <b>1.00 R⊕</b></div>`;
        html += `<div class="three-tt-row">Mass: <b>1.00 M⊕</b></div>`;
        html += `<div class="three-tt-row">Has <b>1 moon</b> (orbit 27.3 days)</div>`;
    } else if (body.type === 'mars') {
        html += `<div class="three-tt-row">Radius: <b>0.53 R⊕</b></div>`;
        html += `<div class="three-tt-row">Mass: <b>0.11 M⊕</b></div>`;
        html += `<div class="three-tt-row">Orbit period: <b>687 days</b></div>`;
    } else if (body.type === 'moon') {
        html += `<div class="three-tt-row">Earth's natural satellite</div>`;
        html += `<div class="three-tt-row">Orbit period: <b>27.3 days</b></div>`;
    } else if (body.type === 'host_star') {
        html += `<div class="three-tt-row">Host star with ${body.systemPlanets?.length || 0} known planets</div>`;
    }

    html += `<div class="three-tt-hint">Click for full details</div>`;
    tooltipEl.innerHTML = html;
    moveTooltip(x, y);
}

function moveTooltip(x, y) {
    if (!tooltipEl) return;
    tooltipEl.style.display = 'block';
    const off = 16;
    tooltipEl.style.left = (x - off - tooltipEl.offsetWidth / 2) + 'px';
    tooltipEl.style.top = (y - off - tooltipEl.offsetHeight) + 'px';
}

function onClick(e) {
    raycaster.setFromCamera(mouseNDC, camera);
    const meshes = bodies.map(b => b.mesh).filter(Boolean);
    const hits = raycaster.intersectObjects(meshes);
    if (!hits.length) return;

    const body = bodies.find(b => b.mesh === hits[0].object);
    if (!body || !body.data) return;

    if (typeof window.showDetail === 'function' && body.index !== undefined) {
        window.showDetail(body.index);
    } else if (body.data) {
        const name = body.data.name || body.data.pl_name || 'Object';
        const detail = body.type === 'planet'
            ? `${name} — radius ${num(body.data.pl_rade).toFixed(2)} R⊕, period ${num(body.data.pl_orbper).toFixed(1)} days`
            : `${name} — diameter ${num(body.data.diameter_km).toFixed(1)} km, velocity ${num(body.data.velocity_kmh).toFixed(0)} km/h`;
        if (tooltipEl) { tooltipEl.innerHTML = `<div class="three-tt-name">${trunc(name, 28)}</div><div class="three-tt-row">${detail}</div>`; }
    }
}

function startDrag(e) { isDragging = true; prevMouseX = e.clientX; prevMouseY = e.clientY; }
function endDrag() { isDragging = false; }
function onDrag(e) {
    if (!isDragging) return;
    const dx = (e.clientX - prevMouseX) * 0.005;
    const dy = (e.clientY - prevMouseY) * 0.005;
    orbitYaw += dx;
    orbitPitch = clamp(orbitPitch + dy, -1.4, 1.4);
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
}
function onWheel(e) {
    camDistance = clamp(camDistance + e.deltaY * 0.015, 5, 120);
    e.preventDefault();
}
function updateCameraPosition() {
    camera.position.x = camDistance * Math.sin(orbitYaw) * Math.cos(orbitPitch);
    camera.position.y = camDistance * Math.sin(orbitPitch);
    camera.position.z = camDistance * Math.cos(orbitYaw) * Math.cos(orbitPitch);
    camera.lookAt(TARGET);
}
function resetView() {
    orbitYaw = 0; orbitPitch = 0.35; camDistance = 34;
}

function animate3D() {
    animationFrameId = requestAnimationFrame(animate3D);
    const dt = 0.016;
    simTime += dt * timeScale;

    if (currentMode === 'solar') {
        bodies.forEach(b => {
            if (b.type === 'asteroid' && b.orbit) {
                const pos = getOrbitPosition(b.orbit, simTime * timeScale);
                b.mesh.position.copy(pos);
                b.label.position.copy(pos).add(new THREE.Vector3(0, (b.mesh.geometry.parameters.radius || 0.5) + 1.8, 0));
            } else if (b.type === 'earth') {
                b.phase += b.angSpeed * timeScale * dt;
                b.mesh.position.x = Math.cos(b.phase) * b.radius;
                b.mesh.position.z = Math.sin(b.phase) * b.radius;
                b.label.position.set(b.mesh.position.x, 2.5, b.mesh.position.z);
                if (b.moon) {
                    b.moon.phase += b.moon.angSpeed * timeScale * dt;
                    b.moon.mesh.position.set(
                        b.mesh.position.x + Math.cos(b.moon.phase) * b.moon.radius,
                        0,
                        b.mesh.position.z + Math.sin(b.moon.phase) * b.moon.radius
                    );
                    b.moon.label.position.copy(b.moon.mesh.position).add(new THREE.Vector3(0, 1.0, 0));
                }
            } else if (b.type === 'mars') {
                b.phase += b.angSpeed * timeScale * dt;
                b.mesh.position.x = Math.cos(b.phase) * b.radius;
                b.mesh.position.z = Math.sin(b.phase) * b.radius;
                b.label.position.set(b.mesh.position.x, 2.0, b.mesh.position.z);
            }
            if (b.mesh && b.mesh.isMesh) {
                b.mesh.rotation.y += (b.spinSpeed || 0.2) * dt;
            }
        });
    } else {
        // Galaxy mode: planets orbit their host stars
        bodies.forEach(b => {
            if (b.type !== 'host_star') return;
            
            // Star rotation
            if (b.mesh.isMesh) {
                b.mesh.rotation.y += (b.spinSpeed || 0.0005) * dt;
            }
            
            // Planets orbit their host star
            if (b.systemPlanets) {
                b.systemPlanets.forEach(planet => {
                    planet.phase += planet.angSpeed * timeScale * dt * 0.1;
                    const hostPos = planet.hostStarPos;
                    planet.mesh.position.set(
                        hostPos.x + Math.cos(planet.phase) * planet.orbitRadius,
                        0,
                        hostPos.z + Math.sin(planet.phase) * planet.orbitRadius
                    );
                    planet.label.position.set(
                        planet.mesh.position.x,
                        (planet.mesh.geometry.parameters.radius || 0.4) + 1.5,
                        planet.mesh.position.z
                    );
                    if (planet.mesh.isMesh) {
                        planet.mesh.rotation.y += (planet.spinSpeed || 0.2) * dt;
                    }
                });
            }
        });
    }

    if (autoRotate && !isDragging) orbitYaw += 0.0008;
    updateCameraPosition();

    if (renderer && scene && camera) renderer.render(scene, camera);
}

function init3D(containerId) {
    const container = document.getElementById(containerId);
    if (!container) { console.error(`Container #${containerId} not found.`); return; }
    stop3DView();

    scene = new THREE.Scene();
    scene.background = null;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 320;

    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 34;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.domElement.style.cursor = 'grab';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    buildStarfield();
    resetView();

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) startDrag(e.touches[0]);
    }, { passive: false });
    renderer.domElement.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) onDrag(e.touches[0]);
    }, { passive: false });
    renderer.domElement.addEventListener('touchend', endDrag);

    window.addEventListener('resize', onWindowResize, false);

    ensureOverlays(container);
}

function onWindowResize() {
    if (!camera || !renderer) return;
    const container = renderer.domElement.parentElement;
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

window.load3DView = function (data, containerId = 'three-view-container') {
    if (!data || !data.length) return;
    const isExo = window.currentTab === 'exoplanets' || data.some(d => d.pl_name);
    init3D(containerId);
    if (isExo) buildGalaxy(data);
    else buildSolarSystem(data);
    animate3D();
};

window.stop3DView = function () {
    if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }

    if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('mousedown', startDrag);
        renderer.domElement.removeEventListener('click', onClick);
        renderer.domElement.removeEventListener('wheel', onWheel);
    }
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', endDrag);
    window.removeEventListener('resize', onWindowResize);

    bodies.forEach(b => { if (b.label && b.label.material) b.label.material.dispose(); });
    bodies.length = 0;
    geometriesToDispose.forEach(g => g.dispose());
    materialsToDispose.forEach(m => m.dispose());
    texturesToDispose.forEach(t => t.dispose());
    geometriesToDispose.length = 0;
    materialsToDispose.length = 0;
    texturesToDispose.length = 0;
    helperMeshes.length = 0;

    if (renderer) {
        const parent = renderer.domElement.parentElement;
        if (parent) {
            if (tooltipEl && tooltipEl.parentElement === parent) parent.removeChild(tooltipEl);
            if (legendEl && legendEl.parentElement === parent) parent.removeChild(legendEl);
            if (controlsEl && controlsEl.parentElement === parent) parent.removeChild(controlsEl);
        }
        tooltipEl = null; legendEl = null; controlsEl = null;
        renderer.dispose();
        renderer.forceContextLoss();
        renderer = null;
    }
    scene = null; camera = null;
};