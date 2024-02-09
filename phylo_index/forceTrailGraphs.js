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

export function initializeFoldedTrailGraph(
  cosmos,
  tree,
  colorScale,
  UNIVERSE_ID = "force-graph-trail"
) {
  if (cosmos.checkIfUniverseExists(UNIVERSE_ID)) {
    const universe = cosmos.getUniverseById(UNIVERSE_ID);
    clean(universe.scene);
  } else {
    createTrailGraphLayout(tree);

    init(cosmos, UNIVERSE_ID);

    cosmos.getUniverseById(UNIVERSE_ID);

    calculateFoldedTrailTopology(tree);

    createTrails(
      tree.links(),
      tree.leaves(),
      cosmos.getUniverseById(UNIVERSE_ID).scene,
      tree,
      cosmos,
      UNIVERSE_ID,
      colorScale
    );

    createTrailTopologyMinimalSpanningTree(scene, tree, colorScale);
  }
}

export function initializeTrailGraph(
  cosmos,
  tree,
  colorScale,
  UNIVERSE_ID = "force-graph-trail"
) {
  if (cosmos.checkIfUniverseExists(UNIVERSE_ID)) {
    const universe = cosmos.getUniverseById(UNIVERSE_ID);
    clean(universe.scene);
  } else {
    createTrailGraphLayout(tree);

    init(cosmos, UNIVERSE_ID);

    cosmos.getUniverseById(UNIVERSE_ID);

    // calculateFoldedTrailTopology(tree);

    createTrails(
      tree.links(),
      tree.leaves(),
      cosmos.getUniverseById(UNIVERSE_ID).scene,
      tree,
      cosmos,
      UNIVERSE_ID,
      colorScale
    );

    // createTrailTopologyMinimalSpanningTree(scene, tree, colorScale);
    createNodes(tree,colorScale, scene)
  }
}

