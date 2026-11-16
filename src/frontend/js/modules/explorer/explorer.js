// 3D Space Explorer Module
import { fetchApi, showToast } from '../core/state.js';

let explorerState = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  ship: null,
  objects: [],
  sectors: [],
  visited: new Set(),
  credits: 0,
  fuel: 100,
  shield: 100,
  upgrades: { engine: 1, shield: 1, scanner: 1 },
  animationId: null,
  keys: {},
};

const SECTORS = [
  { name: 'Solar System', bounds: { x: [-150, 150], z: [-150, 150] }, color: 0xffa500, targets: ['Earth', 'Mars', 'Moon', 'Venus', 'Mercury'] },
  { name: 'Sirius Expanse', bounds: { x: [200, 500], z: [-150, 150] }, color: 0x00d4ff, targets: ['Sirius A', 'Sirius B'] },
  { name: 'Kepler Reach', bounds: { x: [550, 900], z: [-150, 150] }, color: 0x70d6ff, targets: ['Kepler-186f', 'Kepler-452b'] },
  { name: 'Alpha Sector', bounds: { x: [-150, 150], z: [200, 500] }, color: 0xff6b9d, targets: ['Alpha Cen Bb', 'Proxima c'] },
  { name: 'Proxima Deep', bounds: { x: [200, 500], z: [200, 500] }, color: 0xc44cff, targets: ['Proxima b', 'Proxima d'] },
  { name: 'TRAPPIST Frontier', bounds: { x: [550, 900], z: [200, 500] }, color: 0xa3e6ff, targets: ['TRAPPIST-1 e', 'TRAPPIST-1 f', 'TRAPPIST-1 g'] },
  { name: 'Wolf 1061 Region', bounds: { x: [-150, 150], z: [550, 900] }, color: 0xffcc00, targets: ['Wolf 1061c', 'Wolf 1061d'] },
  { name: 'Outer Reaches', bounds: { x: [200, 900], z: [550, 900] }, color: 0x7ef0a3, targets: ['LHS 1140 b', 'GJ 667C c'] },
];

