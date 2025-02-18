import * as THREE from "three";
import {
  createNodeMaterial,
  createNodeGeometry,
  nodeHasGroupPoints,
  createFilteredPointsRaw,
} from "./forceTrailGraphs.js";

/* Delaunay Meshes */
export function createTrailDelaunayMeshesForTree(scene, tree, colorScale) {
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
    createDelaunayMeshesForNode(node, scene, colorScale);
  });
}

export function createDelaunayMeshesForNode(node, scene, colorScale) {
  if (nodeHasGroupPoints(node)) {
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

    // Draw lines for each edge in the Delaunay triangulation
    triangles.forEach((index, i) => {
      if (i % 3 === 0 && i + 2 < triangles.length) {
        drawDelaunayLines(
          points,
          triangles[i],
          triangles[i + 1],
          triangles[i + 2],
          scene,
          colorScale(node.data.values.group)
        );
      }
    });

    // Calculate centroid of all points
    const centroid = points.reduce(
      (acc, point) => {
        acc.x += point[0];
        acc.z += point[1];
        return acc;
      },
      { x: 0, z: 0, count: points.length }
    );

    centroid.x /= centroid.count;
    centroid.z /= centroid.count;

    // Connect the centroid to the parent node with a tube
    //connectCentroidToParent(centroid, nodePosition, scene, points.length, colorScale(node.data.values.group));

    // Connect each leaf to the parent node
    points.forEach((point) => {
      connectLeafToParent(
        point,
        nodePosition,
        scene,
        colorScale(node.data.values.group)
      );
      visualizePoint(point, scene, colorScale(node.data.values.group));
    });
  }
}

function drawDelaunayLines(points, a, b, c, scene, color) {
  const indices = [a, b, c, a]; // Close the loop for the triangle
  indices.reduce((prev, cur) => {
    if (prev !== null) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(points[prev][0], 0, points[prev][1]),
        new THREE.Vector3(points[cur][0], 0, points[cur][1]),
      ]);
      const material = new THREE.LineBasicMaterial({ color });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
    }
    return cur;
  }, null);
}

function connectCentroidToParent(
  centroid,
  parentPosition,
  scene,
  pointCount,
  color
) {
  const path = new THREE.LineCurve3(
    new THREE.Vector3(centroid.x, 0, centroid.z),
    parentPosition
  );
  const tubeGeometry = new THREE.TubeGeometry(
    path,
    64,
    0.01 * Math.sqrt(pointCount),
    8,
    false
  );
  const tubeMaterial = new THREE.MeshBasicMaterial({ color });
  const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
  scene.add(tube);
}

function connectLeafToParent(point, parentPosition, scene, color) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(point[0], 0, point[1]),
    parentPosition,
  ]);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
  });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}

function visualizePoint(point, scene, color) {
  const radius = 0.01;
  const segments = 32;
  const circleGeometry = new THREE.CircleGeometry(radius, segments);
  const circleMaterial = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
  });
  const circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);
  circleMesh.rotation.x = Math.PI / 2;
  circleMesh.position.set(point[0], 0, point[1]);
  scene.add(circleMesh);

  // Adding white circumference for visual clarity
  const edgesGeometry = new THREE.EdgesGeometry(circleMesh.geometry);
  const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  edges.rotation.x = Math.PI / 2;
  edges.position.set(point[0], 0, point[1]);
  scene.add(edges);
}