export function createNodes(tree, colorScale, scene) {
  let pointCloud = [];

  const bbox = calculateBoundingBox(tree.leaves());

  createGridHelper(bbox, scene);
  createAxesHelper(bbox, scene);

  const scaleFactor = calculateScaleFactor(bbox);

  const sphereRadius = 0.05; //1 * scaleFactor;

  const geometry = new THREE.CylinderGeometry(
    sphereRadius,
    sphereRadius,
    0.001,
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

// Helper function to process internal nodes.
function processInternalNode(
  node,
  geometry,
  material,
  matrix,
  depthScalingFactor,
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
  let maxRadius = tree.maxRadius;
  const bbox = calculateBoundingBox(tree.leaves());
  const size = bbox.getSize(new THREE.Vector3());
  const depthScalingFactor = size.length() / maxRadius; // Adjust this to suit your data visualization needs
  const linkMeshArray = [];

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

function createTrailGraphLayout(tree) {
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

export function calculateFoldedTrailTopology(tree) {
  tree.eachAfter((node) => {
    if (node.children) {
      let allChildrenAreLeaves = node.children.every(
        (child) => !child.children
      );

      let leaves = node.children.filter((child) => !child.children);

      if (leaves.length > 0) {
        let firstChildGroup = leaves[0].data.values.group;

        const allChildrenSameGroup = leaves.every(
          (child) => child.data.values.group === firstChildGroup
        );

        if (allChildrenAreLeaves && allChildrenSameGroup) {
          let groupPoints = leaves.map((leaf) => ({
            x: leaf.layout.forceTrail.x,
            y: leaf.layout.forceTrail.hierarchyDepth,
            z: leaf.layout.forceTrail.z,
          }));

          let metric = {
            group: firstChildGroup,
            groupPoints: groupPoints,
          };

          let childrenWithNodeMetric = node.children.filter(
            (child) =>
              child.trail_graph_metrics !== undefined &&
              child.trail_graph_metrics.group === firstChildGroup
          );

          if (childrenWithNodeMetric.length > 0) {
            childrenWithNodeMetric.forEach((child) => {
              metric.groupPoints.push(...child.trail_graph_metrics.groupPoints);
            });
          }

          node.trail_graph_metrics = metric;
          node._children = node.children; // Store children in _children to 'collapse' them
          node.children = null; // Remove children to collapse the node
          node.data.values.group = firstChildGroup;
        }
      }
    }
  });
}

function createTrailTopologyComplex(scene, tree, colorScale) {
  tree.eachAfter((node) => {
    // Sphere mesh creation for each node remains the same
    let hexColor = 0xffffff;
    let sphereMaterial = new THREE.MeshStandardMaterial({
      color: colorScale(node.data.values.group),

      alphaHash: true,

      opacity: 1,
    });

    let sphereGeometry = new THREE.SphereGeometry(0.05, 32, 16);
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);

    const commonNodePosition = new THREE.Vector3(
      node.layout.forceTrail.x,
      node.layout.forceTrail.hierarchyDepth,
      node.layout.forceTrail.z
    );

    sphereMesh.position.set(
      commonNodePosition.x,
      commonNodePosition.y,
      commonNodePosition.z
    );
    scene.add(sphereMesh);

    // Creating lines that connect each point to every other point
    if (
      node.trail_graph_metrics &&
      node.trail_graph_metrics.groupPoints.length > 0
    ) {
      const points = node.trail_graph_metrics.groupPoints
        .map((p) => new THREE.Vector3(p.x, p.y, p.z))
        .filter((p) => p.y >= 0);

      points.push(
        new THREE.Vector3(
          commonNodePosition.x,
          commonNodePosition.y,
          commonNodePosition.z
        )
      );

      // Loop through all pairs of points and draw lines between them
      points.forEach((pointStart, indexStart) => {
        points.forEach((pointEnd, indexEnd) => {
          if (indexStart !== indexEnd) {
            const geometry = new THREE.BufferGeometry().setFromPoints([
              pointStart,
              pointEnd,
            ]);

            const material = new THREE.LineBasicMaterial({
              color: colorScale(node.data.values.group),
              transparent: true,
              opacity: 1,
            });
            const line = new THREE.Line(geometry, material);
            scene.add(line);
          }
        });
      });
    }
  });
}

function createTrailTopologyConvex(scene, tree, colorScale) {
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

function createTrailTopologyMinimalSpanningTree(scene, tree, colorScale) {
  tree.eachAfter((node) => {
    const material = createNodeMaterial(node, colorScale);
    const geometry = createNodeGeometry(node);
    const nodeMesh = new THREE.Mesh(geometry, material);

    const nodePosition = new THREE.Vector3(
      node.layout.forceTrail.x,
      node.layout.forceTrail.hierarchyDepth,
      node.layout.forceTrail.z
    );

    if (!node.children && !node.trail_graph_metrics) {
      nodeMesh.position.set(nodePosition.x, 1, nodePosition.z);
    } else {
      nodeMesh.position.set(nodePosition.x, nodePosition.y, nodePosition.z);
    }

    scene.add(nodeMesh);

    createSpanningMeshesForNode(node, scene, colorScale, material)
    //createDelaunyMeshesForNode(node, scene, colorScale, material)
  });
}

function createNodeMaterial(node, colorScale) {
  return new THREE.MeshStandardMaterial({
    color: colorScale(node.data.values.group),
    alphaTest: true,
    opacity: 1,
    transparent: true,
  });
}

function createNodeGeometry(node) {
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

function createSpanningMeshesForNode(node, scene, colorScale, material) {
  if (nodeHasGroupPoints(node)) {
    // Get the position of the ancestral node
    const nodePosition = new THREE.Vector3(
      node.layout.forceTrail.x,
      node.layout.forceTrail.hierarchyDepth,
      node.layout.forceTrail.z
    );

    const points = createFilteredPointsRaw(node);
    const delaunay = d3.Delaunay.from(
      points.map((point) => [point[0], point[1]])
    );
    const triangles = delaunay.triangles;

    let graph = new Map();

    // Populate the graph with edges from the Delaunay triangulation
    for (let i = 0; i < triangles.length; i += 3) {
      const triangle = [triangles[i], triangles[i + 1], triangles[i + 2]];
      for (let j = 0; j < triangle.length; j++) {
        const pointIndexA = triangle[j];
        const pointIndexB = triangle[(j + 1) % triangle.length];
        const distance = calculateDistance(
          points[pointIndexA],
          points[pointIndexB]
        );

        if (!graph.has(pointIndexA)) graph.set(pointIndexA, []);
        graph.get(pointIndexA).push({ node: pointIndexB, weight: distance });

        if (!graph.has(pointIndexB)) graph.set(pointIndexB, []);
        graph.get(pointIndexB).push({ node: pointIndexA, weight: distance });
      }
    }

    const mst = kruskalsAlgorithm(graph, points);

    // Draw lines for the MST
    mst.forEach((edge) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(points[edge.from][0], 0, points[edge.from][1]),
        new THREE.Vector3(points[edge.to][0], 0, points[edge.to][1]),
      ]);

      const material = new THREE.LineBasicMaterial({
        color: colorScale(node.data.values.group),
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
    });

    // Connect each point in the MST to the node (ancestor)
    points.forEach((point, index) => {
      const pointGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(point[0], 0, point[1]),
        nodePosition,
      ]);

      const pointMaterial = new THREE.LineBasicMaterial({
        color: colorScale(node.data.values.group), // Use the same color or adjust as needed
      });
      const pointLine = new THREE.Line(pointGeometry, pointMaterial);

      scene.add(pointLine);
    });


    // For each point, create a circle with a white circumference
    points.forEach((point) => {
      const radius = 0.10; // Radius of the circle
      const segments = 32; // Defines the number of segments that make up the circle, higher number for smoother circle

      // Create circle geometry
      const circleGeometry = new THREE.CircleGeometry(radius, segments);

      // Create material for the circle, ensuring it's double-sided
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: colorScale(node.data.values.group), // Use color scale for circle color
        side: THREE.DoubleSide, // Make sure the circle is visible from both sides
      });

      // Create a mesh with the geometry and material
      const circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);

      // Rotate the circle to lie flat on the XZ plane
      circleMesh.rotation.x = Math.PI / 2;

      // Adjust the position of the circle
      circleMesh.position.set(point[0], 0, point[1]); // Position the circle on the XZ plane

      // Add the circle mesh to the scene
      scene.add(circleMesh);

      // Create an edges geometry from the circle geometry
      const edgesGeometry = new THREE.EdgesGeometry(circleGeometry);

      // Create a line material for the circumference
      const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff }); // White color for the circumference

      // Create a line segment to represent the circumference
      const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

      // Apply the same position and rotation adjustments to the circumference
      edges.position.set(point[0], 0, point[1]);
      edges.rotation.x = Math.PI / 2;

      // Add the circumference to the scene
      scene.add(edges);
    });

  }
}

