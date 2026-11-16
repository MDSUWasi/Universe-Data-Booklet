// 3D Terrain Lab Module
import { fetchApi, escapeHtml, showToast } from '../core/state.js';

let terrainScene = null;
let currentBody = 'Earth';
let currentSite = '';
let currentMode = 'elevation';
let exaggeration = 4;

const SITES = {
  Moon: [
    { id: 'moon_south', name: 'Lunar South Pole', lat: -89.5, lng: 0.0, file: 'moon.json' },
  ],
  Mars: [
    { id: 'jezero', name: 'Jezero Crater', lat: 18.4, lng: 77.5, file: 'jezero.json' },
  ],
};

const SITE_META = {
  moon_south: { area: '234 km²', slope: '2.1°', rough: '1.8m', p95: '3.9m', elev: '1500m' },
  jezero: { area: '156 km²', slope: '1.8°', rough: '1.3m', p95: '3.2m', elev: '-2600m' },
};

export function initTerrain() {
  const bodySelect = document.getElementById('terrain-body');
  const siteSelect = document.getElementById('terrain-site');
  const modeSelect = document.getElementById('terrain-mode');
  const exaggerationSlider = document.getElementById('terrain-exaggeration');
  const exaggerationValue = document.getElementById('terrain-exaggeration-value');
  const canvas = document.getElementById('terrain-canvas');
  const statusDiv = document.getElementById('terrain-status');
  const metaDiv = document.getElementById('terrain-meta');
  
  if (!bodySelect || !siteSelect || !modeSelect || !exaggerationSlider || !exaggerationValue || !canvas) return;
  
  // Populate body select
  bodySelect.innerHTML = Object.keys(SITES).map(body => `<option value="${body}">${body === 'Moon' ? '○' : '▲'} ${body}</option>`).join('');
  
  bodySelect.addEventListener('change', () => {
    currentBody = bodySelect.value;
    updateSiteSelect();
    loadTerrain();
  });
  
  siteSelect.addEventListener('change', () => {
    currentSite = siteSelect.value;
    loadTerrain();
  });
  
  modeSelect.addEventListener('change', () => {
    currentMode = modeSelect.value;
    renderTerrain();
  });
  
  exaggerationSlider.addEventListener('input', () => {
    exaggeration = parseFloat(exaggerationSlider.value);
    exaggerationValue.textContent = exaggeration + '×';
    renderTerrain();
  });
  
  // Initialize Three.js scene
  initThreeScene(canvas);
  
  // Initial load
  updateSiteSelect();
  if (siteSelect.value) loadTerrain();
}

function updateSiteSelect() {
  const siteSelect = document.getElementById('terrain-site');
  if (!siteSelect) return;
  
  const sites = SITES[currentBody] || [];
  siteSelect.innerHTML = sites.map(site => `<option value="${site.id}">${site.name}</option>`).join('');
  currentSite = siteSelect.value || '';
}

