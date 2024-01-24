import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { TAARenderPass } from 'three/addons/postprocessing/TAARenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Universe } from './Cosmos.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';


function clean(scene) {

    const meshes = [];

    scene.traverse(function (object) {
        if (object.isMesh) meshes.push(object);
    });

    for (let i = 0; i < meshes.length; i++) {
        const mesh = meshes[i];
        mesh.material.dispose();
        mesh.geometry.dispose();
        scene.remove(mesh);
    }
}

function calculateBoundingBox(data) {
    const bbox = new THREE.Box3();

    data.forEach((leaf) => {
        const point = new THREE.Vector3(
            leaf.data.values.x,
            leaf.data.values.y,
            leaf.data.values.z
        );
        bbox.expandByPoint(point);
    });

    return bbox;
}

function createGridHelper(bbox, scene) {
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    // Add Grid Helper
    const gridHelper = new THREE.GridHelper(size.length(), 10);
    gridHelper.position.copy(center);
    scene.add(gridHelper);
}

function createAxesHelper(bbox, scene) {
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());
    // Add Axes Helper
    const axesHelper = new THREE.AxesHelper(size.length() * 0.5);
    axesHelper.position.copy(center);
    scene.add(axesHelper);
}

function calculateScaleFactor(bbox) {
    const size = bbox.getSize(new THREE.Vector3());
    const scaleFactor = size.length() / 50; // Adjust this to suit your data visualization needs
    return scaleFactor;
}

function createGUI(cosmos, UNIVERSE_ID) {
    let container = cosmos.getUniverseById(UNIVERSE_ID).container;
    const gui = new GUI();
    container.appendChild(gui.domElement);
    gui.add({
        button: () => {

        }
    }, 'button');
}


export function initializeDimensionalityReductionPlot(cosmos, leaves, colorScale, UNIVERSE_ID = 'dimensionalityReductionPlot') {
    if (cosmos.checkIfUniverseExists(UNIVERSE_ID)) {
        const universe = cosmos.getUniverseById(UNIVERSE_ID);
        clean(universe.scene);
    } else {
        init(cosmos, UNIVERSE_ID);
        cosmos.getUniverseById(UNIVERSE_ID).setMeshes(createClouds(leaves, colorScale));
        // createGUI(cosmos, UNIVERSE_ID);
    }
}

export function createClouds(leaves, colorScale) {

    let pointCloud = [];

    const bbox = calculateBoundingBox(leaves);

    createGridHelper(bbox, scene);
    createAxesHelper(bbox, scene);

    const scaleFactor = calculateScaleFactor(bbox);
    const sphereRadius = 0.2 * scaleFactor;
    const geometry = new THREE.SphereGeometry(sphereRadius, 32, 16);

    let material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: true,
        opacity: 1
    });

    const matrix = new THREE.Matrix4();

    for (const element of leaves) {
        const mesh = new THREE.Mesh(geometry, material.clone());  // Clone the material for each leaf

        const position = new THREE.Vector3(element.data.values.x, element.data.values.y, element.data.values.z);
        const quaternion = new THREE.Quaternion();  // Adjust as needed
        const scale = new THREE.Vector3(1, 1, 1);  // Adjust as needed

        let hexColor = 0xffffff;

        if (colorScale) {
            hexColor = colorScale(element.data.values.group);
            hexColor = hexColor.replace('#', '0x');
        }

        mesh.material.color.setHex(hexColor);
        matrix.compose(position, quaternion, scale);
        mesh.applyMatrix4(matrix);
        mesh.leave = element;  // Assign data to userData
        pointCloud.push(mesh);
        scene.add(mesh);
    }

    return pointCloud;
}

function init(cosmos, UNIVERSE_ID = 'dimensionalityReductionPlot') {
    // camera
    let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);
    camera.position.z = window.innerHeight / 2;

    // renderer
    let renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // scene
    let scene = new THREE.Scene();

    let dataPlotContainer = new WinBox({
        //'width': '50%',
        //height: '50%',
        //top: '50%',
        right: '50%',
        max: true,
        onresize: function (width, height) {
            // Update camera and renderer on window resize
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        },
    });

    const rect = dataPlotContainer.body.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;

    renderer.setSize(width, height);
    let container = dataPlotContainer.body;
    container.appendChild(renderer.domElement);

    const environment = new RoomEnvironment(renderer);
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(environment).texture;
    environment.dispose();

    // renderpasses
    let renderPass = new RenderPass(scene, camera);
    renderPass.enabled = true;
    let taaRenderPass = new TAARenderPass(scene, camera);
    let outputPass = new OutputPass();

    let composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(taaRenderPass);
    composer.addPass(outputPass);

    let controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(window, { scene });

    scene.background = new THREE.Color(0xffffff); // Set to white color

    cosmos.registerUniverse(UNIVERSE_ID, new Universe(camera, renderer, container, controls, scene, composer, null, window));
}
