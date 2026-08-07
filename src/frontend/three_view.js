let scene, camera, renderer;
let animationFrameId = null;
let simTime = 0;
let timeScale = 1;
let autoRotate = true;
let currentMode = 'solar';

// Scene object registries (for cleanup + animation)
const bodies = [];
const helperMeshes = [];
const materialsToDispose = [];
const geometriesToDispose = [];
const texturesToDispose = [];

// Interaction state
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
let hoveredBody = null;
let tooltipEl = null;
let legendEl = null;
let controlsEl = null;

// Camera orbit state
let isDragging = false;
let prevMouseX = 0, prevMouseY = 0;
let orbitYaw = 0, orbitPitch = 0;
let camDistance = 34;
const TARGET = new THREE.Vector3(0, 0, 0);

// Helpers
function $(id) { return document.getElementById(id); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function num(v, fb) { const n = parseFloat(v); return isNaN(n) ? fb : n; }
function trunc(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function safeColor(hex, fallback) {
    const c = new THREE.Color(hex);
    return c.r + c.g + c.b > 0.01 ? hex : fallback;
}

// Canvas Texture
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
    ctx.font = 'bold 44px system-ui, sans-serif';
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

// Scene
function buildStarfield() {
    const count = 800;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const r = 120 + Math.random() * 200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0.85 });
    geometriesToDispose.push(geo);
    materialsToDispose.push(mat);
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    helperMeshes.push(points);
}

function makeOrbitRing(radius, color = 0xffffff, opacity = 0.3) {
    const seg = 96;
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

function makeSphere(radius, color, emissive = 0x000000) {
    const geo = new THREE.SphereGeometry(radius, 28, 28);
    const mat = new THREE.MeshPhongMaterial({ color, emissive, shininess: 40, specular: 0x222222 });
    geometriesToDispose.push(geo);
    materialsToDispose.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return mesh;
}

// Solar System (Asteroids)
function buildSolarSystem(data) {
    currentMode = 'solar';

    // The Sun
    const sun = makeSphere(1.8, 0xffaa33, 0xff7700);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), transparent: true, blending: THREE.AdditiveBlending }));
    glow.scale.set(14, 14, 1);
    scene.add(glow);
    helperMeshes.push(glow);
    helperMeshes.push(sun);
    bodies.push({ mesh: sun, label: makeLabelSprite('Sun', '#ffd27f'), type: 'sun' });

    const sunLight = new THREE.PointLight(0xffe0b0, 2.2, 120);
    scene.add(sunLight);
    helperMeshes.push(sunLight);

    // circular orbit: v = sqrt(GM/r)  =>  r = GM / v^2
    // pick GM so displayed radii fit nicely in the scene.
    const withVel = data.filter(d => num(d.velocity_kmh) > 0);
    const pool = withVel.length ? withVel : data;

    // Kepler circular orbit: faster object = smaller orbit
    const vArr = pool.map(d => num(d.velocity_kmh, 0));
    const vMin = Math.min.apply(null, vArr.concat([1]));
    const vMax = Math.max.apply(null, vArr.concat([1]));
    const rMin = 4.5, rMax = 24;

    // Kepler-like angular speed: ω ∝ r^(-3/2)
    const omega0 = (2 * Math.PI) / 12;

    const useN = Math.min(pool.length, 90);
    const used = [];
    // Distribute over the velocity range so fast & slow both appear
    for (let i = 0; i < useN; i++) used.push(pool[i % pool.length]);

    used.forEach((item, i) => {
        const v = num(item.velocity_kmh, (vMin + vMax) / 2);
        const t = vMax > vMin ? clamp((v - vMin) / (vMax - vMin), 0, 1) : 0.5;
        const radius = rMax - t * (rMax - rMin);

        // size from real diameter (log scale)
        const diam = num(item.diameter_km, 0);
        const size = clamp(diam > 0 ? Math.log(diam + 1) * 0.55 : 0.4, 0.35, 2.4);

        const hazardous = !!item.hazardous;
        const color = hazardous ? 0xff5544 : 0x6f9fd8;
        const mesh = makeSphere(size, color, hazardous ? 0x441100 : 0x112233);

        // angular speed from Kepler's 3rd law: ω ∝ r^(-3/2)
        // so the fastest (smallest orbit) completes in ~12s, slowest in ~150s
        const angSpeed = omega0 * Math.pow(rMax / radius, 1.5);
        const phase = (i * 2.39996) % (Math.PI * 2);   // golden-angle spacing

        const labelColor = hazardous ? '#ff9999' : '#cfe4ff';
        const label = makeLabelSprite(item.name || 'NEO', labelColor);

        const entry = {
            mesh, label,
            radius,
            angSpeed,
            phase,
            spinSpeed: 0.2 + (size / 2.4) * 0.8,
            type: 'asteroid',
            data: item,
            index: data.indexOf(item)
        };
        // position initial
        entry.mesh.position.set(Math.cos(phase) * radius, 0, Math.sin(phase) * radius);
        entry.label.position.copy(entry.mesh.position).add(new THREE.Vector3(0, size + 1.4, 0));
        scene.add(label);
        bodies.push(entry);

        makeOrbitRing(radius, hazardous ? 0xff6655 : 0x88aadd, hazardous ? 0.4 : 0.22);
    });

    // Earth + Moon Satellite Demonstration
    const earthRadius = 15;
    const earth = makeSphere(0.85, 0x3a7bd5, 0x0a2a55);
    earth.position.set(earthRadius, 0, 0);
    helperMeshes.push(earth);
    const earthLabel = makeLabelSprite('Earth', '#8ecaff');
    earthLabel.position.set(earthRadius, 1.9, 0);
    scene.add(earthLabel);

    const moonOrbitR = 2.4;
    const moon = makeSphere(0.24, 0xbbbbbb, 0x333333);
    helperMeshes.push(moon);
    const moonLabel = makeLabelSprite('Moon', '#dddddd');
    moonLabel.position.y = 0.8;
    scene.add(moonLabel);

    makeOrbitRing(moonOrbitR, 0xcccccc, 0.3).position.x = earthRadius;
    bodies.push({
        mesh: earth, label: earthLabel, type: 'earth',
        radius: earthRadius, angSpeed: 0.05, phase: 0, spinSpeed: 0.4,
        moon: { mesh: moon, label: moonLabel, radius: moonOrbitR, angSpeed: 0.9, phase: 1.2 }
    });
}

