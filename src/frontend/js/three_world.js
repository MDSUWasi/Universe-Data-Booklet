let scene, camera, renderer, planetMeshes = [];
let animationFrameId;

window.load3DWorld = function(data) {
    const container = document.getElementById('three-panel');
    if (!container || !data || !data.length) return;

    // Cleanup existing
    if (renderer) {
        container.removeChild(renderer.domElement);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        planetMeshes = [];
    }

    scene = new THREE.Scene();
    scene.background = null;

    const width = container.clientWidth;
    const height = container.clientHeight;

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 30;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Add lights
    scene.add(new THREE.AmbientLight(0x404040, 2));
    const pointLight = new THREE.PointLight(0xffffff, 2, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Create spheres (limit to 25 for performance)
    const displayData = data.slice(0, 25);
    displayData.forEach((item, index) => {
        let size = 1;
        if (item.pl_rade) size = parseFloat(item.pl_rade) * 0.8;
        else if (item.diameter_km) size = Math.log(parseFloat(item.diameter_km) + 1) * 0.5;
        size = Math.max(0.5, Math.min(size, 6));

        let colorHex = 0x4488ff;
        if (item.hazardous) colorHex = 0xff4444;
        else if (item.esi && item.esi > 0.6) colorHex = 0x44ff44;

        const geometry = new THREE.SphereGeometry(size, 32, 32);
        const material = new THREE.MeshPhongMaterial({ color: colorHex, shininess: 40 });
        const mesh = new THREE.Mesh(geometry, material);

        // Spiral arrangement
        const angle = index * 0.4;
        const radius = 6 + (index * 1.2);
        mesh.position.x = Math.cos(angle) * radius;
        mesh.position.y = Math.sin(angle) * radius;
        mesh.position.z = (Math.random() - 0.5) * 15;

        mesh.userData = { name: item.name || item.pl_name };
        scene.add(mesh);
        planetMeshes.push(mesh);
    });

    animate3D();
};

function animate3D() {
    animationFrameId = requestAnimationFrame(animate3D);
    planetMeshes.forEach(mesh => {
        mesh.rotation.y += 0.005;
        mesh.rotation.x += 0.002;
    });
    if (renderer && scene && camera) renderer.render(scene, camera);
}

window.stop3DView = function() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (renderer) {
        renderer.dispose();
        renderer = null;
    }
};