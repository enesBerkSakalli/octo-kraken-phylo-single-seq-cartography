import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { TAARenderPass } from "three/addons/postprocessing/TAARenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Universe } from "./Cosmos.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

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
  const axesHelper = new THREE.AxesHelper(size.length());
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
  gui.add(
    {
      button: () => {},
    },
    "button"
  );
}

export function initializeForceTrailGraph(
  cosmos,
  tree,
  colorScale,
  UNIVERSE_ID = "force-graph-trail"
) {
  if (cosmos.checkIfUniverseExists(UNIVERSE_ID)) {
    const universe = cosmos.getUniverseById(UNIVERSE_ID);
    clean(universe.scene);
  } else {
    init(cosmos, UNIVERSE_ID);

    cosmos
      .getUniverseById(UNIVERSE_ID)
      .setMeshes(createNodes(tree, colorScale));

    createTrails(
      tree.links(),
      tree.leaves(),
      cosmos.getUniverseById(UNIVERSE_ID).scene,
      tree,
      cosmos,
      UNIVERSE_ID,
      colorScale
    );
  }
}

export function createNodes(tree, colorScale) {
  let pointCloud = [];

  const bbox = calculateBoundingBox(tree.leaves());

  createGridHelper(bbox, scene);
  createAxesHelper(bbox, scene);

  const scaleFactor = calculateScaleFactor(bbox);

  const sphereRadius = 1 * scaleFactor;

  const geometry = new THREE.CylinderGeometry(
    sphereRadius,
    sphereRadius,
    0.1,
    32
  );

  let material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    alphaHash: true,
    opacity: 1,
  });

  const matrix = new THREE.Matrix4();

  let maxRadius = tree.maxRadius;
  const size = bbox.getSize(new THREE.Vector3());
  const depthScalingFactor = size.length() / maxRadius; // Adjust this to suit your data visualization needs

  tree.eachAfter(function (node) {
    if (!("children" in node)) {
      processLeafNode(
        node,
        geometry,
        material,
        matrix,
        pointCloud,
        scene,
        colorScale
      );
    } else if (!node.parent) {
      processRootNode(
        node,
        geometry,
        maxRadius,
        material,
        matrix,
        depthScalingFactor,
        pointCloud,
        scene
      );
    } else if ("children" in node) {
      processInternalNode(
        node,
        geometry,
        material,
        matrix,
        depthScalingFactor,
        pointCloud,
        scene,
        averageCoordinate
      );
    }
  });

  return pointCloud;
}

// Helper function to process internal nodes.
function processLeafNode(
  node,
  geometry,
  material,
  matrix,
  pointCloud,
  scene,
  colorScale
) {
  const mesh = new THREE.Mesh(geometry, material.clone()); // Clone the material for each leaf

  const position = new THREE.Vector3(
    node.data.values.x,
    node.data.values.y,
    node.data.values.z
  );

  const quaternion = new THREE.Quaternion(); // Adjust as needed
  const scale = new THREE.Vector3(1, 1, 1); // Adjust as needed

  let hexColor = 0xffffff;

  if (colorScale) {
    hexColor = colorScale(node.data.values.group);
    hexColor = hexColor.replace("#", "0x");
  }

  mesh.material.color.setHex(hexColor);
  matrix.compose(position, quaternion, scale);
  mesh.applyMatrix4(matrix);
  mesh.leave = node; // Assign data to userData

  pointCloud.push(mesh);

  scene.add(mesh);
}

function processRootNode(
  node,
  geometry,
  maxRadius,
  material,
  matrix,
  depthScalingFactor,
  pointCloud,
  scene
) {
  const mesh = new THREE.Mesh(geometry, material.clone()); // Clone the material for each leaf

  let summedXCoordinate = 0;
  let summedYCoordinate = 0;
  let summedZCoordinate = 0;

  node.children.forEach((child) => {
    summedXCoordinate += child.data.values.fcx;
    summedYCoordinate += child.data.values.fcy;
    summedZCoordinate += child.data.values.fcz;
  });

  let averageX = summedXCoordinate / node.children.length;
  let averageY = summedYCoordinate / node.children.length;
  let averageZ = summedZCoordinate / node.children.length;
  let averagedRadius = node.radius / node.children.length;

  node.data.values.fcx = averageX;
  node.data.values.fcy = averagedRadius;
  node.data.values.fcz = averageZ;

  const position = new THREE.Vector3(
    averageX,
    node.maxRadius * -depthScalingFactor,
    averageZ
  );

  const quaternion = new THREE.Quaternion(); // Adjust as needed

  const scale = new THREE.Vector3(1, 1, 1); // Adjust as needed

  let hexColorGrey = 0x808080;

  mesh.material.color.setHex(hexColorGrey);

  matrix.compose(position, quaternion, scale);

  mesh.applyMatrix4(matrix);
  mesh.leave = node; // Assign data to userData

  pointCloud.push(mesh);

  scene.add(mesh);
}