// Galaxy (Exoplanets)
function buildGalaxy(data) {
    currentMode = 'galaxy';

    // Galactic Core (glow)
    const core = makeSphere(1.2, 0xffdd88, 0xcc8800);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture('rgba(255,230,150,0.9)', 'rgba(200,120,20,0)'), transparent: true, blending: THREE.AdditiveBlending }));
    glow.scale.set(16, 16, 1);
    scene.add(glow);
    helperMeshes.push(glow);
    helperMeshes.push(core);
    bodies.push({ mesh: core, label: makeLabelSprite('Galactic Core', '#ffe9b0'), type: 'core' });

    const coreLight = new THREE.PointLight(0xffe0b0, 2, 160);
    scene.add(coreLight);
    helperMeshes.push(coreLight);

    const planets = data.filter(d => d.pl_name);
    const useN = Math.min(planets.length, 90);
    const spiralArms = 3;

    for (let i = 0; i < useN; i++) {
        const item = planets[i];
        const period = num(item.pl_orbper, 365);

        // Kepler's 3rd law: r ∝ T^(2/3)  -> place stars in spiral
        const rNorm = Math.pow(period, 2 / 3);
        const rMax = 26, rMin = 6;
        const radius = clamp(rMin + (rNorm / Math.pow(4000, 2 / 3)) * (rMax - rMin), rMin, rMax);
        const arm = i % spiralArms;
        const baseAngle = (i / useN) * Math.PI * 8 + (arm * Math.PI * 2) / spiralArms;
        const scatter = (Math.random() - 0.5) * 0.35;
        const angle = baseAngle + scatter;

        // Host Star
        const starColor = 0xffdd99;
        const starSize = 0.5 + Math.random() * 0.4;
        const star = makeSphere(starSize, starColor, 0x886622);
        star.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

        // Planets orbiting star with original period -> angular speed ω = 2π / T
        const planetOrbitR = 1.6 + Math.min(period, 400) * 0.01;
        const planetAng = (Math.PI * 2) / Math.max(period, 1);

        const esi = num(item.esi, 0);
        let color = 0x7fa8ff;
        if (esi > 0.7) color = 0x44dd88;
        else if (esi > 0.4) color = 0xd4a04a;
        else if (esi > 0) color = 0xdd6655;

        const plSize = clamp(num(item.pl_rade, 1) * 0.28, 0.18, 1.6);
        const planet = makeSphere(plSize, color, 0x112233);
        planet.position.set(star.position.x + planetOrbitR, 0, star.position.z);

        const labelColor = esi > 0.7 ? '#8affc8' : esi > 0.4 ? '#ffd28a' : '#ff9d9d';
        const label = makeLabelSprite(item.pl_name, labelColor);
        label.position.set(planet.position.x, plSize + 1.3, planet.position.z);
        scene.add(label);

        bodies.push({
            mesh: planet,
            label,
            type: 'planet',
            data: item,
            index: data.indexOf(item),
            star,
            orbitRadius: planetOrbitR,
            angSpeed: planetAng,
            phase: (i * 1.7) % (Math.PI * 2),
            spinSpeed: 0.3 + (plSize / 1.6) * 0.6,
            galaxyRadius: radius,
            galaxyAngle: angle,
            galaxySpeed: 0.03 + Math.random() * 0.02
        });

        // Orbit line around host star
        const orbit = makeOrbitRing(planetOrbitR, color, 0.35);
        orbit.position.x = star.position.x;
        orbit.position.z = star.position.z;
        orbit.userData.starRef = star;
        helperMeshes.push(orbit);
        helperMeshes.push(star);
    }

    // Faint spiral dust lines.
    for (let a = 0; a < spiralArms; a++) {
        const pts = [];
        for (let t = 0; t <= 1; t += 0.01) {
            const r = 4 + t * 26;
            const ang = t * Math.PI * 5 + (a * Math.PI * 2) / spiralArms;
            pts.push(new THREE.Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.12 });
        geometriesToDispose.push(geo);
        materialsToDispose.push(mat);
        const line = new THREE.Line(geo, mat);
        scene.add(line);
        helperMeshes.push(line);
    }
}