class UnionFind {
  constructor(size) {
    this.root = Array.from({ length: size }, (_, index) => index);
  }

  find(i) {
    if (this.root[i] === i) {
      return i;
    }
    return (this.root[i] = this.find(this.root[i]));
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.root[rootX] = rootY;
    }
  }

  connected(x, y) {
    return this.find(x) === this.find(y);
  }
}

function kruskalsAlgorithm(graph, points) {
  const edges = [];
  graph.forEach((edgesList, node) => {
    edgesList.forEach((edge) => {
      edges.push({ from: node, to: edge.node, weight: edge.weight });
    });
  });

  edges.sort((a, b) => a.weight - b.weight);

  const uf = new UnionFind(points.length);
  const mst = [];

  edges.forEach((edge) => {
    if (!uf.connected(edge.from, edge.to)) {
      uf.union(edge.from, edge.to);
      mst.push(edge);
    }
  });

  return mst;
}

function calculateDistance(point1, point2) {
  return Math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2);
}

function nodeHasGroupPoints(node) {
  return (
    node.trail_graph_metrics && node.trail_graph_metrics.groupPoints.length > 0
  );
}

function createFilteredPointsRaw(node) {
  let raw_points = [];
  node.trail_graph_metrics.groupPoints.forEach((point) => {
    if (point.y === 0) {
      raw_points.push([point.x, point.z]);
    }
  });
  return raw_points;
}

function createFilteredPoints(node) {
  return node.trail_graph_metrics.groupPoints
    .map((p) => new THREE.Vector3(p.x, p.y, p.z))
    .filter((p) => p.y >= 0)
    .concat(
      new THREE.Vector3(
        node.layout.forceTrail.x,
        node.layout.forceTrail.hierarchyDepth,
        node.layout.forceTrail.z
      )
    );
}

function calculateLineWidth(points) {
  return points.length > 1 ? points.length * 2 : 1;
}

function createWireframeMaterial(node, colorScale, lineWidth) {
  return new THREE.MeshBasicMaterial({
    color: colorScale(node.data.values.group),
    wireframe: true,
    linewidth: lineWidth,
  });
}


function createDelaunyMeshesForNode(node, scene, colorScale, material) {
  if (nodeHasGroupPoints(node)) {
    // The initial setup and getting the positions of the points remain the same

    const points = createFilteredPointsRaw(node);
    const delaunay = d3.Delaunay.from(
      points.map((point) => [point[0], point[1]])
    );
    const triangles = delaunay.triangles;

    // Draw lines for each edge in the Delaunay triangulation
    for (let i = 0; i < triangles.length; i += 3) {
      for (let j = 0; j < 3; j++) {
        const start = triangles[i + j];
        const end = triangles[i + (j + 1) % 3];

        // Create a geometry and draw a line between the start and end points
        const geometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(points[start][0], 0, points[start][1]),
          new THREE.Vector3(points[end][0], 0, points[end][1]),
        ]);

        // Reuse the provided material for consistency or create a new one
        const lineMaterial = new THREE.LineBasicMaterial({
          color: colorScale(node.data.values.group),
        });
        const line = new THREE.Line(geometry, lineMaterial);
        scene.add(line);
      }
    }

    // Plotting points of the triangulation with circles
    points.forEach((point) => {
      const radius = 0.01; // Smaller radius for a subtle visual representation
      const segments = 8; // Fewer segments since these are small circles

      // Create circle geometry
      const circleGeometry = new THREE.CircleGeometry(radius, segments);

      // Create material for the circle, ensuring it's double-sided
      const circleMaterial = new THREE.MeshBasicMaterial({
        color: colorScale(node.data.values.group), // Use color scale for circle color
        side: THREE.DoubleSide, // Make sure the circle is visible from both sides
      });

      // Create a mesh with the geometry and material
      const circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);

      // Rotate the circle to lie flat on the XZ plane
      circleMesh.rotation.x = Math.PI / 2;

      // Adjust the position of the circle
      circleMesh.position.set(point[0], 0, point[1]); // Position the circle on the XZ plane

      // Add the circle mesh to the scene
      scene.add(circleMesh);
    });
  }
}