// Helper function to process internal nodes.
function processInternalNode(
  node,
  geometry,
  material,
  matrix,
  depthScalingFactor,
  pointCloud,
  scene,
  point
) {
  const mesh = new THREE.Mesh(geometry, material.clone()); // Clone the material for each leaf
  let averagedRadius = node.radius / node.children.length;

  // Destructure the returned object to get xCoordinate, yCoordinate, zCoordinate
  let { X: xCoordinate, Y: yCoordinate, Z: zCoordinate } = point(node);

  node.data.values.fcx = xCoordinate;
  node.data.values.fcy = averagedRadius;
  node.data.values.fcz = zCoordinate;

  const position = new THREE.Vector3(
    xCoordinate,
    node.radius * -depthScalingFactor,
    zCoordinate
  );

  const quaternion = new THREE.Quaternion(); // Adjust as needed

  const scale = new THREE.Vector3(1, 1, 1); // Adjust as needed

  let hexColorGrey = 0x808080;

  mesh.material.color.setHex(hexColorGrey);

  matrix.compose(position, quaternion, scale);

  mesh.applyMatrix4(matrix);

  mesh.ref = node; // Assign data to userData

  pointCloud.push(mesh);

  scene.add(mesh);
}

function init(cosmos, UNIVERSE_ID = "dimensionalityReductionPlot") {
  // camera
  let camera = new THREE.PerspectiveCamera(
    4,
    window.innerWidth / window.innerHeight,
    10,
    4000
  );
  camera.position.z = window.innerHeight / 2;

  // renderer
  let renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);

  // scene
  let scene = new THREE.Scene();

  let dataPlotContainer = new WinBox({
    //'width': '50%',
    //height: '50%',
    top: "50%",
    right: "50%",
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

  cosmos.registerUniverse(
    UNIVERSE_ID,
    new Universe(
      camera,
      renderer,
      container,
      controls,
      scene,
      composer,
      null,
      window
    )
  );
}

function averageCoordinate(node) {
  let summedXCoordinate = 0;
  let summedYCoordinate = 0;
  let summedZCoordinate = 0;

  node.children.forEach((child) => {
    summedXCoordinate += child.data.values.x;
    summedYCoordinate += child.data.values.y;
    summedZCoordinate += child.data.values.z;
  });

  let X = summedXCoordinate / node.children.length;
  let Y = summedYCoordinate / node.children.length;
  let Z = summedZCoordinate / node.children.length;

  // Return an object with the averages
  return { X, Y, Z };
}

export function createTrails(
  links,
  leaves,
  scene,
  tree,
  cosmos,
  universeId,
  colorScale
) {
  let hexDarkGrey = "#A0A0A0";
  let maxRadius = tree.maxRadius;
  const bbox = calculateBoundingBox(tree.leaves());
  const size = bbox.getSize(new THREE.Vector3());
  const depthScalingFactor = size.length() / maxRadius; // Adjust this to suit your data visualization needs
  let linkMeshArray = [];

  const curveMaterial = new THREE.MeshBasicMaterial({
    color: hexDarkGrey,
    transparent: true,
    opacity: 0.5,
  });

  let maximumNodeDepth = Math.max(...leaves.map((node) => node.depth));
  let universeHeight = cosmos
    .getUniverseById(universeId)
    .container.getBoundingClientRect().height;

  // Create line meshes for links
  links.forEach((link) => {
    if (!link.source.parent || !link.target.parent) {
      console.log("Root to Root Link");

      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(
          link.source.data.values.fcx,
          maxRadius * -depthScalingFactor,
          link.source.data.values.fcz
        ),

        new THREE.Vector3(
          link.target.data.values.fcx,
          link.target.radius * -depthScalingFactor,
          link.target.data.values.fcz
        ),
      ]);

      // Use a darker color for better visibility against a white background
      const material = new THREE.LineBasicMaterial({
        color: 0xa0a0a0, // Teenage Engineering-style grey
        transparent: true,
        opacity: 0.7,
      });

      const lineMesh = new THREE.Line(geometry, material);
      lineMesh.isLink = true;
      linkMeshArray.push(lineMesh);
      scene.add(lineMesh);
    }
  });

  leaves.forEach((leaf) => {
    console.log(
      leaf.data.values.x,
      leaf.data.values.z,
      leaf.parent.data.values.fcx,
      leaf.parent.data.values.fcz
    );

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(leaf.data.values.x, 0, leaf.data.values.z),

      new THREE.Vector3(
        leaf.parent.data.values.fcx,
        leaf.parent.radius * -depthScalingFactor,
        leaf.parent.data.values.fcz
      ),
    ]);

    // Use a darker color for better visibility against a white background
    const material = new THREE.LineBasicMaterial({
      color: 0xa0a0a0, // Teenage Engineering-style grey
      transparent: true,
      opacity: 0.7,
    });

    const lineMesh = new THREE.Line(geometry, material);
    lineMesh.isLink = true;
    linkMeshArray.push(lineMesh);
    scene.add(lineMesh);
  });
}
