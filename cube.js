// 3D Cube with Three.js
let scene, camera, renderer, cube;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotationSpeed = { x: 0, y: 0 };
const pages = ['about', 'projects', 'blog', 'contact', 'resources', 'downloads'];
const pageNames = ['About', 'Projects', 'Blog', 'Contact', 'Resources', 'Downloads'];

// DOM pill buttons that will be positioned over the cube faces for clicking
const pillButtons = [];

function init3DCube() {
    scene = new THREE.Scene();
    
    // Camera setup with adjusted position for better perspective
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 4.5; // Made cube smaller by moving camera back
    camera.position.y = -0.5;
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    document.getElementById('cube-container').appendChild(renderer.domElement);
    
    // Create cube
    const geometry = new THREE.BoxGeometry(2.5, 2.5, 2.5); // Make cube smaller
    
    // Use shader materials for smooth gradients across edges
    const materials = [];
    
    // Define gradient colors for each face
    const gradients = [
        ['#ff00ff', '#ffff00'], // Right: Magenta to Yellow
        ['#0000ff', '#ff00ff'], // Left: Blue to Magenta
        ['#00ffff', '#0000ff'], // Top: Cyan to Blue
        ['#ff0000', '#ff00ff'], // Bottom: Red to Magenta
        ['#ff0000', '#ffff00'], // Front: Red to Yellow
        ['#0000ff', '#00ffff']  // Back: Blue to Cyan
    ];
    
    // Create shader material for smooth gradients
    for (let i = 0; i < 6; i++) {
        const vertexShader = `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        
        const fragmentShader = `
            uniform vec3 color1;
            uniform vec3 color2;
            varying vec2 vUv;
            
            void main() {
                gl_FragColor = vec4(mix(color1, color2, vUv.x + vUv.y), 0.9);
            }
        `;
        
        const uniforms = {
            color1: { value: new THREE.Color(gradients[i][0]) },
            color2: { value: new THREE.Color(gradients[i][1]) }
        };
        
        materials.push(new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true
        }));
    }
    
    cube = new THREE.Mesh(geometry, materials);
    scene.add(cube);
    
    // Create HTML pill buttons for better interactivity
    createPillButtons();
    
    // Add mouse controls for rotation
    setupMouseControls();
    
    // Animation loop
    animate();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function createPillButtons() {
    // Remove any existing buttons
    pillButtons.forEach(button => {
        if (button.parentNode) {
            button.parentNode.removeChild(button);
        }
    });
    pillButtons.length = 0;
    
    // Create new buttons
    for (let i = 0; i < pageNames.length; i++) {
        const button = document.createElement('div');
        button.className = 'pill-button';
        button.textContent = pageNames[i];
        button.dataset.page = pages[i];
        button.style.display = 'none'; // Hidden by default
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            showPage(e.currentTarget.dataset.page);
        });
        
        document.body.appendChild(button);
        pillButtons.push(button);
    }
}

function updatePillButtonPositions() {
    // Get the cube's world position
    cube.updateMatrixWorld();
    
    // Define positions for each face (centers of each face)
    const facePositions = [
        new THREE.Vector3(1.25, 0, 0),  // Right
        new THREE.Vector3(-1.25, 0, 0), // Left
        new THREE.Vector3(0, 1.25, 0),  // Top
        new THREE.Vector3(0, -1.25, 0), // Bottom
        new THREE.Vector3(0, 0, 1.25),  // Front
        new THREE.Vector3(0, 0, -1.25)  // Back
    ];
    
    // Calculate normal vectors for each face to check visibility
    const normals = [
        new THREE.Vector3(1, 0, 0),   // Right
        new THREE.Vector3(-1, 0, 0),  // Left
        new THREE.Vector3(0, 1, 0),   // Top
        new THREE.Vector3(0, -1, 0),  // Bottom
        new THREE.Vector3(0, 0, 1),   // Front
        new THREE.Vector3(0, 0, -1)   // Back
    ];
    
    // For each face, project its position to screen coordinates
    facePositions.forEach((pos, index) => {
        // Apply cube's transformation to the face position
        const worldPos = pos.clone().applyMatrix4(cube.matrixWorld);
        
        // Calculate if this face is visible (facing the camera)
        const normal = normals[index].clone().applyQuaternion(cube.quaternion);
        const cameraDirection = new THREE.Vector3().subVectors(camera.position, worldPos).normalize();
        const dotProduct = normal.dot(cameraDirection);
        
        // Project the world position to screen coordinates
        const screenPos = worldPos.project(camera);
        
        // Convert to actual screen coordinates
        const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
        
        // Update button position
        if (dotProduct > 0.2) { // Face is somewhat visible
            pillButtons[index].style.display = 'block';
            pillButtons[index].style.left = `${x - 50}px`; // Adjust for button width
            pillButtons[index].style.top = `${y - 20}px`;  // Adjust for button height
            
            // Make buttons facing more toward camera more opaque
            const opacity = Math.min(1, dotProduct * 2);
            pillButtons[index].style.opacity = opacity;
            
            // Calculate the rotation of the button to match face orientation
            const rotationX = Math.atan2(normal.y, normal.z);
            const rotationY = Math.atan2(normal.x, normal.z);
            pillButtons[index].style.transform = `perspective(500px) rotateX(${rotationX}rad) rotateY(${rotationY}rad)`;
            
            // Adjust z-index so buttons on faces closer to camera appear on top
            const distance = camera.position.distanceTo(worldPos);
            const zIndex = Math.round(1000 - distance * 100);
            pillButtons[index].style.zIndex = zIndex;
        } else {
            // Hide buttons on back faces
            pillButtons[index].style.display = 'none';
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    // Apply damping to the rotation when not dragging
    if (!isDragging) {
        rotationSpeed.x *= 0.95;
        rotationSpeed.y *= 0.95;
        
        cube.rotation.x += rotationSpeed.x;
        cube.rotation.y += rotationSpeed.y;
    }
    
    // Update pill button positions
    updatePillButtonPositions();
    
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupMouseControls() {
    const container = renderer.domElement;
    
    container.addEventListener('mousedown', (event) => {
        // Only start dragging if we click on the cube, not on a button
        if (event.target === container) {
            isDragging = true;
            previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
            event.preventDefault();
        }
    });
    
    window.addEventListener('mousemove', (event) => {
        if (isDragging) {
            const deltaMove = {
                x: event.clientX - previousMousePosition.x,
                y: event.clientY - previousMousePosition.y
            };
            
            // Fixed rotation direction to be more intuitive
            rotationSpeed.y = deltaMove.x * 0.003;
            rotationSpeed.x = deltaMove.y * 0.003;
            
            cube.rotation.y += rotationSpeed.y;
            cube.rotation.x += rotationSpeed.x;
            
            previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    // For touch devices
    container.addEventListener('touchstart', (event) => {
        if (event.touches.length === 1) {
            isDragging = true;
            previousMousePosition = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        }
    });
    
    window.addEventListener('touchmove', (event) => {
        if (isDragging && event.touches.length === 1) {
            const deltaMove = {
                x: event.touches[0].clientX - previousMousePosition.x,
                y: event.touches[0].clientY - previousMousePosition.y
            };
            
            rotationSpeed.y = deltaMove.x * 0.003;
            rotationSpeed.x = deltaMove.y * 0.003;
            
            cube.rotation.y += rotationSpeed.y;
            cube.rotation.x += rotationSpeed.x;
            
            previousMousePosition = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        }
    });
    
    window.addEventListener('touchend', () => {
        isDragging = false;
    });
}

function showPage(pageId) {
    const contentContainer = document.getElementById('content-container');
    contentContainer.style.display = 'block';
    
    // Hide all sections first
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(pageId).style.display = 'block';
    
    // Hide cube container
    document.getElementById('cube-container').style.display = 'none';
    
    // Hide pill buttons
    pillButtons.forEach(button => {
        button.style.display = 'none';
    });
}

// Setup back button
document.getElementById('back-button').addEventListener('click', () => {
    document.getElementById('content-container').style.display = 'none';
    document.getElementById('cube-container').style.display = 'block';
});

// Initialize 3D cube
window.addEventListener('DOMContentLoaded', init3DCube);