export function initExplorer() {
  const canvas = document.getElementById('explorer-canvas');
  if (!canvas || canvas._explorer_initialized) return;
  
  canvas._explorer_initialized = true;
  
  initThreeScene(canvas);
  createShip();
  createSectors();
  createObjects();
  createHazards();
  setupControls();
  setupSectorButtons();
  setupUpgradeButtons();
  
  animate();
  
  // Cleanup on modal close
  const modal = document.getElementById('modal-explorer');
  if (modal) {
    const observer = new MutationObserver(() => {
      if (!modal.classList.contains('open') && explorerState.animationId) {
        cancelAnimationFrame(explorerState.animationId);
        explorerState.animationId = null;
      } else if (modal.classList.contains('open') && !explorerState.animationId) {
        animate();
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }
}

function initThreeScene(canvas) {
  if (typeof THREE === 'undefined') {
    console.warn('Three.js not loaded');
    return;
  }
  
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020711);
  scene.fog = new THREE.FogExp2(0x020711, 0.0008);
  
  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 2000);
  camera.position.set(0, 30, 50);
  
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.minDistance = 10;
  controls.maxDistance = 500;
  controls.maxPolarAngle = Math.PI / 2 - 0.01;
  
  // Lighting
  const ambient = new THREE.AmbientLight(0x222233, 0.5);
  scene.add(ambient);
  
  const sun = new THREE.DirectionalLight(0xffffee, 1.5);
  sun.position.set(100, 200, 100);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 500;
  sun.shadow.camera.left = -250;
  sun.shadow.camera.right = 250;
  sun.shadow.camera.top = 250;
  sun.shadow.camera.bottom = -250;
  scene.add(sun);
  
  // Starfield
  const starsGeometry = new THREE.BufferGeometry();
  const starsCount = 5000;
  const positions = new Float32Array(starsCount * 3);
  const colors = new Float32Array(starsCount * 3);
  const sizes = new Float32Array(starsCount);
  
  for (let i = 0; i < starsCount; i++) {
    const radius = 500 + Math.random() * 500;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
    
    const colorChoice = Math.random();
    if (colorChoice < 0.4) {
      colors[i * 3] = 1; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.7; // Warm
    } else if (colorChoice < 0.7) {
      colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1; // Cool
    } else {
      colors[i * 3] = 1; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.9; // White
    }
    
    sizes[i] = Math.random() * 2 + 0.5;
  }
  
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const starsMaterial = new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true,
  });
  
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
  
  // Nebula clouds
  const createNebula = (color, position, scale) => {
    const geo = new THREE.SphereGeometry(1, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.scale.setScalar(scale);
    scene.add(mesh);
    return mesh;
  };
  
  createNebula(0xff6b9d, new THREE.Vector3(-200, 0, -200), 400);
  createNebula(0x70d6ff, new THREE.Vector3(600, 0, 600), 500);
  createNebula(0xffa500, new THREE.Vector3(0, 0, 0), 300);
  
  // Sector grid
  const gridHelper = new THREE.GridHelper(1000, 40, 0x7c3aed, 0x06b6d4);
  gridHelper.material.opacity = 0.05;
  gridHelper.material.transparent = true;
  gridHelper.position.y = -10;
  scene.add(gridHelper);
  
  explorerState.scene = scene;
  explorerState.camera = camera;
  explorerState.renderer = renderer;
  explorerState.controls = controls;
  explorerState.stars = stars;
  
  // Resize handler
  const resizeObserver = new ResizeObserver(() => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(canvas);
}

function createShip() {
  const shipGroup = new THREE.Group();
  
  // Ship body
  const bodyGeo = new THREE.ConeGeometry(3, 12, 4);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xc7e5ff,
    metalness: 0.3,
    roughness: 0.4,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  shipGroup.add(body);
  
  // Cockpit
  const cockpitGeo = new THREE.SphereGeometry(2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const cockpitMat = new THREE.MeshStandardMaterial({
    color: 0x70d6ff,
    metalness: 0.1,
    roughness: 0.2,
    transparent: true,
    opacity: 0.6,
  });
  const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
  cockpit.position.set(0, 2, 0);
  cockpit.rotation.x = -Math.PI / 2;
  shipGroup.add(cockpit);
  
  // Engine glow
  const engineGeo = new THREE.ConeGeometry(1.5, 5, 8);
  const engineMat = new THREE.MeshBasicMaterial({
    color: 0x7ef0a3,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const engine = new THREE.Mesh(engineGeo, engineMat);
  engine.rotation.x = -Math.PI / 2;
  engine.position.y = -6;
  shipGroup.add(engine);
  shipGroup.engineGlow = engine;
  
  // Point light for engine
  const engineLight = new THREE.PointLight(0x7ef0a3, 1, 30);
  engineLight.position.y = -8;
  shipGroup.add(engineLight);
  shipGroup.engineLight = engineLight;
  
  shipGroup.position.set(0, 5, 0);
  shipGroup.velocity = new THREE.Vector3(0, 0, 0);
  shipGroup.rotation.y = Math.PI;
  
  explorerState.scene.add(shipGroup);
  explorerState.ship = shipGroup;
  
  // Update camera to follow ship
  explorerState.camera.position.set(0, 30, 50);
  explorerState.controls.target.set(0, 5, 0);
}

function createSectors() {
  SECTORS.forEach((sector, i) => {
    const { bounds, color, name } = sector;
    const xMid = (bounds.x[0] + bounds.x[1]) / 2;
    const zMid = (bounds.z[0] + bounds.z[1]) / 2;
    const xSize = bounds.x[1] - bounds.x[0];
    const zSize = bounds.z[1] - bounds.z[0];
    
    // Sector boundary
    const boxGeo = new THREE.BoxGeometry(xSize, 200, zSize);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const lineMat = new THREE.LineBasicMaterial({ 
      color, 
      transparent: true, 
      opacity: 0.2,
      linewidth: 1,
    });
    const boundary = new THREE.LineSegments(edges, lineMat);
    boundary.position.set(xMid, 0, zMid);
    explorerState.scene.add(boundary);
    
    // Sector label
    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = `
      position: absolute;
      color: ${'#' + color.toString(16).padStart(6, '0')};
      font-family: 'Space Grotesk', sans-serif;
      font-size: 12px;
      font-weight: 600;
      pointer-events: none;
      text-shadow: 0 0 8px currentColor;
      user-select: none;
    `;
    labelDiv.textContent = name;
    labelDiv.dataset.sector = name;
    labelDiv.dataset.x = xMid;
    labelDiv.dataset.z = zMid;
    document.body.appendChild(labelDiv);
    sector.labelElement = labelDiv;
  });
  
  // Update labels in render loop
  explorerState.sectorLabels = SECTORS.map(s => s.labelElement).filter(Boolean);
}

function createObjects() {
  const objectTypes = {
    planet: { color: 0x4E8C6E, size: 8, glow: 0x4E8C6E },
    moon: { color: 0xC9821A, size: 4, glow: 0xC9821A },
    exoplanet: { color: 0x70d6ff, size: 6, glow: 0x70d6ff },
    asteroid: { color: 0xf5a623, size: 2, glow: 0xf5a623 },
    star: { color: 0xffdd00, size: 15, glow: 0xffdd00 },
  };
  
  SECTORS.forEach((sector, sectorIndex) => {
    const { bounds, targets } = sector;
    
    targets.forEach((targetName, i) => {
      let type, color, size;
      
      if (targetName === 'Sun' || targetName.includes('Sirius') || targetName.includes('Alpha Cen') || targetName.includes('TRAPPIST') || targetName.includes('Wolf') || targetName.includes('LHS') || targetName.includes('GJ')) {
        type = 'star';
      } else if (targetName === 'Earth' || targetName === 'Mars' || targetName === 'Venus' || targetName === 'Mercury') {
        type = 'planet';
      } else if (targetName === 'Moon') {
        type = 'moon';
      } else if (targetName.includes('b') || targetName.includes('c') || targetName.includes('d') || targetName.includes('e') || targetName.includes('f') || targetName.includes('g')) {
        type = 'exoplanet';
      } else {
        type = 'asteroid';
      }
      
      const props = objectTypes[type];
      
      // Position within sector bounds
      const x = bounds.x[0] + Math.random() * (bounds.x[1] - bounds.x[0]);
      const z = bounds.z[0] + Math.random() * (bounds.z[1] - bounds.z[0]);
      const y = (Math.random() - 0.5) * 50;
      
      const group = new THREE.Group();
      group.position.set(x, y, z);
      
      // Main body
      const geo = new THREE.SphereGeometry(props.size, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: props.color,
        metalness: type === 'star' ? 0 : 0.2,
        roughness: type === 'star' ? 0 : 0.7,
        emissive: type === 'star' ? new THREE.Color(props.color) : new THREE.Color(0x000000),
        emissiveIntensity: type === 'star' ? 1 : 0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      
      // Glow aura
      const glowGeo = new THREE.SphereGeometry(props.size * 1.5, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: props.glow,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        depthWrite: false,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      group.add(glow);
      
      // Visited ring (initially hidden)
      const ringGeo = new THREE.RingGeometry(props.size * 1.8, props.size * 2.2, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x7ef0a3,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      group.add(ring);
      group.visitedRing = ring;
      
      // Label
      const labelDiv = document.createElement('div');
      labelDiv.style.cssText = `
        position: absolute;
        color: ${'#' + props.color.toString(16).padStart(6, '0')};
        font-family: 'Space Grotesk', sans-serif;
        font-size: 11px;
        font-weight: 500;
        pointer-events: none;
        text-shadow: 0 0 6px currentColor;
        white-space: nowrap;
        user-select: none;
        opacity: 0;
        transition: opacity 0.2s;
      `;
      labelDiv.textContent = targetName;
      labelDiv.dataset.object = targetName;
      document.body.appendChild(labelDiv);
      group.labelElement = labelDiv;
      
      group.userData = {
        name: targetName,
        type,
        sector: sector.name,
        discovered: false,
      };
      
      explorerState.scene.add(group);
      explorerState.objects.push(group);
    });
  });
}

function createHazards() {
  // Radiation zones
  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * 1000;
    const z = (Math.random() - 0.5) * 1000;
    const radius = 60 + Math.random() * 60;
    
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const zone = new THREE.Mesh(geo, mat);
    zone.position.set(x, 0, z);
    zone.userData = { type: 'radiation', radius, intensity: 0.5 + Math.random() * 0.5 };
    explorerState.scene.add(zone);
    explorerState.hazards = explorerState.hazards || [];
    explorerState.hazards.push(zone);
  }
  
  // Gravity wells
  for (let i = 0; i < 8; i++) {
    const sector = SECTORS[i];
    const x = (sector.bounds.x[0] + sector.bounds.x[1]) / 2 + (Math.random() - 0.5) * 100;
    const z = (sector.bounds.z[0] + sector.bounds.z[1]) / 2 + (Math.random() - 0.5) * 100;
    const radius = 80;
    
    const geo = new THREE.RingGeometry(radius * 0.9, radius * 1.1, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x44aaff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const well = new THREE.Mesh(geo, mat);
    well.rotation.x = -Math.PI / 2;
    well.position.set(x, -5, z);
    well.userData = { type: 'gravity', radius, strength: 1.2 + Math.random() * 0.8 };
    explorerState.scene.add(well);
    explorerState.hazards = explorerState.hazards || [];
    explorerState.hazards.push(well);
  }
}

function setupControls() {
  document.addEventListener('keydown', (e) => {
    explorerState.keys[e.code] = true;
    explorerState.keys[e.key.toLowerCase()] = true;
  });
  
  document.addEventListener('keyup', (e) => {
    explorerState.keys[e.code] = false;
    explorerState.keys[e.key.toLowerCase()] = false;
  });
  
  // Click to scan
  const canvas = document.getElementById('explorer-canvas');
  canvas?.addEventListener('click', (e) => {
    if (!explorerState.ship) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, explorerState.camera);
    
    const intersects = raycaster.intersectObjects(explorerState.objects, true);
    
    if (intersects.length > 0) {
      const object = intersects[0].object.parent;
      if (object && object.userData) {
        scanObject(object);
      }
    }
  });
}

function scanObject(object) {
  if (object.userData.discovered) return;
  
  object.userData.discovered = true;
  explorerState.visited.add(object.userData.name);
  
  // Show visited ring
  if (object.visitedRing) {
    object.visitedRing.material.opacity = 0.8;
  }
  
  // Show label
  if (object.labelElement) {
    object.labelElement.style.opacity = '1';
  }
  
  // Award credits
  const reward = 10 + Math.floor(Math.random() * 30);
  explorerState.credits += reward;
  
  // Update UI
  updateExplorerUI();
  
  // Show scan result
  const dataDiv = document.getElementById('explorer-data');
  if (dataDiv) {
    dataDiv.innerHTML = `
      <h4 style="color: var(--color-success-400); margin-bottom: 0.5rem;">📡 SCAN COMPLETE</h4>
      <p style="color: var(--color-space-100); font-weight: 600; font-size: 1.125rem; margin-bottom: 0.5rem;">${object.userData.name}</p>
      <p style="color: var(--color-space-400); font-size: 0.8125rem;">Sector: ${object.userData.sector}</p>
      <p style="color: var(--color-space-400); font-size: 0.8125rem;">Type: ${object.userData.type}</p>
      <p style="color: var(--color-solar-400); font-weight: 600; margin-top: 0.5rem;">+${reward} Credits</p>
    `;
  }
  
  // Add to log
  addToLog(`Discovered ${object.userData.name} (+${reward} CR)`);
  
  showToast(`Discovered ${object.userData.name}!`, 'success');
}

function setupSectorButtons() {
  const container = document.getElementById('explorer-sectors');
  if (!container) return;
  
  container.innerHTML = SECTORS.map(sector => `
    <button class="sector-btn" data-sector="${sector.name}" style="
      padding: 0.375rem 0.75rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--radius-full);
      color: var(--color-space-400);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 0.6875rem;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition-fast);
    ">${sector.name}</button>
  `).join('');
  
  container.querySelectorAll('.sector-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sector = SECTORS.find(s => s.name === btn.dataset.sector);
      if (sector && explorerState.ship) {
        const xMid = (sector.bounds.x[0] + sector.bounds.x[1]) / 2;
        const zMid = (sector.bounds.z[0] + sector.bounds.z[1]) / 2;
        
        explorerState.ship.position.set(xMid, 5, zMid);
        explorerState.ship.velocity.set(0, 0, 0);
        explorerState.controls.target.set(xMid, 5, zMid);
        
        container.querySelectorAll('.sector-btn').forEach(b => {
          b.style.background = 'rgba(255,255,255,0.05)';
          b.style.borderColor = 'rgba(255,255,255,0.1)';
          b.style.color = 'var(--color-space-400)';
        });
        btn.style.background = 'rgba(124,58,237,0.2)';
        btn.style.borderColor = 'var(--color-nebula-500)';
        btn.style.color = 'var(--color-nebula-400)';
      }
    });
  });
}

function setupUpgradeButtons() {
  const panel = document.getElementById('upgrades-panel');
  if (!panel) return;
  
  const upgradeConfig = {
    engine: { name: 'Engine Boost', max: 5, baseCost: 50, color: 'var(--color-nebula-500)' },
    shield: { name: 'Shield Upgrade', max: 5, baseCost: 60, color: 'var(--color-aurora-500)' },
    scanner: { name: 'Scanner Range', max: 5, baseCost: 40, color: 'var(--color-solar-500)' },
  };
  
  function renderUpgrades() {
    panel.innerHTML = Object.entries(upgradeConfig).map(([key, config]) => {
      const level = explorerState.upgrades[key];
      const cost = config.baseCost * level;
      const canAfford = explorerState.credits >= cost;
      const isMaxed = level >= config.max;
      
      return `
        <div class="upgrade-item" style="
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: var(--radius-md);
        ">
          <div style="flex: 1;">
            <div style="font-weight: 600; color: var(--color-space-100);">${config.name}</div>
            <div style="font-size: 0.75rem; color: var(--color-space-500);">Level ${level} / ${config.max}</div>
          </div>
          <div style="font-family: var(--font-mono); font-size: 0.875rem; font-weight: 700; color: ${config.color};">${cost} CR</div>
          <button class="upgrade-btn" data-upgrade="${key}" ${isMaxed || !canAfford ? 'disabled' : ''} style="
            padding: 0.375rem 0.875rem;
            border-radius: var(--radius-sm);
            font-family: 'Space Grotesk', sans-serif;
            font-size: 0.75rem;
            font-weight: 600;
            ${isMaxed ? 'background: rgba(34,197,94,0.2); color: var(--color-success-400); border: 1px solid rgba(34,197,94,0.3);' : canAfford ? `background: ${config.color}; color: #2d1810; border: none;` : 'background: rgba(255,255,255,0.05); color: var(--color-space-500); border: 1px solid rgba(255,255,255,0.1);'}
            cursor: ${isMaxed || !canAfford ? 'not-allowed' : 'pointer'};
            opacity: ${isMaxed || !canAfford ? '0.6' : '1'};
            transition: var(--transition-fast);
          ">
            ${isMaxed ? 'MAXED' : canAfford ? 'UPGRADE' : `NEED ${cost} CR`}
          </button>
        </div>
      `;
    }).join('');
    
    panel.querySelectorAll('.upgrade-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => purchaseUpgrade(btn.dataset.upgrade));
    });
  }
  
  explorerState.renderUpgrades = renderUpgrades;
  renderUpgrades();
}

function purchaseUpgrade(key) {
  const config = {
    engine: { baseCost: 50, max: 5 },
    shield: { baseCost: 60, max: 5 },
    scanner: { baseCost: 40, max: 5 },
  }[key];
  
  const level = explorerState.upgrades[key];
  const cost = config.baseCost * level;
  
  if (explorerState.credits < cost || level >= config.max) return;
  
  explorerState.credits -= cost;
  explorerState.upgrades[key]++;
  
  // Apply effects
  if (key === 'shield') {
    explorerState.shield = Math.min(100 + (explorerState.upgrades.shield - 1) * 25, 200);
  }
  
  explorerState.renderUpgrades?.();
  updateExplorerUI();
  showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} upgraded to level ${explorerState.upgrades[key]}!`, 'success');
}

function updateShip() {
  const ship = explorerState.ship;
  if (!ship) return;
  
  const engineMult = 1 + (explorerState.upgrades.engine - 1) * 0.4;
  const boost = explorerState.keys.shiftleft || explorerState.keys.shiftright ? 2 : 1;
  const accel = 0.15 * boost * engineMult;
  
  // Rotation
  if (explorerState.keys.arrowleft || explorerState.keys.keya) ship.rotation.y += 0.02 * boost;
  if (explorerState.keys.arrowright || explorerState.keys.keyd) ship.rotation.y -= 0.02 * boost;
  if (explorerState.keys.arrowup || explorerState.keys.keyw) ship.rotation.x -= 0.01 * boost;
  if (explorerState.keys.arrowdown || explorerState.keys.keys) ship.rotation.x += 0.01 * boost;
  
  ship.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, ship.rotation.x));
  
  // Thrust
  if (explorerState.keys.arrowup || explorerState.keys.keyw) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
    ship.velocity.addScaledVector(forward, accel);
  }
  if (explorerState.keys.arrowdown || explorerState.keys.keys) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
    ship.velocity.addScaledVector(forward, -accel * 0.5);
  }
  
  // Fuel consumption
  const moving = explorerState.keys.arrowup || explorerState.keys.keyw || 
                 explorerState.keys.arrowdown || explorerState.keys.keys ||
                 explorerState.keys.arrowleft || explorerState.keys.keya ||
                 explorerState.keys.arrowright || explorerState.keys.keyd;
  
  if (moving && explorerState.fuel > 0) {
    explorerState.fuel = Math.max(0, explorerState.fuel - 0.02 * boost);
  } else {
    explorerState.fuel = Math.min(100, explorerState.fuel + 0.01);
  }
  
  // Engine glow
  if (ship.engineGlow) {
    ship.engineGlow.material.opacity = moving ? 0.8 : 0.3;
    ship.engineGlow.scale.y = moving ? 1 + Math.random() * 0.5 : 0.5;
  }
  if (ship.engineLight) {
    ship.engineLight.intensity = moving ? 1.5 : 0.3;
  }
  
  // Gravity wells
  explorerState.hazards?.forEach(hazard => {
    if (hazard.userData.type === 'gravity') {
      const dist = ship.position.distanceTo(hazard.position);
      if (dist < hazard.userData.radius) {
        const dir = new THREE.Vector3().subVectors(hazard.position, ship.position).normalize();
        const pull = (1 - dist / hazard.userData.radius) * 0.03 * hazard.userData.strength;
        ship.velocity.addScaledVector(dir, pull);
      }
    }
  });
  
  // Radiation zones
  let inRadiation = false;
  explorerState.hazards?.forEach(hazard => {
    if (hazard.userData.type === 'radiation') {
      const dist = ship.position.distanceTo(hazard.position);
      if (dist < hazard.userData.radius) {
        inRadiation = true;
        const intensity = (1 - dist / hazard.userData.radius) * hazard.userData.intensity;
        explorerState.fuel = Math.max(0, explorerState.fuel - intensity * 0.01);
        explorerState.shield = Math.max(0, explorerState.shield - intensity * 0.005);
      }
    }
  });
  
  // Shield regen
  if (!inRadiation && explorerState.shield < (100 + (explorerState.upgrades.shield - 1) * 25)) {
    explorerState.shield = Math.min(explorerState.shield + 0.01, 100 + (explorerState.upgrades.shield - 1) * 25);
  }
  
  // Apply velocity
  ship.velocity.multiplyScalar(0.98);
  ship.position.add(ship.velocity);
  
  // Boundary
  const boundary = 500;
  ship.position.x = Math.max(-boundary, Math.min(boundary, ship.position.x));
  ship.position.z = Math.max(-boundary, Math.min(boundary, ship.position.z));
  ship.position.y = Math.max(-100, Math.min(100, ship.position.y));
  
  // Update camera target
  explorerState.controls.target.lerp(ship.position, 0.1);
  
  // Update engine light position
  if (ship.engineLight) {
    ship.engineLight.position.copy(ship.position);
    ship.engineLight.position.y -= 8;
  }
}

function animate() {
  explorerState.animationId = requestAnimationFrame(animate);
  
  updateShip();
  updateSectorLabels();
  updateObjectLabels();
  updateRadar();
  updateExplorerUI();
  
  explorerState.controls.update();
  explorerState.renderer.render(explorerState.scene, explorerState.camera);
  
  // Animate stars
  if (explorerState.stars) {
    explorerState.stars.rotation.y += 0.00002;
  }
}

function updateSectorLabels() {
  explorerState.sectorLabels?.forEach(label => {
    const sector = SECTORS.find(s => s.labelElement === label);
    if (!sector) return;
    
    const vector = new THREE.Vector3(
      parseFloat(label.dataset.x),
      50,
      parseFloat(label.dataset.z)
    ).project(explorerState.camera);
    
    if (vector.z < 1) {
      const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
      label.style.transform = `translate(${x}px, ${y}px)`;
      label.style.opacity = '0.7';
    } else {
      label.style.opacity = '0';
    }
  });
}

function updateObjectLabels() {
  explorerState.objects.forEach(obj => {
    if (!obj.labelElement) return;
    
    const vector = obj.position.clone().project(explorerState.camera);
    
    if (vector.z < 1) {
      const dist = explorerState.camera.position.distanceTo(obj.position);
      if (dist < 200) {
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight - 30;
        obj.labelElement.style.transform = `translate(${x}px, ${y}px)`;
        obj.labelElement.style.opacity = obj.userData.discovered ? '1' : '0.5';
      } else {
        obj.labelElement.style.opacity = '0';
      }
    } else {
      obj.labelElement.style.opacity = '0';
    }
  });
}

function updateRadar() {
  // Radar is handled in UI update
}

function updateExplorerUI() {
  const fuelEl = document.getElementById('explorer-fuel');
  const shieldEl = document.getElementById('explorer-shield');
  const creditsEl = document.getElementById('explorer-credits');
  const statusEl = document.getElementById('explorer-status');
  
  if (fuelEl) fuelEl.textContent = `${Math.round(explorerState.fuel)}%`;
  if (shieldEl) shieldEl.textContent = `${Math.round(explorerState.shield)}%`;
  if (creditsEl) creditsEl.textContent = explorerState.credits.toLocaleString();
  
  if (statusEl) {
    // Determine current sector
    let currentSector = 'Deep Space';
    SECTORS.forEach(sector => {
      if (explorerState.ship &&
          explorerState.ship.position.x >= sector.bounds.x[0] &&
          explorerState.ship.position.x <= sector.bounds.x[1] &&
          explorerState.ship.position.z >= sector.bounds.z[0] &&
          explorerState.ship.position.z <= sector.bounds.z[1]) {
        currentSector = sector.name;
      }
    });
    
    const speed = explorerState.ship ? explorerState.ship.velocity.length().toFixed(1) : 0;
    statusEl.textContent = `[${currentSector}] Fuel: ${Math.round(explorerState.fuel)}% | Shield: ${Math.round(explorerState.shield)}% | Speed: ${speed} u/s | Credits: ${explorerState.credits}`;
  }
}

function addToLog(message) {
  const logDiv = document.getElementById('explorer-log');
  if (!logDiv) return;
  
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.style.cssText = 'color: var(--color-space-400); font-size: 0.75rem; padding: 0.25rem 0; border-bottom: 1px solid rgba(255,255,255,0.03);';
  entry.innerHTML = `<span style="color: var(--color-space-500);">[${time}]</span> ${message}`;
  
  logDiv.insertBefore(entry, logDiv.firstChild);
  
  // Keep only last 20 entries
  while (logDiv.children.length > 20) {
    logDiv.removeChild(logDiv.lastChild);
  }
}