import * as THREE from "three";

import {
  createNodeMaterial,
  createNodeGeometry,
  nodeHasGroupPoints,
  createFilteredPointsRaw,
} from "./forceTrailGraphs.js";

export class UnionFind {
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

function calculateDistance(point1, point2) {
  return Math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2);
}

function createGraphFromTriangulation(delaunay, points) {
  let graph = new Map();
  const triangles = delaunay.triangles;
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
  return graph;
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

function plotMinimalSpanningTree(
  mst,
  node,
  statistics,
  points,
  scene,
  colorScale
) {
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
}

// Adjust this function to calculate the local density and draw circles accordingly
function visualizePoint(point, depth, localDensity, scene, color) {
  // Scale the radius based on the inverse of local density
  const radius = 0.05; /// Math.sqrt(localDensity); // Example scaling factor, adjust as necessary
  const segments = 8; // Higher for smoother circles

  const circleGeometry = new THREE.CircleGeometry(radius, segments);
  const circleMaterial = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
  });
  const circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);
  circleMesh.rotation.x = Math.PI / 2;

  circleMesh.position.set(point[0], depth, point[1]);
  scene.add(circleMesh);

  // Adding white circumference for visual clarity
  const edgesGeometry = new THREE.EdgesGeometry(circleMesh.geometry);
  const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  edges.rotation.x = Math.PI / 2;
  edges.position.set(point[0], depth, point[1]);
  scene.add(edges);
}

function plotAncestorConnection(points, statistics, node, scene, colorScale) {
  // Get the position of the ancestral node
  const nodePosition = new THREE.Vector3(
    node.layout.forceTrail.x,
    node.layout.forceTrail.hierarchyDepth,
    node.layout.forceTrail.z
  );

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
}

// Calculate local density based on the distance to nearest neighbors
function calculateLocalDensity(point, points, k = 5) {
  // Calculate distances to all other points
  const distances = points
    .map((p) => ({
      point: p,
      distance: Math.sqrt((p[0] - point[0]) ** 2 + (p[1] - point[1]) ** 2),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(1, k + 1); // Skip the first one (itself)

  // Average the distances of the k nearest neighbors
  const averageDistance =
    distances.reduce((acc, curr) => acc + curr.distance, 0) / k;
  return 1 / averageDistance; // Return inverse to represent density
}

export function createTrailTopologyMinimalSpanningTree(
  scene,
  tree,
  colorScale,
  statistics
) {
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
      nodeMesh.position.set(nodePosition.x, 0, nodePosition.z);
    } else {
      nodeMesh.position.set(nodePosition.x, nodePosition.y, nodePosition.z);
    }

    scene.add(nodeMesh);
    createSpanningMeshesForNode(node, scene, colorScale, statistics);
  });
}

export function createSpanningMeshesForNode(
  node,
  scene,
  colorScale,
  statistics
) {
  if (nodeHasGroupPoints(node)) {
    const points = createFilteredPointsRaw(node);
    const localDensities = points.map((point) =>
      calculateLocalDensity(point, points)
    );

    // Draw each point with the calculated local density
    points.forEach((point, index) => {
      /*
      function visualizePoint(
        point,
        depth,
        localDensity,
        scene,
        color,
        statistics,
        node
      )
      */

      visualizePoint(
        point,
        0,
        localDensities,
        scene,
        colorScale(node.data.values.group)
      );
    });

    const delaunay = d3.Delaunay.from(
      points.map((point) => [point[0], point[1]])
    );

    let graph = createGraphFromTriangulation(delaunay, points);
    const mst = kruskalsAlgorithm(graph, points);
    plotMinimalSpanningTree(mst, node, statistics, points, scene, colorScale);
    plotAncestorConnection(points, statistics, node, scene, colorScale);
  }
}

/* 
  NOT MINIMAL SPANNING TREE 
*/
// Main function to create the trail topology using concave hulls
export function createTrailTopologyWithConcaveHulls(
  scene,
  tree,
  colorScale,
  statistics
) {
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
      nodeMesh.position.set(nodePosition.x, 0, nodePosition.z);
    } else {
      nodeMesh.position.set(nodePosition.x, nodePosition.y, nodePosition.z);
    }

    if (nodeHasGroupPoints(node)) {
      const points = createFilteredPointsRaw(node);

      points.forEach((point, index) => {
        visualizePoint(
          point,
          0,
          2,
          scene,
          colorScale(node.data.values.group),
          statistics,
          node
        );
      });

      const hullPoints = hull(
        points.map((point) => [point[0], point[1]]),
        10
      );
      // Adjust concavity as needed
      plotConcaveHull(hullPoints, 0, node, statistics, scene, colorScale);
      connectConcaveHullToAncestor(
        hullPoints,
        0,
        statistics,
        node,
        scene,
        colorScale
      );
    }

    scene.add(nodeMesh);
  });
}

// Plot the concave hull using THREE.js
function plotConcaveHull(
  hullPoints,
  depth,
  node,
  statistics,
  scene,
  colorScale
) {
  const vertices = hullPoints.map(
    (point) => new THREE.Vector3(point[0], depth, point[1])
  );
  const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
  geometry.setIndex([...Array(vertices.length).keys(), 0]); // Create indices to form a closed loop
  const material = new THREE.LineBasicMaterial({
    color: colorScale(node.data.values.group),
  });
  const line = new THREE.LineLoop(geometry, material);
  scene.add(line);
}

// Connect the concave hull vertices to the ancestor node
function connectConcaveHullToAncestor(
  hullPoints,
  leaveDepth,
  statistics,
  node,
  scene,
  colorScale
) {
  const nodePosition = new THREE.Vector3(
    node.layout.forceTrail.x,
    node.layout.forceTrail.hierarchyDepth,
    node.layout.forceTrail.z
  );

  hullPoints.forEach((point) => {
    const pointGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(point[0], leaveDepth, point[1]),
      nodePosition,
    ]);

    const pointMaterial = new THREE.LineBasicMaterial({
      color: colorScale(node.data.values.group),
    });

    const pointLine = new THREE.Line(pointGeometry, pointMaterial);
    scene.add(pointLine);
  });
}
