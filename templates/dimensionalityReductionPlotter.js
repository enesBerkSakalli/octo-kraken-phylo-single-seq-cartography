import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { TAARenderPass } from 'three/addons/postprocessing/TAARenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Universe } from './Cosmos.js';

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

export function makeInstanced(geometry, leaves, scene, leavesMeshArray, colorScale) {
    const bbox = calculateBoundingBox(leaves);
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());

    // Add Grid Helper
    const gridHelper = new THREE.GridHelper(size.length(), 10);
    gridHelper.position.copy(center);
    scene.add(gridHelper);

    const scale = size.length() * 0.5;  // For example, half of the diagonal of the bounding box
    const axesHelper = new THREE.AxesHelper(scale);
    axesHelper.position.copy(center);
    scene.add(axesHelper);

    let material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        alphaHash: true,
        opacity: 0.8
    });

    const color = new THREE.Color();
    const matrix = new THREE.Matrix4();

    for (let i = 0; i < leaves.length; i++) {
        const mesh = new THREE.Mesh(geometry, material.clone());  // Clone the material for each leaf
        const position = new THREE.Vector3(leaves[i].data.values.x, leaves[i].data.values.y, leaves[i].data.values.z);
        const quaternion = new THREE.Quaternion();  // Adjust as needed
        const scale = new THREE.Vector3(1, 1, 1);  // Adjust as needed

        let hexColor = 0xffffff;

        if (colorScale) {
            hexColor = colorScale(leaves[i].data.values.group);
            hexColor = hexColor.replace('#', '0x');
        }

        mesh.material.color.setHex(hexColor);
        matrix.compose(position, quaternion, scale);
        mesh.applyMatrix4(matrix);
        mesh.leave = leaves[i];  // Assign data to userData
        leavesMeshArray.push(mesh);
        scene.add(mesh);
    }

    return leavesMeshArray;
}

export function initializeDimensionalityReductionPlot(cosmos, leaves, colorScale) {
    let dataPlotContainer;
    let container, stats;
    let camera, controls, scene, renderer;
    let leavesMeshArray = [];
    const geometry = new THREE.SphereGeometry(1, 32, 16);
    let width = window.innerWidth;
    let height = window.innerHeight;

    init(cosmos);
    initMesh(scene, cosmos);
    animate();

    function initMesh(scene, cosmos) {
        clean(scene);
        leavesMeshArray = makeInstanced(geometry, leaves, scene, leavesMeshArray, colorScale);
        cosmos.getUniverseById('dimensionality-reduction-plot').setMeshes(leavesMeshArray);
    }

    function init(cosmos) {
        // camera
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 4000);
        camera.position.z = window.innerHeight / 2;
        // renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        // scene
        scene = new THREE.Scene();

        dataPlotContainer = new WinBox({
            'width': '50%',
            'height': '50%',
            onresize: function (width, height) {
                // Update camera and renderer on window resize
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            },
        });

        const rect = dataPlotContainer.body.getBoundingClientRect();
        width = rect.width;
        height = rect.height;

        renderer.setSize(width, height);
        container = dataPlotContainer.body;
        container.appendChild(renderer.domElement);

        // stats
        stats = new Stats();
        container.appendChild(stats.dom);

        const environment = new RoomEnvironment(renderer);
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(environment).texture;
        environment.dispose();

        // renderpasses
        let renderPass = new RenderPass(scene, camera);
        renderPass.enabled = false;
        let taaRenderPass = new TAARenderPass(scene, camera);
        let outputPass = new OutputPass();

        let composer = new EffectComposer(renderer);
        composer.addPass(renderPass);
        composer.addPass(taaRenderPass);
        composer.addPass(outputPass);

        //
        controls = new OrbitControls(camera, renderer.domElement);
        Object.assign(window, { scene });

        cosmos.registerUniverse('dimensionality-reduction-plot', new Universe(camera, renderer, container, controls, scene, composer, null, window));
    }

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        stats.update();
        render();
    }

    function render() {
        renderer.render(scene, camera);
    }

}
