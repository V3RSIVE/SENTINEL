// Main JavaScript for SENTINEL mockup

// Global variables
let globe;
let earthMesh;
let suppliers = [];
let activeSupplier = null;
let simulationActive = false;
let honeywell = null;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let rotation = { x: 0, y: 0 };

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Handle loading screen
    setTimeout(function() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        initializeApplication();
    }, 4000); // Show loading screen for 4 seconds
});

// Initialize the application
function initializeApplication() {
    // Initialize the globe visualization
    initGlobe();
    
    // Initialize charts
    initCharts();
    
    // Initialize the redistribution visualization
    initRedistributionVisualization();
    
    // Initialize supplier network visualization
    initSupplierNetwork();
    
    // Set up event listeners
    setupEventListeners();
    
    // Update the date and time
    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute
}

// Update the date and time display
function updateDateTime() {
    const now = new Date();
    const options = { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    };
    const formattedDate = now.toLocaleDateString('en-US', options);
    document.querySelector('.date-time').textContent = formattedDate.replace(',', '') + ' EDT';
}

// Initialize the globe visualization
function initGlobe() {
    // Create a scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Create a camera
    const camera = new THREE.PerspectiveCamera(75, document.getElementById('globe-visualization').offsetWidth / document.getElementById('globe-visualization').offsetHeight, 0.1, 1000);
    camera.position.z = 200;
    
    // Create a renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(document.getElementById('globe-visualization').offsetWidth, document.getElementById('globe-visualization').offsetHeight);
    document.getElementById('globe-visualization').appendChild(renderer.domElement);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create Earth globe with realistic texture
    const earthGeometry = new THREE.SphereGeometry(100, 64, 64);
    
    // Create a texture loader
    const textureLoader = new THREE.TextureLoader();
    
    // Load Earth texture
    const earthTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg');
    const earthBumpMap = new THREE.TextureLoader().load('https://threejs.org/examples/textures/planets/earth_normal_2048.jpg');
    const earthSpecMap = new THREE.TextureLoader().load('https://threejs.org/examples/textures/planets/earth_specular_2048.jpg');
    
    // Create Earth material with textures
    const earthMaterial = new THREE.MeshPhongMaterial({
        map: earthTexture,
        bumpMap: earthBumpMap,
        bumpScale: 0.5,
        specularMap: earthSpecMap,
        specular: new THREE.Color(0x333333),
        shininess: 25
    });
    
    earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earthMesh);
    
    // Add a subtle glow effect
    const glowGeometry = new THREE.SphereGeometry(102, 64, 64);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x0077ff,
        transparent: true,
        opacity: 0.1
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowMesh);
    
    // Add Honeywell headquarters as central node
    const honeywellGeometry = new THREE.SphereGeometry(5, 32, 32);
    const honeywellMaterial = new THREE.MeshBasicMaterial({ color: 0xE31837 });
    honeywell = new THREE.Mesh(honeywellGeometry, honeywellMaterial);
    
    // Position Honeywell HQ in Charlotte, NC
    const honeywellPosition = latLngToVector3(35.2271, -80.8431, 100);
    honeywell.position.set(honeywellPosition.x, honeywellPosition.y, honeywellPosition.z);
    scene.add(honeywell);
    
    // Add a label for Honeywell HQ
    const honeywellLabel = createTextLabel("Honeywell HQ", honeywellPosition, scene);
    
    // Create supplier nodes
    createSupplierNodes(scene);
    
    // Set up mouse/touch controls for rotating the globe
    const container = document.getElementById('globe-visualization');
    
    // Mouse events
    container.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Touch events
    container.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Apply rotation from user interaction
        if (!isDragging) {
            // Auto-rotate slightly when not being dragged
            earthMesh.rotation.y += 0.0005;
        } else {
            // Apply user rotation
            earthMesh.rotation.y = rotation.y;
            earthMesh.rotation.x = rotation.x;
        }
        
        // Update supplier positions
        updateSupplierPositions();
        
        renderer.render(scene, camera);
    }
    
    animate();
    
    // Add zoom controls
    document.getElementById('zoom-in').addEventListener('click', function() {
        camera.position.z -= 10;
    });
    
    document.getElementById('zoom-out').addEventListener('click', function() {
        camera.position.z += 10;
    });
    
    document.getElementById('reset-view').addEventListener('click', function() {
        camera.position.z = 200;
        rotation = { x: 0, y: 0 };
        earthMesh.rotation.x = 0;
        earthMesh.rotation.y = 0;
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        camera.aspect = document.getElementById('globe-visualization').offsetWidth / document.getElementById('globe-visualization').offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(document.getElementById('globe-visualization').offsetWidth, document.getElementById('globe-visualization').offsetHeight);
    });
}