async function loadTerrain() {
  const statusDiv = document.getElementById('terrain-status');
  const metaDiv = document.getElementById('terrain-meta');
  const siteSelect = document.getElementById('terrain-site');
  
  if (!currentSite || !siteSelect) return;
  
  const siteInfo = SITES[currentBody].find(s => s.id === currentSite);
  if (!siteInfo) return;
  
  statusDiv.textContent = 'Loading terrain data...';
  statusDiv.style.color = 'var(--color-aurora-400)';
  
  try {
    const response = await fetchApi(`/api/terrain/data?body=${currentBody}&site=${currentSite}`);
    if (response.error) throw new Error(response.error);
    
    terrainScene.data = response;
    renderTerrain();
    
    statusDiv.textContent = `Loaded ${currentBody} - ${siteInfo.name} (${response.width || 100}×${response.height || 100} grid)`;
    statusDiv.style.color = 'var(--color-success-400)';
    
    // Update meta
    const meta = SITE_META[currentSite] || {};
    if (metaDiv) {
      metaDiv.innerHTML = Object.entries(meta).map(([key, value]) => `
        <div style="display: flex; justify-content: space-between; gap: 1rem; padding: 0.25rem 0;">
          <span style="color: var(--color-space-500);">${key}</span>
          <strong>${value}</strong>
        </div>
      `).join('');
    }
    
  } catch (error) {
    console.error('Terrain load error:', error);
    statusDiv.textContent = `Error: ${error.message}`;
    statusDiv.style.color = 'var(--color-danger-400)';
    showToast('Failed to load terrain: ' + error.message, 'error');
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
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030712);
  scene.fog = new THREE.FogExp2(0x030712, 0.002);
  
  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(0, 80, 120);
  camera.lookAt(0, 0, 0);
  
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.minDistance = 20;
  controls.maxDistance = 300;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  
  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);
  
  const sun = new THREE.DirectionalLight(0xfff5e6, 1.5);
  sun.position.set(100, 200, 100);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  scene.add(sun);
  
  const fill = new THREE.DirectionalLight(0x70d6ff, 0.3);
  fill.position.set(-100, 50, -100);
  scene.add(fill);
  
  // Ground plane for reference
  const groundGeo = new THREE.PlaneGeometry(500, 500);
  const groundMat = new THREE.MeshStandardMaterial({ 
    color: 0x0a0f1a, 
    transparent: true, 
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -10;
  scene.add(ground);
  
  // Grid helper
  const grid = new THREE.GridHelper(500, 50, 0x7c3aed, 0x06b6d4);
  grid.material.opacity = 0.15;
  grid.material.transparent = true;
  scene.add(grid);
  
  terrainScene = {
    renderer,
    scene,
    camera,
    controls,
    mesh: null,
    data: null,
  };
  
  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(canvas);
  
  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
  
  return terrainScene;
}

function renderTerrain() {
  if (!terrainScene || !terrainScene.data) return;
  
  const { scene, mesh } = terrainScene;
  
  // Remove old mesh
  if (mesh) {
    scene.remove(mesh);
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(m => m.dispose());
    } else {
      mesh.material.dispose();
    }
  }
  
  const data = terrainScene.data;
  const elevations = data.elevation || data.elevations;
  const slopes = data.slope || data.slopes;
  const roughness = data.roughness || data.roughnesses;
  
  if (!elevations || !elevations.length) return;
  
  const width = data.width || elevations[0].length;
  const height = data.height || elevations.length;
  const cellSize = data.cell_size || 30; // meters per cell
  
  // Create geometry
  const geometry = new THREE.PlaneGeometry(
    width * cellSize,
    height * cellSize,
    width - 1,
    height - 1
  );
  geometry.rotateX(-Math.PI / 2);
  
  const positions = geometry.attributes.position;
  const colors = [];
  
  // Color scales
  const getColor = (value, min, max, mode) => {
    const t = (value - min) / (max - min || 1);
    const clamped = Math.max(0, Math.min(1, t));
    
    if (mode === 'elevation') {
      // Blue -> Green -> Brown -> White
      if (clamped < 0.25) return new THREE.Color().setHSL(0.55, 0.7, 0.2 + clamped * 1.5);
      if (clamped < 0.5) return new THREE.Color().setHSL(0.35, 0.5, 0.3 + clamped * 0.5);
      if (clamped < 0.75) return new THREE.Color().setHSL(0.08, 0.4, 0.35 + clamped * 0.3);
      return new THREE.Color().setHSL(0, 0, 0.7 + clamped * 0.3);
    } else if (mode === 'slope') {
      // Green -> Yellow -> Red
      return new THREE.Color().setHSL(0.33 * (1 - clamped), 0.8, 0.4);
    } else {
      // Purple -> Cyan -> Yellow
      return new THREE.Color().setHSL(0.75 - clamped * 0.55, 0.8, 0.4);
    }
  };
  
  let minVal = Infinity, maxVal = -Infinity;
  const values = [];
  
  // Flatten data for color mapping
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let val;
      if (currentMode === 'elevation') val = elevations[y][x];
      else if (currentMode === 'slope') val = slopes?.[y]?.[x] || 0;
      else val = roughness?.[y]?.[x] || 0;
      
      if (currentMode === 'safe') {
        val = slopes?.[y]?.[x] || 0;
      }
      
      values.push(val);
      minVal = Math.min(minVal, val);
      maxVal = Math.max(maxVal, val);
    }
  }
  
  // Apply heights and colors
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const val = values[i] || 0;
    positions.setY(i, y + val * exaggeration);
    
    const color = getColor(val, minVal, maxVal, currentMode);
    colors.push(color.r, color.g, color.b);
  }
  
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.1,
    flatShading: false,
  });
  
  const newMesh = new THREE.Mesh(geometry, material);
  newMesh.castShadow = true;
  newMesh.receiveShadow = true;
  newMesh.position.y = -exaggeration * (minVal + maxVal) / 2 * 0.5;
  
  scene.add(newMesh);
  terrainScene.mesh = newMesh;
  
  // Adjust camera
  const bbox = new THREE.Box3().setFromObject(newMesh);
  const size = bbox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.z);
  terrainScene.camera.position.set(0, maxDim * 1.2, maxDim * 1.5);
  terrainScene.controls.target.set(0, newMesh.position.y, 0);
  terrainScene.controls.update();
}

// Export for modal open
export function refreshTerrain() {
  if (terrainScene) {
    renderTerrain();
  }
}