// Legend / Controls
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
    timeScale = clamp(s, 0.1, 30);
    if ($('three-speed-label')) $('three-speed-label').textContent = timeScale.toFixed(1) + '×';
}

function updateLegend() {
    if (!legendEl) return;
    if (currentMode === 'solar') {
        legendEl.innerHTML = `
            <div class="three-legend-item"><span class="dot" style="background:#ffaa33"></span> Sun</div>
            <div class="three-legend-item"><span class="dot" style="background:#6f9fd8"></span> Asteroid</div>
            <div class="three-legend-item"><span class="dot" style="background:#ff5544"></span> Hazardous</div>
            <div class="three-legend-item"><span class="dot" style="background:#3a7bd5"></span> Earth</div>
            <div class="three-legend-note">Size ∝ diameter · Speed ∝ real velocity (Kepler)</div>`;
    } else {
        legendEl.innerHTML = `
            <div class="three-legend-item"><span class="dot" style="background:#ffdd99"></span> Host star</div>
            <div class="three-legend-item"><span class="dot" style="background:#44dd88"></span> ESI > 0.7</div>
            <div class="three-legend-item"><span class="dot" style="background:#d4a04a"></span> ESI 0.4–0.7</div>
            <div class="three-legend-item"><span class="dot" style="background:#dd6655"></span> ESI < 0.4</div>
            <div class="three-legend-note">Orbit period = real data (pl_orbper) · r ∝ T<sup>2/3</sup></div>`;
    }
}

// Mouse/ Touch interaction
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
    let html = `<div class="three-tt-name">${trunc(body.type === 'sun' ? 'Sun' : body.type === 'core' ? 'Galactic Core' : (body.type === 'earth' ? 'Earth' : body.type === 'moon' ? 'Moon' : (d ? (d.name || d.pl_name) : 'Object')), 28)}</div>`;

    if (body.type === 'asteroid' && d) {
        html += `<div class="three-tt-row">Diameter: <b>${num(d.diameter_km).toFixed(1)} km</b></div>`;
        html += `<div class="three-tt-row">Velocity: <b>${num(d.velocity_kmh).toFixed(0)} km/h</b></div>`;
        html += `<div class="three-tt-row">Hazardous: <b>${d.hazardous ? '⚠️ Yes' : 'No'}</b></div>`;
        html += `<div class="three-tt-row">Sim year: <b>${(2 * Math.PI / body.angSpeed).toFixed(1)} sim-units</b></div>`;
    } else if (body.type === 'planet' && d) {
        html += `<div class="three-tt-row">Radius: <b>${num(d.pl_rade).toFixed(2)} R⊕</b></div>`;
        html += `<div class="three-tt-row">Mass: <b>${num(d.pl_bmasse).toFixed(2)} M⊕</b></div>`;
        html += `<div class="three-tt-row">ESI: <b>${d.esi !== undefined ? num(d.esi).toFixed(3) : 'N/A'}</b></div>`;
        html += `<div class="three-tt-row">Orbital period: <b>${num(d.pl_orbper).toFixed(1)} days</b></div>`;
        html += `<div class="three-tt-row">Host: <b>${trunc(d.hostname, 20)}</b></div>`;
    } else if (body.type === 'earth') {
        html += `<div class="three-tt-row">Radius: <b>1.00 R⊕</b></div>`;
        html += `<div class="three-tt-row">Mass: <b>1.00 M⊕</b></div>`;
        html += `<div class="three-tt-row">Has <b>1 moon</b> (orbit period 27.3 days real)</div>`;
    } else if (body.type === 'moon') {
        html += `<div class="three-tt-row">Earth's natural satellite</div>`;
        html += `<div class="three-tt-row">Orbit period: <b>27.3 days</b></div>`;
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
        // Fallback info
        const name = body.data.name || body.data.pl_name || 'Object';
        const detail = body.type === 'planet'
            ? `${name} — radius ${num(body.data.pl_rade).toFixed(2)} R⊕, period ${num(body.data.pl_orbper).toFixed(1)} days`
            : `${name} — diameter ${num(body.data.diameter_km).toFixed(1)} km, velocity ${num(body.data.velocity_kmh).toFixed(0)} km/h`;
        if (tooltipEl) { tooltipEl.innerHTML = `<div class="three-tt-name">${trunc(name, 28)}</div><div class="three-tt-row">${detail}</div>`; }
    }
}