// Mouse and touch event handlers
function onMouseDown(event) {
    isDragging = true;
    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseMove(event) {
    if (isDragging) {
        const deltaMove = {
            x: event.clientX - previousMousePosition.x,
            y: event.clientY - previousMousePosition.y
        };
        
        rotation.y += deltaMove.x * 0.01;
        rotation.x += deltaMove.y * 0.01;
        
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
}

function onMouseUp(event) {
    isDragging = false;
}

function onTouchStart(event) {
    if (event.touches.length === 1) {
        isDragging = true;
        previousMousePosition = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
    }
}

function onTouchMove(event) {
    if (isDragging && event.touches.length === 1) {
        const deltaMove = {
            x: event.touches[0].clientX - previousMousePosition.x,
            y: event.touches[0].clientY - previousMousePosition.y
        };
        
        rotation.y += deltaMove.x * 0.01;
        rotation.x += deltaMove.y * 0.01;
        
        previousMousePosition = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
        
        // Prevent page scrolling
        event.preventDefault();
    }
}

function onTouchEnd(event) {
    isDragging = false;
}

// Create a text label
function createTextLabel(text, position, scene) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.set(position.x * 1.1, position.y * 1.1, position.z * 1.1);
    sprite.scale.set(20, 5, 1);
    
    scene.add(sprite);
    return sprite;
}

// Create supplier nodes
function createSupplierNodes(scene) {
    // Define supplier data - expanded to include more suppliers
    const supplierData = [
        { id: 1, name: "Precision Components Ltd.", location: "Shanghai, China", status: "critical", coordinates: { lat: 31.2304, lng: 121.4737 } },
        { id: 2, name: "TechSys Inc.", location: "California, USA", status: "warning", coordinates: { lat: 37.7749, lng: -122.4194 } },
        { id: 3, name: "GlobalTech Manufacturing", location: "Mexico City, Mexico", status: "warning", coordinates: { lat: 19.4326, lng: -99.1332 } },
        { id: 4, name: "ElectroParts GmbH", location: "Munich, Germany", status: "normal", coordinates: { lat: 48.1351, lng: 11.5820 } },
        { id: 5, name: "MicroTech Industries", location: "Penang, Malaysia", status: "normal", coordinates: { lat: 5.4141, lng: 100.3288 } },
        { id: 6, name: "Advanced Components Inc.", location: "Monterrey, Mexico", status: "normal", coordinates: { lat: 25.6866, lng: -100.3161 } },
        { id: 7, name: "Quantum Electronics", location: "Tokyo, Japan", status: "normal", coordinates: { lat: 35.6762, lng: 139.6503 } },
        { id: 8, name: "Integrated Systems Ltd.", location: "Bangalore, India", status: "normal", coordinates: { lat: 12.9716, lng: 77.5946 } },
        { id: 9, name: "Nordic Precision", location: "Stockholm, Sweden", status: "normal", coordinates: { lat: 59.3293, lng: 18.0686 } },
        { id: 10, name: "Southern Manufacturing", location: "Sydney, Australia", status: "normal", coordinates: { lat: -33.8688, lng: 151.2093 } },
        { id: 11, name: "Atlantic Devices", location: "Boston, USA", status: "normal", coordinates: { lat: 42.3601, lng: -71.0589 } },
        { id: 12, name: "Pacific Instruments", location: "Singapore", status: "normal", coordinates: { lat: 1.3521, lng: 103.8198 } },
        // Additional suppliers to reach 1200+ total when combined with subsidiaries
        { id: 13, name: "European Electronics", location: "Paris, France", status: "normal", coordinates: { lat: 48.8566, lng: 2.3522 } },
        { id: 14, name: "Asian Semiconductors", location: "Seoul, South Korea", status: "normal", coordinates: { lat: 37.5665, lng: 126.9780 } },
        { id: 15, name: "Global Circuits", location: "Taipei, Taiwan", status: "normal", coordinates: { lat: 25.0330, lng: 121.5654 } },
        { id: 16, name: "Precision Metals", location: "Birmingham, UK", status: "normal", coordinates: { lat: 52.4862, lng: -1.8904 } },
        { id: 17, name: "Advanced Materials", location: "Toronto, Canada", status: "normal", coordinates: { lat: 43.6532, lng: -79.3832 } },
        { id: 18, name: "Tech Components", location: "Tel Aviv, Israel", status: "normal", coordinates: { lat: 32.0853, lng: 34.7818 } },
        { id: 19, name: "Industrial Solutions", location: "São Paulo, Brazil", status: "normal", coordinates: { lat: -23.5505, lng: -46.6333 } },
        { id: 20, name: "Precision Optics", location: "Zurich, Switzerland", status: "normal", coordinates: { lat: 47.3769, lng: 8.5417 } }
        // Note: The full 1200+ suppliers will be generated dynamically in the supplier network visualization
    ];
    
    // Create a node for each supplier
    supplierData.forEach(supplier => {
        // Convert lat/lng to 3D coordinates
        const position = latLngToVector3(supplier.coordinates.lat, supplier.coordinates.lng, 100);
        
        // Create a sphere for the supplier node
        const nodeGeometry = new THREE.SphereGeometry(2, 16, 16);
        
        // Set color based on status
        let nodeColor;
        switch(supplier.status) {
            case 'critical':
                nodeColor = 0xE31837; // Honeywell red
                break;
            case 'warning':
                nodeColor = 0xffc107; // Yellow
                break;
            case 'normal':
                nodeColor = 0x28a745; // Green
                break;
            default:
                nodeColor = 0x999999; // Gray
        }
        
        const nodeMaterial = new THREE.MeshBasicMaterial({ color: nodeColor });
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
        
        // Position the node
        node.position.set(position.x, position.y, position.z);
        
        // Add to scene
        scene.add(node);
        
        // Create connection line to Honeywell HQ
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(position.x, position.y, position.z),
            new THREE.Vector3(honeywell.position.x, honeywell.position.y, honeywell.position.z)
        ]);
        
        // Set line color based on status
        let lineColor;
        switch(supplier.status) {
            case 'critical':
                lineColor = 0xE31837; // Honeywell red
                break;
            case 'warning':
                lineColor = 0xffc107; // Yellow
                break;
            case 'normal':
                lineColor = 0xFFFFFF; // White
                break;
            default:
                lineColor = 0x999999; // Gray
        }
        
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: lineColor,
            transparent: true,
            opacity: 0.6
        });
        
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
        
        // Add a small label for the supplier
        const label = createTextLabel(supplier.name, position, scene);
        
        // Store supplier data with node reference
        suppliers.push({
            ...supplier,
            node: node,
            line: line,
            label: label,
            originalPosition: { ...position },
            originalStatus: supplier.status
        });
    });
}

