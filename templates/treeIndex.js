import * as THREE from 'three';
import WinBox from "https://unpkg.com/winbox@0.2.82/src/js/winbox.js";
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { TAARenderPass } from 'three/addons/postprocessing/TAARenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function makeLinks(links, leaves, scene, tree) {
    const linesGeometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    // Define the material for the links
    const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.5
    });

    links.forEach(link => {
        positions.push(
            link.source.x, link.source.y, link.source.depth * 20,
            link.target.x, link.target.y, link.target.depth * 20,
        );

        // Define a color for each link, this could be based on some property of the link
        const color = new THREE.Color(0xffffff);
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
    });

    leaves.forEach(leaf => {
        positions.push(
            leaf.x, leaf.y, leaf.depth * 20,
            Math.cos(leaf.angle) * tree.maxRadius, Math.sin(leaf.angle) * tree.maxRadius, (leaf.depth) * 20,
        );

        // Define a color for each link connected to a leaf
        const color = new THREE.Color(0xffffff);
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
    });

    linesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    linesGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const lines = new THREE.LineSegments(linesGeometry, material);
    scene.add(lines);
}

export function makeBezierLinks(links, leaves, scene, tree) {
    const curveMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5
    });

    links.forEach(link => {
        const startPoint = new THREE.Vector3(link.source.x, link.source.y, link.source.depth * 20);
        const endPoint = new THREE.Vector3(link.target.x, link.target.y, link.target.depth * 20);

        const controlPoint1 = new THREE.Vector3((startPoint.x + endPoint.x) / 2, startPoint.y, (startPoint.z + endPoint.z) / 2);
        const controlPoint2 = new THREE.Vector3((startPoint.x + endPoint.x) / 2, endPoint.y, (startPoint.z + endPoint.z) / 2);

        const curve = new THREE.CubicBezierCurve3(startPoint, controlPoint1, controlPoint2, endPoint);
        const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.5, 8, false);
        const curveObject = new THREE.Mesh(tubeGeometry, curveMaterial);

        scene.add(curveObject);
    });

    leaves.forEach(leaf => {
        const startPoint = new THREE.Vector3(leaf.x, leaf.y, leaf.depth * 20);
        const endPoint = new THREE.Vector3(Math.cos(leaf.angle) * tree.maxRadius, Math.sin(leaf.angle) * tree.maxRadius, (leaf.depth + 1) * 20);

        const controlPoint1 = new THREE.Vector3((startPoint.x + endPoint.x) / 2, startPoint.y, (startPoint.z + endPoint.z) / 2);
        const controlPoint2 = new THREE.Vector3((startPoint.x + endPoint.x) / 2, endPoint.y, (startPoint.z + endPoint.z) / 2);

        const curve = new THREE.CubicBezierCurve3(startPoint, controlPoint1, controlPoint2, endPoint);
        const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.4, 8, false);
        const curveObject = new THREE.Mesh(tubeGeometry, curveMaterial);

        scene.add(curveObject);
    });
}

export function makeNodes(geometry, nodes, scene, tree, nodeMeshedArray, colorScale) {
    // Initialize a 4x4 transformation matrix

    // Iterate over each node in the nodes array
    for (let i = 0; i < nodes.length; i++) {
        // Create a unique material for each node, with its own color

        let hexColor = "#e5d0ff";
        if (colorScale && !nodes[i].children) {
            hexColor = colorScale(nodes[i].data.values.group);
            console.log(hexColor);
        }
        
        let material = new THREE.MeshStandardMaterial({
            color: nodes[i].children ? 0xffffff : hexColor, // White for internal nodes, random for leaves
            alphaHash: true,
            opacity: 0.90
        });

        // Create an individual mesh for each node
        let mesh = new THREE.Mesh(geometry, material);

        // Check if the current node has children (is an internal node)
        if (nodes[i].children) {
            // Set the position of the internal node in 3D space
            mesh.position.set(nodes[i].x, nodes[i].y, nodes[i].depth * 20);
        } else {
            // Calculate and set the position based on the angle and the tree's maximum radius
            mesh.position.set(
                (tree.maxRadius) * Math.cos(nodes[i].angle),
                (tree.maxRadius) * Math.sin(nodes[i].angle),
                (nodes[i].depth + 1) * 20
            );
        }

        // Assign a name (index) and the node data to the mesh for later reference
        nodes[i].meshId = mesh.id;
        mesh.name = i;
        mesh.node = nodes[i];

        // Add the mesh to the array of node meshes for later access
        nodeMeshedArray.push(mesh);

        // Add the mesh to the scene, making it visible
        scene.add(mesh);
    }
}


