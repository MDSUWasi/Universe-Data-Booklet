// src/frontend/three_view.js
// I am setting up global variables to store the 3D scene, camera, and renderer
let scene, camera, renderer, planetMeshes = [];
let animationFrameId;

/**
 * I initialize the 3D scene inside a specific HTML container
 * @param {string} containerId - The ID of the div where I will draw the 3D world
 */
function init3D(containerId) {
    // I get the HTML element by its ID
    const container = document.getElementById(containerId);
    // If the container doesn't exist, I stop and log an error
    if (!container) {
        console.error(`Container #${containerId} not found.`);
        return;
    }

    // If I already have a renderer, I clean it up to prevent memory leaks
    if (renderer) {
        container.removeChild(renderer.domElement);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        planetMeshes = [];
    }

    // 1. I create a new 3D Scene (the world)
    scene = new THREE.Scene();
    // I set the background to null so it's transparent (blends with CSS)
    scene.background = null; 

    // 2. I create a Camera to look at the scene
    // I calculate width/height from the container
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 300;
    
    // PerspectiveCamera mimics human eye vision
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    // I move the camera back so we can see the objects
    camera.position.z = 30;

    // 3. I create the Renderer (the engine that draws pixels)
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio); // Sharpness for high-res screens
    // I add the renderer's canvas to the HTML container
    container.appendChild(renderer.domElement);

    // 4. I add Lights so objects are visible
    const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft base light
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 2, 100); // Bright spot light
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // 5. I listen for window resize to keep the 3D view correct
    window.addEventListener('resize', onWindowResize, false);
}

// I handle window resizing to update camera and renderer
function onWindowResize() {
    if (!camera || !renderer) return;
    const container = document.getElementById('3d-view-container');
    if (!container) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

/**
 * I populate the scene with spheres based on the data I received
 * @param {Array} data - The array of asteroids or exoplanets
 */
function populate3D(data) {
    // I clear any old planets from the scene
    planetMeshes.forEach(mesh => scene.remove(mesh));
    planetMeshes = [];

    // If there is no data, I stop
    if (!data || data.length === 0) return;

    // I only show the first 25 items to keep performance high
    const displayData = data.slice(0, 25);

    // I loop through each item to create a 3D sphere
    displayData.forEach((item, index) => {
        // I calculate the size based on the data type
        let size = 1;
        if (item.pl_rade) {
            // Exoplanets: Use radius (Earth Radii)
            size = parseFloat(item.pl_rade) * 0.8; 
        } else if (item.diameter_km) {
            // Asteroids: Use diameter (logarithmic scale to fit them)
            size = Math.log(parseFloat(item.diameter_km) + 1) * 0.5;
        }

        // I clamp the size so they aren't too tiny or too huge
        size = Math.max(0.5, Math.min(size, 6));

        // I choose a color based on the object's properties
        let colorHex = 0x4488ff; // Default Blue
        if (item.hazardous) colorHex = 0xff4444; // Red if dangerous
        else if (item.esi && item.esi > 0.6) colorHex = 0x44ff44; // Green if Earth-like

        // I create the shape (Sphere)
        const geometry = new THREE.SphereGeometry(size, 32, 32);
        // I create the material (how it looks with light)
        const material = new THREE.MeshPhongMaterial({ 
            color: colorHex,
            shininess: 40,
            specular: 0x111111
        });

        // I combine shape and material into a Mesh (the object)
        const mesh = new THREE.Mesh(geometry, material);

        // I position the object in a spiral pattern
        const angle = index * 0.4;
        const radius = 6 + (index * 1.2);
        
        mesh.position.x = Math.cos(angle) * radius;
        mesh.position.y = Math.sin(angle) * radius;
        mesh.position.z = (Math.random() - 0.5) * 15;

        // I save the data inside the object so I can use it later
        mesh.userData = { 
            name: item.name || item.pl_name, 
            info: item,
            originalIndex: index
        };
        
        // I add the object to the scene
        scene.add(mesh);
        planetMeshes.push(mesh);
    });
}

/**
 * I run the animation loop (this runs 60 times per second)
 */
function animate3D() {
    // I request the next frame
    animationFrameId = requestAnimationFrame(animate3D);

    // I rotate every planet slowly to make it look alive
    planetMeshes.forEach(mesh => {
        mesh.rotation.y += 0.005;
        mesh.rotation.x += 0.002;
    });

    // I tell the renderer to draw the scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// ==========================================
// I expose these functions to the GLOBAL window
// This allows app.js to call them directly
// ==========================================

// I define the function to start the 3D view
window.load3DView = function(data, containerId = '3d-view-container') {
    init3D(containerId);       // Setup the scene
    populate3D(data);          // Add the planets
    animate3D();               // Start the animation loop
};

// I define the function to stop the 3D view (cleanup)
window.stop3DView = function() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (renderer) {
        renderer.dispose();    // Free up GPU memory
        renderer = null;
    }
};