// Convert latitude and longitude to 3D vector
function latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    
    const x = -radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return { x, y, z };
}

// Update supplier positions based on globe rotation
function updateSupplierPositions() {
    // Create rotation matrix based on Earth's rotation
    const rotationMatrix = new THREE.Matrix4().makeRotationY(earthMesh.rotation.y);
    rotationMatrix.multiply(new THREE.Matrix4().makeRotationX(earthMesh.rotation.x));
    
    // Apply rotation to Honeywell HQ
    const honeywellOriginalPosition = latLngToVector3(35.2271, -80.8431, 100);
    const honeywellVector = new THREE.Vector3(honeywellOriginalPosition.x, honeywellOriginalPosition.y, honeywellOriginalPosition.z);
    honeywellVector.applyMatrix4(rotationMatrix);
    honeywell.position.set(honeywellVector.x, honeywellVector.y, honeywellVector.z);
    
    // Update Honeywell label position
    if (honeywell.label) {
        honeywell.label.position.set(honeywellVector.x * 1.1, honeywellVector.y * 1.1, honeywellVector.z * 1.1);
    }
    
    suppliers.forEach(supplier => {
        // Create a vector from the original position
        const vector = new THREE.Vector3(supplier.originalPosition.x, supplier.originalPosition.y, supplier.originalPosition.z);
        
        // Apply the same rotation as the Earth
        vector.applyMatrix4(rotationMatrix);
        
        // Update node position
        supplier.node.position.set(vector.x, vector.y, vector.z);
        
        // Update label position
        if (supplier.label) {
            supplier.label.position.set(vector.x * 1.1, vector.y * 1.1, vector.z * 1.1);
        }
        
        // Update connection line
        if (supplier.line) {
            supplier.line.geometry.dispose();
            supplier.line.geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(vector.x, vector.y, vector.z),
                new THREE.Vector3(honeywell.position.x, honeywell.position.y, honeywell.position.z)
            ]);
        }
    });
}

