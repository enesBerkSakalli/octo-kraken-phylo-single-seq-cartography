import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { TAARenderPass } from "three/addons/postprocessing/TAARenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Universe } from "./Cosmos.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";

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

/* #### Initialize ###### */
export function initializeFoldedTrailGraph(
  cosmos,
  tree,
  colorScale,
  UNIVERSE_ID = "force-graph-trail",
  windowParameters,
  createTopologyAlgorithm,
  statistics
) {
  if (cosmos.checkIfUniverseExists(UNIVERSE_ID)) {
    const universe = cosmos.getUniverseById(UNIVERSE_ID);
    clean(universe.scene);
  } else {
    createTrailGraphLayout(tree);

    // Pass window positioning parameters to the init function
    init(
      cosmos,
      UNIVERSE_ID,
      windowParameters.windowWidth,
      windowParameters.windowHeight,
      windowParameters.windowTop,
      windowParameters.windowLeft,
      false
    );

    cosmos.getUniverseById(UNIVERSE_ID);
    calculateMonophyleticClade(tree);
    createTrails(tree.links(), cosmos.getUniverseById(UNIVERSE_ID).scene);
    const universe = cosmos.getUniverseById(UNIVERSE_ID);
    createTopologyAlgorithm(universe.scene, tree, colorScale, statistics);
  }
}

export function initializeTrailGraph(
  cosmos,
  tree,
  colorScale,
  UNIVERSE_ID = "force-graph-trail",
  windowWidth = "50%", // Default width as a percentage
  windowHeight = "50%", // Default height as a percentage
  windowTop = "25%", // Default top position as a percentage
  windowRight = "25%", // Default right position as a percentage
  windowMaximized = false // Whether the window starts maximized
) {
  if (cosmos.checkIfUniverseExists(UNIVERSE_ID)) {
    const universe = cosmos.getUniverseById(UNIVERSE_ID);
    clean(universe.scene);
  } else {
    createTrailGraphLayout(tree);

    // Now passing additional window parameters to the `init` function
    init(
      cosmos,
      UNIVERSE_ID,
      windowWidth,
      windowHeight,
      windowTop,
      windowRight,
      windowMaximized
    );

    cosmos.getUniverseById(UNIVERSE_ID);

    createTrails(
      tree.links(),
      tree.leaves(),
      cosmos.getUniverseById(UNIVERSE_ID).scene,
      tree,
      cosmos,
      UNIVERSE_ID,
      colorScale
    );

    // Assuming 'scene' should come from the newly created or fetched universe,
    // since it was not defined within the scope of this function
    const scene = cosmos.getUniverseById(UNIVERSE_ID).scene;
    createNodes(tree, colorScale, scene);
  }
}

