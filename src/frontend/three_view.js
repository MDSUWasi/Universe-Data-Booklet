// src/frontend/three_view.js
let scene, camera, renderer, planetMeshes = [];
let animationFrameId;

function init3D(containerId) {
    const container = document.getElementById(containerId);
    if (!container) { console.error(`Container #${containerId} not found.`); return; }

    // Cleanup previous instance properly
    if (renderer) {
        stop3DView();
    }

    scene = new THREE.Scene();
    scene.background = null; 

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 300;
    
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 30;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 2, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    if (!camera || !renderer) return;
    const container = renderer.domElement.parentElement;
    if (!container) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function populate3D(data) {
    // Clear old meshes
    planetMeshes.forEach(mesh => scene.remove(mesh));
    planetMeshes = [];

    if (!data || data.length === 0) return;

    // Capped at 100 to prevent browser crash
    const MAX_DISPLAY = 100; 
    const displayData = data.slice(0, Math.min(MAX_DISPLAY, data.length));

    displayData.forEach((item, index) => {
        let size = 1;
        if (item.pl_rade) {
            size = parseFloat(item.pl_rade) * 0.8; 
        } else if (item.diameter_km) {
            size = Math.log(parseFloat(item.diameter_km) + 1) * 0.5;
        }

        size = Math.max(0.5, Math.min(size, 6));

        let colorHex = 0x4488ff; 
        if (item.hazardous) colorHex = 0xff4444; 
        else if (item.esi && item.esi > 0.6) colorHex = 0x44ff44; 

        const geometry = new THREE.SphereGeometry(size, 32, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color: colorHex,
            shininess: 40,
            specular: 0x111111
        });

const mesh = new THREE.Mesh(geometry, material);

        const angle = index * 0.4;
        const radius = 6 + (index * 1.2);
        
        mesh.position.x = Math.cos(angle) * radius;
        mesh.position.y = Math.sin(angle) * radius;
        mesh.position.z = (Math.random() - 0.5) * 15;

        mesh.userData = { name: item.name || item.pl_name, info: item, index: index };
        
        // Add orbit ring for this object
        const ringGeo = new THREE.RingGeometry(radius - 0.15, radius + 0.15, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: item.hazardous ? 0xff4444 : 0x4488ff,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        scene.add(ring);

        scene.add(mesh);
        planetMeshes.push(mesh);
    });

    // Enable simple auto-rotation for a more dynamic view
    window.addEventListener('mousedown', startDrag, false);
    window.addEventListener('mousemove', onDrag, false);
    window.addEventListener('mouseup', endDrag, false);
}

let isDragging = false;
let prevMouseX = 0;
let prevMouseY = 0;
let rotX = 0;
let rotY = 0;

function startDrag(e) { isDragging = true; prevMouseX = e.clientX; prevMouseY = e.clientY; }
function endDrag() { isDragging = false; }
function onDrag(e) {
    if (!isDragging || !camera) return;
    const dx = (e.clientX - prevMouseX) * 0.01;
    const dy = (e.clientY - prevMouseY) * 0.01;
    rotY += dx;
    rotX = Math.max(-1.5, Math.min(1.5, rotX + dy));
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
    camera.position.x = 30 * Math.sin(rotY) * Math.cos(rotX);
    camera.position.y = 30 * Math.sin(rotX);
    camera.position.z = 30 * Math.cos(rotY) * Math.cos(rotX);
    camera.lookAt(0, 0, 0);
}

function animate3D() {
    animationFrameId = requestAnimationFrame(animate3D);
    planetMeshes.forEach(mesh => {
        mesh.rotation.y += 0.005;
        mesh.rotation.x += 0.002;
    });
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// CRITICAL FIX: Proper Memory Disposal
window.stop3DView = function() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    // Remove drag listeners
    window.removeEventListener('mousedown', startDrag, false);
    window.removeEventListener('mousemove', onDrag, false);
    window.removeEventListener('mouseup', endDrag, false);

    planetMeshes.forEach(mesh => {
        if(mesh.geometry) mesh.geometry.dispose();
        if(mesh.material) {
            mesh.material.dispose();
        }
    });

    planetMeshes = [];

    if (renderer) {
        const parent = renderer.domElement.parentElement;
        if (parent) parent.innerHTML = '';
        renderer.dispose();
        renderer.forceContextLoss();
        renderer = null;
    }
};

window.load3DView = function(data, containerId = '3d-view-container') {
    init3D(containerId);
    populate3D(data);
    animate3D();
};