// Initialize supplier network visualization
function initSupplierNetwork() {
    // Only initialize if the suppliers tab exists
    const suppliersTab = document.getElementById('suppliers');
    if (!suppliersTab) return;
    
    // Create container for network visualization if it doesn't exist
    if (!document.getElementById('supplier-network')) {
        const networkContainer = document.createElement('div');
        networkContainer.id = 'supplier-network';
        networkContainer.style.width = '100%';
        networkContainer.style.height = '600px';
        networkContainer.style.backgroundColor = '#000';
        networkContainer.style.borderRadius = '8px';
        networkContainer.style.marginTop = '20px';
        
        // Add a header
        const header = document.createElement('h3');
        header.textContent = 'Supplier Relationship Network';
        header.style.color = '#E31837';
        header.style.padding = '20px';
        header.style.margin = '0';
        
        suppliersTab.appendChild(header);
        suppliersTab.appendChild(networkContainer);
    }
    
    // Define Honeywell subsidiaries based on the Honeywell affiliates page
    const honeywellSubsidiaries = [
        { id: 101, name: "Honeywell Automation Controls System", location: "Global", type: "Subsidiary" },
        { id: 102, name: "Elster Group", location: "Global", type: "Subsidiary" },
        { id: 103, name: "Ademco", location: "Asia Pacific", type: "Subsidiary" },
        { id: 104, name: "AlliedSignal Aerospace", location: "Global", type: "Subsidiary" },
        { id: 105, name: "Cambridge Quantum Computing", location: "Global", type: "Subsidiary" },
        { id: 106, name: "Eclipse Combustion", location: "Global", type: "Subsidiary" },
        { id: 107, name: "Honeywell UOP", location: "Global", type: "Subsidiary" },
        { id: 108, name: "Intelligrated", location: "North America", type: "Subsidiary" },
        { id: 109, name: "Intermec", location: "Global", type: "Subsidiary" },
        { id: 110, name: "Life Safety Distribution", location: "Global", type: "Subsidiary" },
        { id: 111, name: "Measurex", location: "Global", type: "Subsidiary" },
        { id: 112, name: "Novar", location: "Europe", type: "Subsidiary" },
        { id: 113, name: "Pittway Corporation", location: "Global", type: "Subsidiary" },
        { id: 114, name: "Sperian Protection", location: "Global", type: "Subsidiary" },
        { id: 115, name: "Maxon Corporation", location: "Global", type: "Subsidiary" },
        { id: 116, name: "Honeywell Analytics", location: "Global", type: "Subsidiary" },
        { id: 117, name: "Honeywell Building Solutions", location: "Global", type: "Subsidiary" },
        { id: 118, name: "Honeywell Process Solutions", location: "Global", type: "Subsidiary" },
        { id: 119, name: "Honeywell Safety Products", location: "Global", type: "Subsidiary" },
        { id: 120, name: "Honeywell Scanning & Mobility", location: "Global", type: "Subsidiary" }
        // Note: This is a subset of the full list of 75+ subsidiaries
    ];
    
    // Generate additional supplier data to reach 1200+ total
    const supplierTypes = ["Electronics", "Hardware", "Software", "Raw Materials", "Chemicals", "Logistics", "Components", "Services"];
    const regions = ["North America", "South America", "Europe", "Asia", "Africa", "Australia"];
    const statuses = ["normal", "warning", "critical"];
    const statusWeights = [0.85, 0.12, 0.03]; // 85% normal, 12% warning, 3% critical
    
    // Generate additional suppliers to reach 1200+ total
    const additionalSuppliers = [];
    for (let i = 0; i < 1160; i++) {
        const randomType = supplierTypes[Math.floor(Math.random() * supplierTypes.length)];
        const randomRegion = regions[Math.floor(Math.random() * regions.length)];
        
        // Determine status based on weights
        const randomValue = Math.random();
        let status;
        if (randomValue < statusWeights[0]) {
            status = statuses[0]; // normal
        } else if (randomValue < statusWeights[0] + statusWeights[1]) {
            status = statuses[1]; // warning
        } else {
            status = statuses[2]; // critical
        }
        
        additionalSuppliers.push({
            id: 200 + i,
            name: `Supplier ${i + 1}`,
            location: randomRegion,
            status: status,
            type: randomType
        });
    }
    
    // Combine all supplier data
    const supplierData = [
        { id: 13, name: "Honeywell", location: "Charlotte, NC", status: "central", type: "Headquarters" },
        ...honeywellSubsidiaries,
        { id: 1, name: "Precision Components Ltd.", location: "Shanghai, China", status: "critical", type: "Electronics" },
        { id: 2, name: "TechSys Inc.", location: "California, USA", status: "warning", type: "Software" },
        { id: 3, name: "GlobalTech Manufacturing", location: "Mexico City, Mexico", status: "warning", type: "Hardware" },
        { id: 4, name: "ElectroParts GmbH", location: "Munich, Germany", status: "normal", type: "Electronics" },
        { id: 5, name: "MicroTech Industries", location: "Penang, Malaysia", status: "normal", type: "Electronics" },
        { id: 6, name: "Advanced Components Inc.", location: "Monterrey, Mexico", status: "normal", type: "Hardware" },
        { id: 7, name: "Quantum Electronics", location: "Tokyo, Japan", status: "normal", type: "Electronics" },
        { id: 8, name: "Integrated Systems Ltd.", location: "Bangalore, India", status: "normal", type: "Software" },
        { id: 9, name: "Nordic Precision", location: "Stockholm, Sweden", status: "normal", type: "Hardware" },
        { id: 10, name: "Southern Manufacturing", location: "Sydney, Australia", status: "normal", type: "Hardware" },
        { id: 11, name: "Atlantic Devices", location: "Boston, USA", status: "normal", type: "Electronics" },
        { id: 12, name: "Pacific Instruments", location: "Singapore", status: "normal", type: "Electronics" },
        { id: 13, name: "European Electronics", location: "Paris, France", status: "normal", type: "Electronics" },
        { id: 14, name: "Asian Semiconductors", location: "Seoul, South Korea", status: "normal", type: "Electronics" },
        { id: 15, name: "Global Circuits", location: "Taipei, Taiwan", status: "normal", type: "Electronics" },
        { id: 16, name: "Precision Metals", location: "Birmingham, UK", status: "normal", type: "Raw Materials" },
        { id: 17, name: "Advanced Materials", location: "Toronto, Canada", status: "normal", type: "Raw Materials" },
        { id: 18, name: "Tech Components", location: "Tel Aviv, Israel", status: "normal", type: "Components" },
        { id: 19, name: "Industrial Solutions", location: "São Paulo, Brazil", status: "normal", type: "Services" },
        { id: 20, name: "Precision Optics", location: "Zurich, Switzerland", status: "normal", type: "Components" },
        ...additionalSuppliers
    ];
    
    // Define relationships between suppliers and subsidiaries
    // First, create relationships between Honeywell and all subsidiaries
    const relationships = honeywellSubsidiaries.map(subsidiary => ({
        source: 13, // Honeywell HQ
        target: subsidiary.id,
        strength: 0.9,
        type: "subsidiary"
    }));
    
    // Add relationships between Honeywell and direct suppliers
    for (let i = 1; i <= 20; i++) {
        relationships.push({
            source: 13, // Honeywell HQ
            target: i,
            strength: 0.8,
            type: "direct"
        });
    }
    
    // Add relationships between subsidiaries and some suppliers
    honeywellSubsidiaries.forEach(subsidiary => {
        // Each subsidiary connects to 5-10 random suppliers
        const numConnections = 5 + Math.floor(Math.random() * 6);
        for (let i = 0; i < numConnections; i++) {
            const randomSupplierIndex = 1 + Math.floor(Math.random() * 20);
            relationships.push({
                source: subsidiary.id,
                target: randomSupplierIndex,
                strength: 0.6 + Math.random() * 0.3,
                type: "collaboration"
            });
        }
    });
    
    // Add some relationships between suppliers
    for (let i = 1; i <= 20; i++) {
        // Each supplier connects to 1-3 other suppliers
        const numConnections = 1 + Math.floor(Math.random() * 3);
        for (let j = 0; j < numConnections; j++) {
            let randomSupplierIndex;
            do {
                randomSupplierIndex = 1 + Math.floor(Math.random() * 20);
            } while (randomSupplierIndex === i);
            
            relationships.push({
                source: i,
                target: randomSupplierIndex,
                strength: 0.3 + Math.random() * 0.3,
                type: "collaboration"
            });
        }
    }
    
    // Create the network visualization using D3.js
    const width = document.getElementById('supplier-network').offsetWidth;
    const height = document.getElementById('supplier-network').offsetHeight;
    
    // Clear any existing SVG
    d3.select('#supplier-network svg').remove();
    
    const svg = d3.select('#supplier-network')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Add a background
    svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', '#000');
    
    // Add a title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('fill', '#E31837')
        .attr('font-size', '20px')
        .attr('font-weight', 'bold')
        .text('Honeywell Supply Chain Network - 1,200+ Suppliers');
    
    // Add a subtitle
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', 55)
        .attr('text-anchor', 'middle')
        .attr('fill', '#FFFFFF')
        .attr('font-size', '14px')
        .text('Showing key relationships between Honeywell, subsidiaries, and major suppliers');
    
    // Create a force simulation
    const simulation = d3.forceSimulation(supplierData.slice(0, 100)) // Only show first 100 for performance
        .force('link', d3.forceLink(relationships).id(d => d.id).distance(d => 200 - d.strength * 100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30));
    
    // Create links
    const link = svg.append('g')
        .selectAll('line')
        .data(relationships)
        .enter()
        .append('line')
        .attr('stroke-width', d => d.strength * 3)
        .attr('stroke', d => {
            if (d.type === 'subsidiary') return '#E31837';
            if (d.type === 'direct') return '#FFFFFF';
            return '#AAAAAA';
        })
        .attr('stroke-opacity', 0.6);
    
    // Create nodes
    const node = svg.append('g')
        .selectAll('g')
        .data(supplierData.slice(0, 100)) // Only show first 100 for performance
        .enter()
        .append('g')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    // Add circles to nodes
    node.append('circle')
        .attr('r', d => {
            if (d.id === 13) return 25; // Honeywell HQ
            if (d.id >= 101 && d.id <= 120) return 15; // Subsidiaries
            return 10; // Regular suppliers
        })
        .attr('fill', d => {
            if (d.id === 13) return '#E31837'; // Honeywell HQ
            if (d.id >= 101 && d.id <= 120) return '#FF7900'; // Subsidiaries in orange
            
            switch(d.status) {
                case 'critical': return '#E31837';
                case 'warning': return '#ffc107';
                case 'normal': return '#28a745';
                default: return '#999';
            }
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5);
    
    // Add text labels
    node.append('text')
        .attr('dx', d => {
            if (d.id === 13) return 30; // Honeywell HQ
            if (d.id >= 101 && d.id <= 120) return 20; // Subsidiaries
            return 15; // Regular suppliers
        })
        .attr('dy', 4)
        .text(d => d.name)
        .attr('fill', '#fff')
        .attr('font-size', d => {
            if (d.id === 13) return '14px'; // Honeywell HQ
            if (d.id >= 101 && d.id <= 120) return '12px'; // Subsidiaries
            return '10px'; // Regular suppliers
        })
        .attr('font-weight', d => d.id === 13 ? 'bold' : 'normal');
    
    // Add type labels
    node.append('text')
        .attr('dx', d => {
            if (d.id === 13) return 30; // Honeywell HQ
            if (d.id >= 101 && d.id <= 120) return 20; // Subsidiaries
            return 15; // Regular suppliers
        })
        .attr('dy', 20)
        .text(d => d.type)
        .attr('fill', '#aaa')
        .attr('font-size', '10px');
    
    // Update positions on each tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('transform', d => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }
    
    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }
    
    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
    
    // Add legend
    const legend = svg.append('g')
        .attr('transform', 'translate(20, 100)');
    
    // Legend title
    legend.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .text('Network Legend')
        .attr('fill', '#fff')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold');
    
    // Node types
    const nodeTypes = [
        { label: 'Honeywell HQ', color: '#E31837' },
        { label: 'Honeywell Subsidiary', color: '#FF7900' },
        { label: 'Critical Supplier', color: '#E31837' },
        { label: 'Warning Status', color: '#ffc107' },
        { label: 'Normal Status', color: '#28a745' }
    ];
    
    nodeTypes.forEach((type, i) => {
        const yPos = 30 + i * 25;
        
        legend.append('circle')
            .attr('cx', 10)
            .attr('cy', yPos)
            .attr('r', 8)
            .attr('fill', type.color);
        
        legend.append('text')
            .attr('x', 25)
            .attr('y', yPos + 4)
            .text(type.label)
            .attr('fill', '#fff')
            .attr('font-size', '12px');
    });
    
    // Link types
    const linkTypes = [
        { label: 'Subsidiary Relationship', color: '#E31837' },
        { label: 'Direct Relationship', color: '#FFFFFF' },
        { label: 'Collaboration', color: '#AAAAAA' }
    ];
    
    linkTypes.forEach((type, i) => {
        const yPos = 170 + i * 25;
        
        legend.append('line')
            .attr('x1', 0)
            .attr('y1', yPos)
            .attr('x2', 20)
            .attr('y2', yPos)
            .attr('stroke', type.color)
            .attr('stroke-width', 3);
        
        legend.append('text')
            .attr('x', 25)
            .attr('y', yPos + 4)
            .text(type.label)
            .attr('fill', '#fff')
            .attr('font-size', '12px');
    });
    
    // Add stats
    const stats = svg.append('g')
        .attr('transform', `translate(${width - 250}, 100)`);
    
    stats.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .text('Supply Chain Statistics')
        .attr('fill', '#fff')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold');
    
    const statItems = [
        { label: 'Total Suppliers', value: '1,200+' },
        { label: 'Honeywell Subsidiaries', value: '75+' },
        { label: 'Critical Suppliers', value: '36' },
        { label: 'Warning Status', value: '144' },
        { label: 'Countries', value: '45+' }
    ];
    
    statItems.forEach((item, i) => {
        const yPos = 30 + i * 25;
        
        stats.append('text')
            .attr('x', 0)
            .attr('y', yPos)
            .text(item.label + ':')
            .attr('fill', '#fff')
            .attr('font-size', '12px');
        
        stats.append('text')
            .attr('x', 150)
            .attr('y', yPos)
            .text(item.value)
            .attr('fill', '#E31837')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold');
    });
    
    // Add controls
    const controls = svg.append('g')
        .attr('transform', `translate(${width/2 - 150}, ${height - 50})`);
    
    // Filter button
    const filterButton = controls.append('g')
        .attr('cursor', 'pointer')
        .on('click', function() {
            alert('Filter functionality would be implemented here');
        });
    
    filterButton.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 100)
        .attr('height', 30)
        .attr('rx', 5)
        .attr('fill', '#333');
    
    filterButton.append('text')
        .attr('x', 50)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .text('Filter View');
    
    // Expand button
    const expandButton = controls.append('g')
        .attr('cursor', 'pointer')
        .attr('transform', 'translate(120, 0)')
        .on('click', function() {
            alert('Expand functionality would be implemented here');
        });
    
    expandButton.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 100)
        .attr('height', 30)
        .attr('rx', 5)
        .attr('fill', '#E31837');
    
    expandButton.append('text')
        .attr('x', 50)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .text('Expand All');
    
    // Reset button
    const resetButton = controls.append('g')
        .attr('cursor', 'pointer')
        .attr('transform', 'translate(240, 0)')
        .on('click', function() {
            simulation.alpha(1).restart();
        });
    
    resetButton.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 100)
        .attr('height', 30)
        .attr('rx', 5)
        .attr('fill', '#333');
    
    resetButton.append('text')
        .attr('x', 50)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .text('Reset Layout');
}