function init(
  cosmos,
  UNIVERSE_ID = "dimensionalityReductionPlot",
  windowWidth = "50%", // Default width as a percentage of the viewport width
  windowHeight = "50%", // Default height as a percentage of the viewport height
  windowTop = "25%", // Default top position as a percentage of the viewport height
  windowRight = "25%", // Default right position as a percentage of the viewport width
  windowMaximized = false // Whether the window starts maximized
) {
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
    width: windowWidth,
    height: windowHeight,
    top: windowTop,
    right: windowRight,
    max: windowMaximized,
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

export function createNodes(tree, colorScale, scene) {
  let pointCloud = [];

  const bbox = calculateBoundingBox(tree.leaves());

  createGridHelper(bbox, scene);
  createAxesHelper(bbox, scene);

  const sphereRadius = 0.15;

  const geometry = new THREE.CylinderGeometry(
    sphereRadius,
    sphereRadius,
    0.01,
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
    } else if ("children" in node) {
      processInternalNode(
        node,
        geometry,
        material,
        matrix,
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

// Helper function to process internal nodes.
function processInternalNode(
  node,
  geometry,
  material,
  matrix,
  pointCloud,
  scene
) {
  const mesh = new THREE.Mesh(geometry, material.clone()); // Clone the material for each leaf

  const position = new THREE.Vector3(
    node.layout.forceTrail.x,
    node.layout.forceTrail.hierarchyDepth,
    node.layout.forceTrail.z
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

export function createTrails(links, scene) {
  // Create line meshes for links
  links.forEach((link) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(
        link.source.layout.forceTrail.x,
        link.source.layout.forceTrail.hierarchyDepth,
        link.source.layout.forceTrail.z
      ),

      new THREE.Vector3(
        link.target.layout.forceTrail.x,
        link.target.layout.forceTrail.hierarchyDepth,
        link.target.layout.forceTrail.z
      ),
    ]);

    // Use a darker color for better visibility against a white background
    const material = new THREE.LineBasicMaterial({
      color: 0xa0a0a0,
      transparent: true,
      opacity: 0.7,
    });

    const lineMesh = new THREE.Line(geometry, material);
    lineMesh.isLink = true;
    scene.add(lineMesh);
  });
}

export function createTrailGraphLayout(tree) {
  let nodes = tree.descendants();
  let maximumNodeDepth = Math.max(...nodes.map((node) => node.depth));

  tree.eachAfter((node) => {
    node.layout = {};
    node.layout.forceTrail = {};
    // Destructure the returned object to get xCoordinate, yCoordinate, zCoordinate
    if (!node.children) {
      node.layout.forceTrail.x = node.data.values.x;
      node.layout.forceTrail.hierarchyDepth = 0;
      node.layout.forceTrail.z = node.data.values.z;
    } else if (node.children) {
      let summedXCoordinate = 0;
      let summedZCoordinate = 0;

      node.children.forEach((child) => {
        summedXCoordinate += child.layout.forceTrail.x;
        summedZCoordinate += child.layout.forceTrail.z;
      });

      let X = summedXCoordinate / node.children.length;
      let Z = summedZCoordinate / node.children.length;

      node.layout.forceTrail.x = X;
      node.layout.forceTrail.hierarchyDepth =
        (maximumNodeDepth - node.depth) * -1;
      node.layout.forceTrail.z = Z;
    }
  });
}

export function calculateMonophyleticClade(tree) {
  tree.eachAfter((node) => {
    // Proceed only if the node has children
    if (!node.children) return;

    // Check if all children are leaves and extract those that are.
    const leaves = node.children.filter((child) => !child.children);

    // Early exit if no leaves are found
    if (leaves.length === 0) return;

    // Check if all leaves belong to the same group
    const firstChildGroup = leaves[0].data.values.group;

    const allLeavesSameGroup = leaves.every(
      (leaf) => leaf.data.values.group === firstChildGroup
    );

    // Proceed only if all children are leaves and they all belong to the same group
    if (node.children.length !== leaves.length || !allLeavesSameGroup) return;

    // Collect points from leaves with hierarchyDepth of 0
    const groupPoints = leaves
      .filter((leaf) => leaf.layout.forceTrail.hierarchyDepth === 0)
      .map((leaf) => ({
        x: leaf.layout.forceTrail.x,
        y: leaf.layout.forceTrail.hierarchyDepth,
        z: leaf.layout.forceTrail.z,
      }));

    // Include groupPoints from children nodes that were previously collapsed and belong to the same group
    node.children
      .filter(
        (child) =>
          child.trail_graph_metrics &&
          child.trail_graph_metrics.group === firstChildGroup
      )
      .forEach((child) => {
        groupPoints.push(...child.trail_graph_metrics.groupPoints);
      });

    // Update the node with the calculated metrics and collapse it
    node.trail_graph_metrics = {
      group: firstChildGroup,
      groupPoints: groupPoints,
    };

    // Collapse the node by moving children to _children and clearing children
    node._children = node.children;
    node.children = null;
    node.data.values.group = firstChildGroup;
  });
}

export function createTrailTopologyConvex(scene, tree, colorScale) {
  tree.eachAfter((node) => {
    const material = createNodeMaterial(node, colorScale);
    const geometry = createNodeGeometry(node);
    const nodeMesh = new THREE.Mesh(geometry, material);
    const nodePosition = new THREE.Vector3(
      node.layout.forceTrail.x,
      node.layout.forceTrail.hierarchyDepth,
      node.layout.forceTrail.z
    );
    nodeMesh.position.set(nodePosition.x, nodePosition.y, nodePosition.z);
    scene.add(nodeMesh);
    createWireframeMeshForNode(node, scene, colorScale);
  });
}

export function createNodeMaterial(node, colorScale) {
  return new THREE.MeshStandardMaterial({
    color: colorScale(node.data.values.group),
    alphaTest: true,
    opacity: 1,
    transparent: true,
  });
}

export function createNodeGeometry(node) {
  if (nodeHasChildrenOrMetrics(node)) {
    const radiusScale = calculateRadiusScale(node);
    return new THREE.CylinderGeometry(radiusScale, radiusScale, 0.001, 32);
  } else {
    return new THREE.SphereGeometry(0.05, 32, 16);
  }
}

function nodeHasChildrenOrMetrics(node) {
  return (
    node.children ||
    (node.trail_graph_metrics &&
      node.trail_graph_metrics.groupPoints.length > 0)
  );
}

function calculateRadiusScale(node) {
  const numPoints = node.trail_graph_metrics
    ? node.trail_graph_metrics.groupPoints.length
    : 1;
  return Math.max(0.1, numPoints * 0.005);
}

function createWireframeMeshForNode(node, scene, colorScale) {
  if (nodeHasGroupPoints(node)) {
    const points = createFilteredPoints(node);

    const convexGeometry = new ConvexGeometry(points);
    const lineWidth = calculateLineWidth(points);
    const wireframeMaterial = createWireframeMaterial(
      node,
      colorScale,
      lineWidth
    );
    const wireframeMesh = new THREE.Mesh(convexGeometry, wireframeMaterial);
    scene.add(wireframeMesh);
  }
}

export function nodeHasGroupPoints(node) {
  return (
    node.trail_graph_metrics && node.trail_graph_metrics.groupPoints.length > 0
  );
}

export function createFilteredPointsRaw(node) {
  let raw_points = [];
  node.trail_graph_metrics.groupPoints.forEach((point) => {
    if (point.y === 0) {
      raw_points.push([point.x, point.z]);
    }
  });
  return raw_points;
}

function calculateLineWidth(points) {
  return points.length > 1 ? points.length * 2 : 1;
}

function createWireframeMaterial(node, colorScale, lineWidth) {
  return new THREE.MeshBasicMaterial({
    color: colorScale(node.data.values.group),
    //wireframe: true,
    linewidth: lineWidth,
  });
}