// Camera Fixing
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
    camDistance = clamp(camDistance + e.deltaY * 0.02, 8, 90);
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

// Animations
function animate3D() {
    animationFrameId = requestAnimationFrame(animate3D);
    const dt = 0.016; // ~60fps frame
    simTime += dt * timeScale;

    if (currentMode === 'solar') {
        bodies.forEach(b => {
            if (b.type === 'asteroid') {
                b.phase += b.angSpeed * timeScale * dt;
                b.mesh.position.x = Math.cos(b.phase) * b.radius;
                b.mesh.position.z = Math.sin(b.phase) * b.radius;
                b.label.position.copy(b.mesh.position).add(new THREE.Vector3(0, (b.mesh.geometry.parameters.radius || 0.5) + 1.4, 0));
            } else if (b.type === 'earth') {
                b.phase += b.angSpeed * timeScale * dt;
                b.mesh.position.x = Math.cos(b.phase) * b.radius;
                b.mesh.position.z = Math.sin(b.phase) * b.radius;
                b.label.position.set(b.mesh.position.x, 1.9, b.mesh.position.z);
                if (b.moon) {
                    b.moon.phase += b.moon.angSpeed * timeScale * dt;
                    b.moon.mesh.position.set(
                        b.mesh.position.x + Math.cos(b.moon.phase) * b.moon.radius,
                        0,
                        b.mesh.position.z + Math.sin(b.moon.phase) * b.moon.radius
                    );
                    b.moon.label.position.copy(b.moon.mesh.position).add(new THREE.Vector3(0, 0.8, 0));
                }
            }
            // Rotation
            if (b.mesh && b.mesh.isMesh) {
                b.mesh.rotation.y += (b.spinSpeed || 0.2) * dt;
            }
        });
    } else {
        // Galaxy mode
        bodies.forEach(b => {
            if (b.type !== 'planet') return;
            // Stars/Planets around the core
            b.galaxyAngle += b.galaxySpeed * timeScale * dt;
            const sx = Math.cos(b.galaxyAngle) * b.galaxyRadius;
            const sz = Math.sin(b.galaxyAngle) * b.galaxyRadius;
            b.star.position.set(sx, 0, sz);
            // Planet orbits host star with original period
            b.phase += b.angSpeed * timeScale * dt * (1 / 240);
            const px = sx + Math.cos(b.phase) * b.orbitRadius;
            const pz = sz + Math.sin(b.phase) * b.orbitRadius;
            b.mesh.position.set(px, 0, pz);
            b.label.position.set(px, (b.mesh.geometry.parameters.radius || 0.4) + 1.3, pz);
            if (b.mesh.isMesh) b.mesh.rotation.y += (b.spinSpeed || 0.2) * dt;
        });
        // Only follow stars (Star have gravitational pull, Planets have both gravitational pull and also want to go away which causes to revolve around sun.)
        helperMeshes.forEach(h => { if (h.isLine && h.userData.starRef) {
            h.position.x = h.userData.starRef.position.x;
            h.position.z = h.userData.starRef.position.z;
        }});
    }

    // Camera Angle
    if (autoRotate && !isDragging) orbitYaw += 0.0015;
    updateCameraPosition();

    if (renderer && scene && camera) renderer.render(scene, camera);
}

// Top
function init3D(containerId) {
    const container = document.getElementById(containerId);
    if (!container) { console.error(`Container #${containerId} not found.`); return; }
    stop3DView();

    scene = new THREE.Scene();
    scene.background = null;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 320;

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 34;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cursor = 'grab';
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    buildStarfield();
    resetView();

    // Mouse/ Touch or any input devices
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);
    renderer.domElement.addEventListener('click', onClick);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

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

    // Remove input receivers
    if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('mousedown', startDrag);
        renderer.domElement.removeEventListener('click', onClick);
        renderer.domElement.removeEventListener('wheel', onWheel);
    }
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', endDrag);
    window.removeEventListener('resize', onWindowResize);

    // Dispose resources
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