// Initialize charts
function initCharts() {
    // Risk forecast chart
    const ctx = document.getElementById('risk-forecast-chart');
    if (!ctx) return;
    
    const ctxContext = ctx.getContext('2d');
    const riskForecastChart = new Chart(ctxContext, {
        type: 'line',
        data: {
            labels: ['Today', 'Apr 19', 'Apr 20', 'Apr 21', 'Apr 22', 'Apr 23', 'Apr 24'],
            datasets: [
                {
                    label: 'Supply Risk Index',
                    data: [42, 38, 35, 30, 28, 25, 22],
                    borderColor: '#E31837',
                    backgroundColor: 'rgba(227, 24, 55, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Logistics Risk Index',
                    data: [28, 30, 32, 35, 33, 30, 28],
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Overall Risk Index',
                    data: [35, 34, 33, 32, 30, 27, 25],
                    borderColor: '#000000',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Risk Index (0-100)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Initialize the redistribution visualization
function initRedistributionVisualization() {
    // Check if the element exists
    const redistributionViz = document.getElementById('redistribution-visualization');
    if (!redistributionViz) return;
    
    // Create a simple force-directed graph using D3.js
    const width = redistributionViz.offsetWidth;
    const height = redistributionViz.offsetHeight;
    
    const svg = d3.select('#redistribution-visualization')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Define nodes
    const nodes = [
        { id: 'source', name: 'Precision Components Ltd.', type: 'source', x: width / 2, y: height / 2 },
        { id: 'target1', name: 'ElectroParts GmbH', type: 'target', x: width / 4, y: height / 4 },
        { id: 'target2', name: 'MicroTech Industries', type: 'target', x: width * 3/4, y: height / 4 },
        { id: 'target3', name: 'Advanced Components Inc.', type: 'target', x: width / 2, y: height * 3/4 }
    ];
    
    // Define links
    const links = [
        { source: 'source', target: 'target1', value: 35 },
        { source: 'source', target: 'target2', value: 25 },
        { source: 'source', target: 'target3', value: 25 }
    ];
    
    // Create a force simulation
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .on('tick', ticked);
    
    // Create links
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke-width', d => Math.sqrt(d.value))
        .attr('stroke', '#E31837')
        .attr('stroke-opacity', 0.6);
    
    // Create nodes
    const node = svg.append('g')
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g');
    
    // Add circles to nodes
    node.append('circle')
        .attr('r', d => d.type === 'source' ? 20 : 15)
        .attr('fill', d => d.type === 'source' ? '#E31837' : '#28a745');
    
    // Add text labels
    node.append('text')
        .attr('dx', 20)
        .attr('dy', 4)
        .text(d => d.name)
        .attr('font-size', '10px')
        .attr('fill', '#fff');
    
    // Add value labels to links
    svg.append('g')
        .selectAll('text')
        .data(links)
        .enter()
        .append('text')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', '#fff')
        .text(d => `${d.value}%`);
    
    // Update positions on each tick
    function ticked() {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node
            .attr('transform', d => `translate(${d.x},${d.y})`);
        
        // Update link label positions
        svg.selectAll('text')
            .filter(function() { return this.parentNode.tagName === 'g' ? false : true; })
            .attr('x', function(d, i) {
                return (d.source.x + d.target.x) / 2;
            })
            .attr('y', function(d, i) {
                return (d.source.y + d.target.y) / 2;
            });
    }
}

// Set up event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.sidebar li').forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.sidebar li').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show selected tab content
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Disruption management modal
    const manageDisruptionBtn = document.getElementById('manage-disruption');
    if (manageDisruptionBtn) {
        manageDisruptionBtn.addEventListener('click', function() {
            document.getElementById('disruption-modal').style.display = 'flex';
        });
    }
    
    const simulateResponseBtn = document.querySelector('.simulate-response');
    if (simulateResponseBtn) {
        simulateResponseBtn.addEventListener('click', function() {
            document.getElementById('disruption-modal').style.display = 'flex';
        });
    }
    
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            document.getElementById('disruption-modal').style.display = 'none';
        });
    }
    
    // Implement redistribution plan
    const implementRedistributionBtn = document.getElementById('implement-redistribution');
    if (implementRedistributionBtn) {
        implementRedistributionBtn.addEventListener('click', function() {
            this.textContent = 'Implementing...';
            this.disabled = true;
            
            setTimeout(() => {
                this.textContent = 'Implementation Complete';
                document.getElementById('confirm-plan').textContent = 'Close';
                
                // Update the globe visualization to show redistribution
                simulateRedistribution();
            }, 2000);
        });
    }
    
    // Confirm plan button
    const confirmPlanBtn = document.getElementById('confirm-plan');
    if (confirmPlanBtn) {
        confirmPlanBtn.addEventListener('click', function() {
            if (this.textContent === 'Close') {
                document.getElementById('disruption-modal').style.display = 'none';
                
                // Update the alert to show it's being handled
                const criticalAlert = document.querySelector('.alert.critical');
                if (criticalAlert) {
                    criticalAlert.querySelector('h4').textContent = 'Critical: Supplier Shutdown (Being Handled)';
                    const responseBtn = criticalAlert.querySelector('.simulate-response');
                    if (responseBtn) {
                        responseBtn.textContent = 'View Plan';
                    }
                }
                
                // Update the emergency event
                const criticalEvent = document.querySelector('.event.critical');
                if (criticalEvent) {
                    const statusEl = criticalEvent.querySelector('.event-status');
                    if (statusEl) {
                        statusEl.textContent = 'Mitigating';
                    }
                }
                
                // Show a notification
                showNotification('Load redistribution plan implemented successfully. Monitoring alternative suppliers for capacity.');
            } else {
                // Implement the plan
                const implementBtn = document.getElementById('implement-redistribution');
                if (implementBtn) {
                    implementBtn.click();
                }
            }
        });
    }
}

// Simulate redistribution of supplier load
function simulateRedistribution() {
    // Find the critical supplier
    const criticalSupplier = suppliers.find(s => s.status === 'critical');
    if (!criticalSupplier) return;
    
    // Find the alternative suppliers
    const alternativeSuppliers = suppliers.filter(s => 
        s.name === "ElectroParts GmbH" || 
        s.name === "MicroTech Industries" || 
        s.name === "Advanced Components Inc."
    );
    
    // Update the visualization
    alternativeSuppliers.forEach(supplier => {
        // Make the node pulse to indicate increased load
        const originalScale = supplier.node.scale.x || 1;
        
        // Animation to show load transfer
        const animate = () => {
            const scale = 1 + 0.2 * Math.sin(Date.now() * 0.005);
            supplier.node.scale.set(scale, scale, scale);
            
            if (simulationActive) {
                requestAnimationFrame(animate);
            } else {
                supplier.node.scale.set(1.2, 1.2, 1.2);
            }
        };
        
        simulationActive = true;
        animate();
        
        // Change color to indicate higher load
        supplier.node.material.color.set(0xE31837); // Honeywell red
        
        // Update connection line color and thickness
        if (supplier.line) {
            supplier.line.material.color.set(0xE31837);
            supplier.line.material.opacity = 0.8;
        }
    });
    
    // Make the critical supplier node blink
    const blinkCriticalNode = () => {
        if (!simulationActive) return;
        
        criticalSupplier.node.visible = !criticalSupplier.node.visible;
        setTimeout(blinkCriticalNode, 500);
    };
    
    blinkCriticalNode();
}

// Show a notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        </div>
        <button class="close-notification">&times;</button>
    `;
    
    // Style the notification
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = 'white';
    notification.style.padding = '15px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    notification.style.zIndex = '1000';
    notification.style.display = 'flex';
    notification.style.alignItems = 'center';
    notification.style.justifyContent = 'space-between';
    notification.style.maxWidth = '400px';
    
    // Add to the document
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 5000);
    
    // Close button
    notification.querySelector('.close-notification').addEventListener('click', function() {
        document.body.removeChild(notification);
    });
}
