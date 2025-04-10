// 3D Cube Navigation System
// Handles cube rendering, interaction, and navigation

let scene, camera, renderer, cube;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotationSpeed = { x: 0, y: 0 };
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
    
    const geometry = new THREE.BoxGeometry(2, 2, 2, 10, 10, 10);
    createCubeMaterials();
    cube = new THREE.Mesh(geometry, materials);
    
    const light = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(light);
    scene.add(cube);
    addClickableLabels();
    setupMouseControls();
    setupRaycaster();
    animate();
    window.addEventListener('resize', onWindowResize);
}

function createCubeMaterials() {
    const gradients = [
        ['#f040f0', '#fff040'],
        ['#4040f0', '#f040f0'],
        ['#40f0f0', '#4040f0'],
        ['#f04040', '#f040f0'],
        ['#f04040', '#fff040'],
        ['#4040f0', '#40f0f0']
    ];
    materials = gradients.map((colors, index) => 
        new THREE.MeshStandardMaterial({ 
            map: createGradientTexture(pageNames[index], colors),
            transparent: true
        })
    );
}

function createGradientTexture(text, gradientColors) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradientColors.forEach((color, index) => {
        gradient.addColorStop(index / (gradientColors.length - 1), color);
    });
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'bold 50px Arial';
    context.fillStyle = 'black';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    return new THREE.CanvasTexture(canvas);
}

function addClickableLabels() {
    clickableLabels.forEach(label => scene.remove(label));
    clickableLabels = [];
    
    const labelPositions = [
        { position: [1, 0, 0], rotation: [0, Math.PI/2, 0] },
        { position: [-1, 0, 0], rotation: [0, -Math.PI/2, 0] },
        { position: [0, 1, 0], rotation: [-Math.PI/2, 0, 0] },
        { position: [0, -1, 0], rotation: [Math.PI/2, 0, 0] },
        { position: [0, 0, 1], rotation: [0, 0, 0] },
        { position: [0, 0, -1], rotation: [0, Math.PI, 0] }
    ];
    
    pages.forEach((page, index) => {
        const labelGeometry = new THREE.PlaneGeometry(0.8, 0.3);
        const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.set(...labelPositions[index].position);
        label.rotation.set(...labelPositions[index].rotation);
        label.userData = { page };
        cube.add(label);
        clickableLabels.push(label);
    });
}

function onWindowResize() {
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
    if (!isDragging) {
        rotationSpeed.x *= 0.95;
        rotationSpeed.y *= 0.95;
        cube.rotation.x += rotationSpeed.x;
        cube.rotation.y += rotationSpeed.y;
    }
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

