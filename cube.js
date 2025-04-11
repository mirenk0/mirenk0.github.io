// Handles cube rendering, interaction, and navigation

let scene, camera, renderer, cube;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotationSpeed = { x: 0.005, y: 0.005 }; // Initial rotation speed
const pages = ['about', 'projects', 'blog', 'contact', 'resources', 'downloads'];
const pageNames = ['About', 'Projects', 'Blog', 'Contact', 'Resources', 'Downloads'];
let clickableLabels = [];

function initCube() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 4;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('cube-container').appendChild(renderer.domElement);

    let cubeSize = 2;  // Default cube size
    if (window.innerWidth <= 768) {  // Adjust this breakpoint as needed
        cubeSize = 0.69;  // Smaller size for mobile

        if (window.innerWidth <= 414) {  // iPhone sizes
            cubeSize = 0.65;  // Even smaller for iPhones
        }

        camera.position.z = 2.0; // Bring camera closer
    }

    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize, 50, 50, 50);

    const material = createCubeMaterials(); // Get shader material
    cube = new THREE.Mesh(geometry, material);

    const light = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(light);
    scene.add(cube);
    addClickableLabels(cubeSize); // Pass cube size to labels
    setupMouseControls();
    setupRaycaster();
    animate();
    window.addEventListener('resize', onWindowResize);
}
function createRoundedRectTexture(text, cubeSize) {
    const canvas = document.createElement('canvas');
    const canvasSize = 512; // Base canvas size
    canvas.width = canvasSize;
    canvas.height = canvasSize / 2; // Keep aspect ratio

    const ctx = canvas.getContext('2d');

    const cornerRadius = 50; // Adjust for more or less rounded corners
    const x = 0;
    const y = 0;
    const width = canvas.width;
    const height = canvas.height;

    ctx.beginPath();
    ctx.moveTo(x + cornerRadius, y);
    ctx.lineTo(x + width - cornerRadius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
    ctx.lineTo(x + width, y + height - cornerRadius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
    ctx.lineTo(x + cornerRadius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
    ctx.lineTo(x, y + cornerRadius);
    ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
    ctx.closePath();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Semi-transparent white
    ctx.fill();

    const fontSize = 46 * cubeSize;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

function addClickableLabels(cubeSize) {
    // Remove existing labels properly
    clickableLabels.forEach(label => {
        cube.remove(label);
        label.geometry.dispose();
        label.material.dispose();
    });
    clickableLabels = [];

    const labelPositions = [
        { position: [cubeSize/2 + 0.01, 0, 0], rotation: [0, Math.PI / 2, 0] },
        { position: [-cubeSize/2 - 0.01, 0, 0], rotation: [0, -Math.PI / 2, 0] },
        { position: [0, cubeSize/2 + 0.01, 0], rotation: [-Math.PI / 2, 0, 0] },
        { position: [0, -cubeSize/2 - 0.01, 0], rotation: [Math.PI / 2, 0, 0] },
        { position: [0, 0, cubeSize/2 + 0.01], rotation: [0, 0, 0] },
        { position: [0, 0, -cubeSize/2 - 0.01], rotation: [0, Math.PI, 0] }
    ];

    pages.forEach((page, index) => {
        const labelTexture = createRoundedRectTexture(pageNames[index], cubeSize);
        const labelGeometry = new THREE.PlaneGeometry(cubeSize / 2, cubeSize / 4); // Adjust size as needed
        const labelMaterial = new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.set(...labelPositions[index].position);
        label.rotation.set(...labelPositions[index].rotation);
        label.userData = { page };
        cube.add(label);
        clickableLabels.push(label);
    });
}

function createCubeMaterials() {
    const vertexShader = `
        varying vec3 vPosition;
        void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        varying vec3 vPosition;

        // Function to create a smooth gradient
        vec3 gradient(vec3 pos) {
            // Normalize the position to the range [0, 1]
            vec3 normalizedPos = (pos + vec3(1.0)) / 2.0;

            // Define the colors for the gradient
            vec3 color1 = vec3(1.0, 0.0, 0.0); // Red
            vec3 color2 = vec3(0.0, 1.0, 0.0); // Green
            vec3 color3 = vec3(0.0, 0.0, 1.0); // Blue

            // Interpolate between the colors based on the position
            vec3 color = mix(color1, color2, normalizedPos.x);
            color = mix(color, color3, normalizedPos.y);

            return color;
        }

        void main() {
            // Calculate the color based on the vertex position
            vec3 color = gradient(vPosition);

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    });

    return material;
}

function onWindowResize() {
    let cubeSize = 2;  // Default cube size
    if (window.innerWidth <= 768) {  // Adjust this breakpoint as needed
        cubeSize = 1.0;  // Smaller size for mobile

        if (window.innerWidth <= 414) {  // iPhone sizes
            cubeSize = 0.65;  // Even smaller for iPhones
        }

        camera.position.z = 2.0; // Bring camera closer
    } else {
        cubeSize = 2;
        camera.position.z = 4.0;
    }

    // Dispose of the old geometry
    cube.geometry.dispose();

    // Create a new geometry
    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize, 50, 50, 50);
    cube.geometry = geometry;

    // Recreate the labels
    addClickableLabels(cubeSize);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);


}

function setupMouseControls() {
    const container = document.getElementById('cube-container');
    let previousPosition = null;

    function handleStart(event) {
        isDragging = true;
        let position;
        if (event.touches) {
            position = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        } else {
            position = { x: event.clientX, y: event.clientY };
        }
        previousPosition = position;
    }

    function handleMove(event) {
        if (isDragging) {
            let position;
            if (event.touches) {
                position = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            } else {
                position = { x: event.clientX, y: event.clientY };
            }
            const deltaMove = { x: position.x - previousPosition.x, y: position.y - previousPosition.y };
            rotationSpeed.x = -deltaMove.y * 0.003;
            rotationSpeed.y = -deltaMove.x * 0.003;
            cube.rotation.x += rotationSpeed.x;
            cube.rotation.y += rotationSpeed.y;
            previousPosition = position;

            // Prevent scrolling during touch interaction
            if (event.touches) {
                event.preventDefault(); // Prevent scrolling
            }
        }
    }

    function handleEnd() {
        isDragging = false;
    }

    container.addEventListener('mousedown', handleStart);
    container.addEventListener('touchstart', handleStart, { passive: false }); // Mark listener as non-passive

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false }); // Mark listener as non-passive

    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchend', handleEnd);
}

function setupRaycaster() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    window.addEventListener('click', (event) => {
        if (isDragging) return;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(clickableLabels);
        if (intersects.length > 0) showPage(intersects[0].object.userData.page);
    });
}

function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += rotationSpeed.x; // Apply continuous rotation
    cube.rotation.y += rotationSpeed.y;

    renderer.render(scene, camera);
}

function showPage(pageId) {
    document.getElementById('content-container').style.display = 'block';
    document.querySelectorAll('.content-section').forEach(section => section.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    document.getElementById('cube-container').style.display = 'none';
}

function setupBackButton() {
    document.getElementById('back-button').addEventListener('click', () => {
        document.getElementById('content-container').style.display = 'none';
        document.getElementById('cube-container').style.display = 'block';
    });
}

window.addEventListener('load', () => {
    initCube();
    setupBackButton();
});