export function createHelperGrid(scene, size, divisions) {
    const gridHelper = new THREE.GridHelper(size, divisions);
    scene.add(gridHelper);
}

// Creates and configures the camera
export function createCamera(width, height) {
    const camera = new THREE.PerspectiveCamera(90, width / height, 1, 4000);
    camera.position.z = height / 2;
    return camera;
}

// Creates and configures the renderer
export function createRenderer(width, height) {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    return renderer;
}

// Sets up the WinBox window and its resize callback
// Sets up the WinBox window and its resize callback
export function setupWinBox(onResizeCallback) {
    return new WinBox({
        'width': '50%',
        'height': '50%',
        onresize: onResizeCallback,
    });
}

// Configures the lighting and reflection properties of the scene for enhanced visual appearance
export function configureLightingAndReflections(renderer, scene) {
    // Create an environment map using the RoomEnvironment class.
    // This environment provides a set of predefined settings to simulate indoor lighting.
    const environment = new RoomEnvironment(renderer);

    // The PMREMGenerator is used to pre-filter the environment map for
    // Physically Based Rendering (PBR). This ensures that materials
    // with reflection properties in the scene interact correctly with the environment map.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);

    // Set the environment property of the scene to the processed environment map.
    // This environment map is now used for lighting calculations and reflections in the scene.
    scene.environment = pmremGenerator.fromScene(environment).texture;

    // Dispose of the original environment map to free up memory, as it's no longer needed.
    environment.dispose();
}

export function configurePostProcessing(composer, scene, camera) {
    let renderPass = new RenderPass(scene, camera);
    renderPass.enabled = true;
    let taaRenderPass = new TAARenderPass(scene, camera);
    let outputPass = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(taaRenderPass);
    composer.addPass(outputPass);
}


export function highlightLeaves(nodes, leavesMeshArray, colorScale) {

    leavesMeshArray.forEach((nodeMesh) => {
        let hexColor = 0xffffff;
        if (colorScale) {
            hexColor = colorScale(nodeMesh.leave.data.values.group);
            hexColor = hexColor.replace('#', '0x');
        }
        nodeMesh.material.color.setHex(hexColor); // Set to red
    });

    nodes.forEach((descendant) => {
        let hexColor = 0xffffff;
        leavesMeshArray.forEach((leaveMesh) => {
            if (leaveMesh.leave.uid === descendant.uid) {
                leaveMesh.material.color.setHex(0xff0000); // Set to red
            } else {
                if (colorScale) {
                    hexColor = colorScale(leaveMesh.leave.data.values.group);
                    hexColor = hexColor.replace('#', '0x');
                    leaveMesh.material.color.setHex(hexColor);
                }
            }
        });
    });
}


export function highlightNodes(nodes, nodesMeshArray) {
    let whiteHex = 0xffffff;

    nodesMeshArray.forEach((nodeMesh) => {
        nodeMesh.material.color.setHex(whiteHex); // Set to red
    });

    nodes.forEach((descendant) => {
        nodesMeshArray.forEach((nodeMesh) => {
            if (nodeMesh.node.uid === descendant.uid) {
                nodeMesh.material.color.setHex(0xff0000); // Set to red
            }
        });
    });
}


export function createAndAddTreeElementsToScene(nodes, links, leaves, tree, universe, nodesMeshedArray, colorScale) {
    const geometry = new THREE.SphereGeometry(2, 32, 16);
    makeNodes(geometry, nodes, universe.scene, tree, nodesMeshedArray, colorScale);
    makeBezierLinks(links, leaves, universe.scene, tree);
}
