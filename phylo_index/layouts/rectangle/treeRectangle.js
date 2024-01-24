import * as THREE from "three";
import WinBox from "https://unpkg.com/winbox@0.2.82/src/js/winbox.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { TAARenderPass } from "three/addons/postprocessing/TAARenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { initializeDimensionalityReductionPlot } from "../../dimensionalityReductionPlotter.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { Universe } from "../../Cosmos.js";
import constructTree from "../circular/TreeConstructor.js";
import TreeDisplay from "../../../static/js/TreeDisplay.js";
import initializeLeafColorMap from "../../optionHandler.js";
import { getData, openDatabase, deepCopyJSON } from "../../nebulaDB.js";
import { NURBSCurve } from "three/addons/curves/NURBSCurve.js";
import { NURBSSurface } from "three/addons/curves/NURBSSurface.js";

/**
 * Creates and adds links (as line meshes) to the scene.
 * @param {Object[]} links - Array of link objects containing source and target node objects.
 * @param {Object[]} leaves - Array of leaf node objects.
 * @param {THREE.Scene} scene - The Three.js scene to which the lines will be added.
 * @param {Object} tree - The tree object, containing properties like maxRadius.
 */
export function makeLinks(links, leaves, scene, tree, cosmos, universeId) {
  // Array to store line meshes
  let linkMeshArray = [];
  let treeUniverse = cosmos.getUniverseById(universeId);
  let universeHeight = cosmos
    .getUniverseById(universeId)
    .container.getBoundingClientRect().height;
  let maximumNodeDepth = Math.max(...leaves.map((node) => node.depth));

  // Function to create a line mesh
  function createLineMesh(source, target, index, linkMeshArray) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(
        source.x,
        source.y,
        0
        //source.depth * (universeHeight / maximumNodeDepth)
      ),

      new THREE.Vector3(
        target.x,
        target.y,
        0
        // target.depth * (universeHeight / maximumNodeDepth)
      ),
    ]);

    // Use a darker color for better visibility against a white background
    const material = new THREE.LineBasicMaterial({
      color: 0xa0a0a0, // Teenage Engineering-style grey
      transparent: true,
      opacity: 0.7,
    });

    const lineMesh = new THREE.Line(geometry, material);
    lineMesh.sourceNode = source;
    lineMesh.targetNode = target;
    lineMesh.name = `link-${index}`;
    lineMesh.isLink = true;
    linkMeshArray.push(lineMesh);
    scene.add(lineMesh);
  }

  // Create line meshes for links
  links.forEach((link, index) => {
    createLineMesh(link.source, link.target, index, linkMeshArray);
  });

  // Create line meshes for leaves
  leaves.forEach((leaf, index) => {
    const leafTarget = {
      x: leaf.angle, // Math.cos(leaf.angle) * tree.maxRadius,
      y: leaf.radius, //Math.sin(leaf.angle) * tree.maxRadius,
      depth: leaf.depth,
      data: leaf.data,
    };
    createLineMesh(leaf, leafTarget, links.length + index, linkMeshArray);
  });

  treeUniverse.addMeshesToContainer(linkMeshArray, "links");
}

export function makeBezierLinks(
  links,
  leaves,
  scene,
  tree,
  cosmos,
  universeId,
  colorScale
) {
  let hexDarkGrey = "#A0A0A0";
  const curveMaterial = new THREE.MeshBasicMaterial({
    color: hexDarkGrey,
    transparent: true,
    opacity: 0.5,
  });

  let maximumNodeDepth = Math.max(...leaves.map((node) => node.depth));
  let universeHeight = cosmos
    .getUniverseById(universeId)
    .container.getBoundingClientRect().height;

  // Calculate the number of leaves each link leads to
  const leafCountPerLink = new Map();
  leaves.forEach((leaf) => {
    leafCountPerLink.set(
      leaf.parentId,
      (leafCountPerLink.get(leaf.parentId) || 0) + 1
    );
  });

  links.forEach((link) => {
    if (link.target.nodeMetric) {
      let startPoint = new THREE.Vector3(
        link.target.x,
        link.target.y,
        link.target.depth * (universeHeight / maximumNodeDepth)
      );
      let endPoint = new THREE.Vector3(
        tree.x,
        tree.y,
        tree.depth * (universeHeight / maximumNodeDepth)
      );
      let hexColor = colorScale(link.target.nodeMetric.group);

      // startPoint = new THREE.Vector3(link.source.x, link.source.y, link.source.depth * (universeHeight / maximumNodeDepth));
      // endPoint = new THREE.Vector3(link.target.x, link.target.y, link.target.depth * (universeHeight / maximumNodeDepth));
      //const controlPoint1 = new THREE.Vector3((startPoint.x + endPoint.x) / 2, startPoint.y, (startPoint.z + endPoint.z) / 2);
      //const controlPoint2 = new THREE.Vector3((startPoint.x + endPoint.x) / 2, endPoint.y, (startPoint.z + endPoint.z) / 2);

      let curveMaterial = new THREE.MeshBasicMaterial({
        color: hexColor,
        transparent: true,
        opacity: 0.5,
      });

      let from_target_to_root = link.target.path(tree);
      let from_target_to_root_length = from_target_to_root.length;

      const controlPoint1 = new THREE.Vector3(
        from_target_to_root[from_target_to_root_length - 2].x,
        from_target_to_root[from_target_to_root_length - 2].y,
        from_target_to_root[from_target_to_root_length - 2].depth *
          (universeHeight / maximumNodeDepth)
      );

      const controlPoint2 = new THREE.Vector3(
        from_target_to_root[from_target_to_root_length - 3].x,
        from_target_to_root[from_target_to_root_length - 3].y,
        from_target_to_root[from_target_to_root_length - 3].depth *
          (universeHeight / maximumNodeDepth)
      );

      //let controlPoints = [];
      //from_target_to_root.forEach((node, index) => {
      //    controlPoints.push(new THREE.Vector3(
      //        node.x,
      //        node.y,
      //        node.depth * (universeHeight / maximumNodeDepth)
      //    ));
      //});

      const curve = new THREE.QuadraticBezierCurve3(
        startPoint,
        controlPoint2,
        controlPoint1,
        endPoint
      );
      const leavesCount = leafCountPerLink.get(link.source.id) || 0;
      const tubeRadius = Math.max(0.1, Math.min(leavesCount * 10, 1)); // Adjust the scaling factor and max radius as needed
      const tubeGeometry = new THREE.TubeGeometry(
        curve,
        100,
        tubeRadius,
        8,
        false
      );
      const curveObject = new THREE.Mesh(tubeGeometry, curveMaterial);

      //curveMaterial.color = hexColor;

      scene.add(curveObject);
    }
  });

  leaves.forEach((leaf) => {
    if (!leaf.nodeMetric) {
      let hexColor = colorScale(leaf.data.values.group);

      let curveMaterial = new THREE.MeshBasicMaterial({
        color: hexColor,
        transparent: true,
        opacity: 0.5,
      });

      //const startPoint = new THREE.Vector3(leaf.x, leaf.y, leaf.depth * (universeHeight / maximumNodeDepth));
      const startPoint = new THREE.Vector3(
        Math.cos(leaf.angle) * tree.maxRadius,
        Math.sin(leaf.angle) * tree.maxRadius,
        leaf.depth * (universeHeight / maximumNodeDepth)
      );
      let endPoint = new THREE.Vector3(
        tree.x,
        tree.y,
        tree.depth * (universeHeight / maximumNodeDepth)
      );

      //const controlPoint1 = new THREE.Vector3((startPoint.x + endPoint.x) / 2, startPoint.y, (startPoint.z + endPoint.z) / 2);
      //const controlPoint2 = new THREE.Vector3((startPoint.x + endPoint.x) / 2, endPoint.y, (startPoint.z + endPoint.z) / 2);
      let from_target_to_root = leaf.path(tree);
      let from_target_to_root_length = from_target_to_root.length;

      const controlPoint1 = new THREE.Vector3(
        from_target_to_root[from_target_to_root_length - 2].x,
        from_target_to_root[from_target_to_root_length - 2].y,
        from_target_to_root[from_target_to_root_length - 2].depth *
          (universeHeight / maximumNodeDepth)
      );

      const controlPoint2 = new THREE.Vector3(
        from_target_to_root[from_target_to_root_length - 3].x,
        from_target_to_root[from_target_to_root_length - 3].y,
        from_target_to_root[from_target_to_root_length - 3].depth *
          (universeHeight / maximumNodeDepth)
      );

      let controlPoints = [];

      from_target_to_root.forEach((node, index) => {
        controlPoints.push(
          new THREE.Vector3(
            node.x,
            node.y,
            node.depth * (universeHeight / maximumNodeDepth)
          )
        );
      });

      const curve = new THREE.QuadraticBezierCurve3(
        startPoint,
        controlPoint2,
        controlPoint1,
        endPoint
      );
      const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.8, 8, false);
      const curveObject = new THREE.Mesh(tubeGeometry, curveMaterial);

      scene.add(curveObject);
    }
  });
}

export function makeNodes(nodes, scene, tree, cosmos, colorScale, universeId) {
  // Initialize variables
  let nodesMeshArray = [];
  let universeHeight = cosmos
    .getUniverseById(universeId)
    .container.getBoundingClientRect().height;
  let maximumNodeDepth = Math.max(...nodes.map((node) => node.depth));
  let geometry = new THREE.SphereGeometry(8, 32, 16);

  // Iterate over each node in the nodes array
  for (const node of nodes) {
    // Set default color for nodes
    let hexColor = "#e5d0ff";
    if (colorScale && !node.children) {
      hexColor = colorScale(node.data.values.group);
    }

    // Set grey color for nodes with children
    let hexColorGrey = "#A0A0A0";

    // Create material for each node
    let material = new THREE.MeshStandardMaterial({
      color: node.children ? hexColorGrey : hexColor, // Grey for nodes with children, else default color
      alphaHash: true,
      opacity: 1,
    });

    let mesh;

    // Set mesh position based on whether node has children
    if (node.children) {
      let selectedGeometry = new THREE.SphereGeometry(2, 48, 24); // Larger geometry for nodes with children
      // Create an individual mesh for each node
      mesh = new THREE.Mesh(selectedGeometry, material);

      // Set position for nodes with children
      mesh.position.set(
        node.x,
        node.y,
        0
        //node.depth * (universeHeight / maximumNodeDepth)
      );
    } else {
      // Create an individual mesh for each node
      mesh = new THREE.Mesh(geometry, material);

      // Set position for leaf nodes
      mesh.position.set(
        //(tree.maxRadius) * Math.cos(node.angle),
        //(tree.maxRadius) * Math.sin(node.angle),
        node.x,
        node.y,
        0
        //node.depth * (universeHeight / maximumNodeDepth)
      );
    }

    // Assign a name and node data to the mesh
    node.meshId = mesh.id;
    mesh.name = nodes.indexOf(node);
    mesh.node = node;

    // Add the mesh to the array and the scene
    nodesMeshArray.push(mesh);
    scene.add(mesh);
  }

  // Add meshes to the cosmos container
  cosmos
    .getUniverseById(universeId)
    .addMeshesToContainer(nodesMeshArray, "nodes");
}

export function makeCollapsedNodes(
  nodes,
  scene,
  tree,
  cosmos,
  colorScale,
  universeId
) {
  // Initialize a 4x4 transformation matrix
  let nodesMeshArray = [];
  let universeHeight = cosmos
    .getUniverseById(universeId)
    .container.getBoundingClientRect().height;
  let maximumNodeDepth = Math.max(...nodes.map((node) => node.depth));
  const sphereGeometry = new THREE.SphereGeometry(1, 32, 16);

  // Iterate over each node in the nodes array using for...of
  for (const node of nodes) {
    // Create a unique material for each node, with its own color
    let hexColor = "#e5d0ff";

    if (colorScale && !node.children) {
      hexColor = colorScale(node.data.values.group);
    } else if (colorScale && node.nodeMetric) {
      hexColor = colorScale(node.nodeMetric.group);
    }

    let material = new THREE.MeshStandardMaterial({
      color: node.children ? 0x0a84ff : hexColor, // White for internal nodes, random for leaves
      alphaHash: true,
      opacity: 1,
    });

    // Create an individual mesh for each node
    let mesh = new THREE.Mesh(sphereGeometry, material);

    if (node.nodeMetric) {
      // Define points
      const point1 = new THREE.Vector3(
        node.x,
        node.y,
        node.depth * (universeHeight / maximumNodeDepth)
      );

      const point2 = new THREE.Vector3(
        Math.cos(node.nodeMetric.minLeafAngle) * tree.maxRadius,
        Math.sin(node.nodeMetric.minLeafAngle) * tree.maxRadius,
        node.nodeMetric.leafDepth * (universeHeight / maximumNodeDepth)
      );

      //const point12 = new THREE.Vector3(
      //    (node.x + Math.cos(node.nodeMetric.minLeafAngle) * tree.maxRadius) / 2,
      //    (node.y + Math.sin(node.nodeMetric.minLeafAngle) * tree.maxRadius) / 2,
      //    ((node.depth) * (universeHeight / maximumNodeDepth) + (node.nodeMetric.leafDepth * (universeHeight / maximumNodeDepth))) / 2
      //);

      const point3 = new THREE.Vector3(
        Math.cos(node.nodeMetric.maxLeafAngle) * tree.maxRadius,
        Math.sin(node.nodeMetric.maxLeafAngle) * tree.maxRadius,
        node.nodeMetric.leafDepth * (universeHeight / maximumNodeDepth)
      );

      //const point23 = new THREE.Vector3(
      //    (node.x + Math.cos(node.nodeMetric.maxLeafAngle) * tree.maxRadius) / 2,
      //    (node.y + Math.sin(node.nodeMetric.maxLeafAngle) * tree.maxRadius) / 2,
      //    ((node.depth) * (universeHeight / maximumNodeDepth) + (node.nodeMetric.leafDepth * (universeHeight / maximumNodeDepth))) / 2
      //);

      // Create the geometry
      const geometry = new THREE.BufferGeometry().setFromPoints([
        point1,
        point2,
        point3,
      ]);
      geometry.setIndex([0, 1, 2]); // Define the face using the three points

      // Define normals for the face (required for lighting)
      geometry.computeVertexNormals();

      // Material
      const material = new THREE.MeshBasicMaterial({
        color: colorScale(node.nodeMetric.group),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });

      // Create the mesh
      const triangleMesh = new THREE.Mesh(geometry, material);
      scene.add(triangleMesh);
    }
    //else if (node.children) {
    //    mesh.position.set(
    //        node.x,
    //        node.y,
    //        (node.depth) * (universeHeight / maximumNodeDepth)
    //    );
    //mesh.geometry = cubeGeometry;
    //}
    else if (!node.children) {
      // Calculate and set the position based on the angle and the tree's maximum radius
      mesh.position.set(
        tree.maxRadius * Math.cos(node.angle),
        tree.maxRadius * Math.sin(node.angle),
        node.depth * (universeHeight / maximumNodeDepth)
      );
      scene.add(mesh);
    }
    // Assign a name (index) and the node data to the mesh for later reference
    node.meshId = mesh.id;
    mesh.name = nodes.indexOf(node);
    mesh.node = node;

    // Add the mesh to the array of node meshes for later access
    nodesMeshArray.push(mesh);
  }

  cosmos
    .getUniverseById(universeId)
    .addMeshesToContainer(nodesMeshArray, "nodes");
}

export function createAndAddCollapsedTreeElementsToScene(
  tree,
  universeId,
  cosmos,
  colorScale
) {
  let links = tree.links();
  let leaves = tree.leaves();
  let nodes = tree.descendants();
  let universe = cosmos.getUniverseById(universeId);
  makeBezierLinks(
    links,
    leaves,
    universe.scene,
    tree,
    cosmos,
    universeId,
    colorScale
  );
  makeCollapsedNodes(
    nodes,
    universe.scene,
    tree,
    cosmos,
    colorScale,
    universeId
  );
}

export function createAndAddTreeElementsToScene(
  tree,
  cosmos,
  universeId,
  colorScale
) {
  let links = tree.links();
  let leaves = tree.leaves();
  let nodes = tree.descendants();
  let universe = cosmos.getUniverseById(universeId);
  makeLinks(links, leaves, universe.scene, tree, cosmos, universeId);
  makeNodes(nodes, universe.scene, tree, cosmos, colorScale, universeId);
}

export function createHelperGrid(scene, size, divisions) {
  const gridHelper = new THREE.GridHelper(size, divisions);
  scene.add(gridHelper);
}

// Creates and configures the camera
export function createCamera(width, height) {
  const camera = new THREE.PerspectiveCamera(1200, width / height, 1, 4000);
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
export function setupWinBox(onResizeCallback) {
  return new WinBox({
    left: "50%",
    max: true,
    //onresize: onResizeCallback,
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
  // Create an array to store border meshes so we can remove them later if needed
  const borderMeshes = [];

  leavesMeshArray.forEach((leaveMesh) => {
    let hexColor = 0x0a84ff;
    if (colorScale) {
      hexColor = colorScale(leaveMesh.leave.data.values.group);
      hexColor = hexColor.replace("#", "0x");
    }
    leaveMesh.material.color.setHex(hexColor);

    // Remove existing border if it exists
    if (leaveMesh.borderMesh) {
      leaveMesh.borderMesh.geometry.dispose();
      leaveMesh.borderMesh.material.dispose();
      scene.remove(leaveMesh.borderMesh);
      delete leaveMesh.borderMesh;
    }
  });

  nodes.forEach((descendant) => {
    leavesMeshArray.forEach((leaveMesh) => {
      if (leaveMesh.leave.uid === descendant.uid) {
        let hexBlack = 0x000000;
        // leaveMesh.material.color.setHex(hexWhite); // Set to red

        // Create a border mesh
        const scale = 1.3; // This scale factor controls the size of the border

        const borderGeometry = leaveMesh.geometry
          .clone()
          .scale(scale, scale, scale);

        const borderMaterial = new THREE.MeshBasicMaterial({
          color: hexBlack, // Border color
          side: THREE.BackSide, // Render the inside faces of the geometry
        });

        const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);

        // Store the border mesh within the leaveMesh for easy access & cleanup
        leaveMesh.borderMesh = borderMesh;

        // Add the border mesh to the scene just behind the red mesh
        borderMesh.position.copy(leaveMesh.position);
        borderMesh.rotation.copy(leaveMesh.rotation);
        borderMesh.scale.copy(leaveMesh.scale);

        scene.add(borderMesh);
        borderMeshes.push(borderMesh); // Keep track of border meshes
      }
    });
  });

  // Return border meshes in case we need to reference them later
  return borderMeshes;
}

export function highlightNodes(nodes, nodesMeshArray, colorScale) {
  let whiteHex = 0x0a84ff;

  nodesMeshArray.forEach((nodeMesh) => {
    nodeMesh.material.color.setHex(whiteHex); // Set to red

    if (!nodeMesh.node.children) {
      if (colorScale) {
        let hexColor = colorScale(nodeMesh.node.data.values.group);
        hexColor = hexColor.replace("#", "0x");
        nodeMesh.material.color.setHex(hexColor);
      }
    }
  });

  nodes.forEach((descendant) => {
    nodesMeshArray.forEach((nodeMesh) => {
      if (nodeMesh.node.uid === descendant.uid) {
        nodeMesh.material.color.setHex(0xff0000); // Set to red
      }
    });
  });
}

export function initializeNodeSelectionAndHighlighting(
  cosmos,
  colorScale,
  universeId
) {
  let rayCaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2();
  let treeUniverse = cosmos.getUniverseById(universeId);
  let container = treeUniverse.container;
  let camera = treeUniverse.camera;
  let nodesMeshArray = treeUniverse.getMeshesFromContainer("nodes");

  container.addEventListener(
    "click",
    (event) => {
      let cachedClientRect = container.getBoundingClientRect();

      mouse.x =
        ((event.clientX - cachedClientRect.left) / cachedClientRect.width) * 2 -
        1;
      mouse.y =
        -((event.clientY - cachedClientRect.top) / cachedClientRect.height) *
          2 +
        1;

      rayCaster.setFromCamera(mouse, camera);

      const intersects = rayCaster.intersectObjects(nodesMeshArray);

      if (intersects.length > 0) {
        handleNodeClick(intersects[0].object, cosmos, colorScale);
        guiNodeEvent(event, intersects[0].object.node, treeUniverse);
      }
    },
    false
  );

  function handleNodeClick(clickedNode, cosmos, colorScale) {
    let nodes = clickedNode.node.descendants();

    if (!cosmos.checkIfUniverseExists("dimensionality-reduction-plot")) {
      initializeDimensionalityReductionPlot();
      highlightLeaves(
        nodes,
        cosmos.getUniverseById("dimensionality-reduction-plot").getMeshes(),
        colorScale
      );
    } else {
      highlightLeaves(
        nodes,
        cosmos.getUniverseById("dimensionality-reduction-plot").getMeshes(),
        colorScale
      );
    }
    highlightNodes(nodes, nodesMeshArray, colorScale);
  }
}

function getSubtree(root, uid) {
  if (root.uid === uid) {
    return deepCopyJSON(root);
  }

  if (root.children) {
    for (const child of root.children) {
      const subtree = getSubtree(child, uid);
      if (subtree) {
        return subtree; // This will return from getSubtree, not just the for loop
      }
    }
  }
}

function assignUniqueIds(root) {
  let uidCounter = 0;

  function traverse(node) {
    // Assign a unique identifier to the current node
    node.uid = uidCounter++;

    // If the node has children, recursively assign UIDs to them
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  traverse(root);
}

function guiNodeEvent(event, node, treeUniverse) {
  let container = treeUniverse.container;
  const gui = new GUI();
  container.appendChild(gui.domElement);

  gui
    .add(
      {
        button: async () => {
          // Open the IndexedDB database
          const db = await openDatabase();
          // Try to get the tree data from IndexedDB
          let fullTreeData = deepCopyJSON(
            await getData(db, "random_generated_tree")
          );

          assignUniqueIds(fullTreeData);

          let subTree = getSubtree(fullTreeData, node.uid);

          subTree = constructTree(subTree, false, "application-container");

          let leafColorMap = initializeLeafColorMap(subTree.leaves());

          let treeDisplay = new TreeDisplay(
            subTree,
            subTree.maxRadius,
            "application"
          );

          treeDisplay.updateDisplay({
            leaveColorMap: leafColorMap,
          });
        },
      },
      "button"
    )
    .name("Show Subtree");

  let obj = {
    add: async () => {
      const db = await openDatabase();

      let multipleSequenceAlignmentUniverse = new WinBox({
        title: "Multiple Sequence Alignment",
        width: "75%",
        height: "75%",
      });

      let tableContainer = document.createElement("div");
      tableContainer.id = "msa-alignment-universe";
      multipleSequenceAlignmentUniverse.body.appendChild(tableContainer);

      // Try to get the tree data from IndexedDB
      let multipleSequenceAlignment = await getData(
        db,
        "random_generated_tree_msa"
      );

      const filteredList = multipleSequenceAlignment.filter((obj) => {
        return node
          .descendants()
          .some((descendant) => descendant.data.name === obj.id);
      });

      let table = new Tabulator("#msa-alignment-universe", {
        data: multipleSequenceAlignment,
        renderHorizontal: "virtual", //enable horizontal virtual DOM
        columns: [
          { title: "id", field: "id" },
          { title: "Sequence", field: "sequence" },
        ],
      });
    },
  };

  gui.add(obj, "add").name("Show MSA");

  let detailFunction = {
    add: async () => {
      // Open the IndexedDB database
      const db = await openDatabase();
      // Try to get the tree data from IndexedDB
      let fullTreeData = deepCopyJSON(
        await getData(db, "random_generated_tree")
      );
      assignUniqueIds(fullTreeData);
      let subTree = getSubtree(fullTreeData, node.uid);
      let valueWindow = new WinBox();
    },
  };

  gui.add(detailFunction, "add").name("Show Details");
}

function displayHighestValues(highestValues) {
  for (const [key, info] of Object.entries(highestValues)) {
    console.log(`Key: ${key}, Highest Value: ${info.value}, Node:`, info.node);
  }
}

async function initTreeDimensionGUI(cosmos) {
  let gui = new GUI();

  // Open the IndexedDB database
  const db = await openDatabase();
  let tree = await getData(db, "random_generated_tree");
  let values = tree.values;

  tree = constructTree(tree, false, "application-container");

  let nodes = tree.descendants();

  // Scaling factors for x, y, and z coordinates
  let scaleFactors = { x: 1, y: 1, z: 1 };

  // Function to update node and link positions based on scaling factors
  function updatePositions() {
    let nodesMeshArray = cosmos
      .getUniverseById("tree-plot")
      .getMeshesFromContainer("nodes");
    let linksMeshArray = cosmos
      .getUniverseById("tree-plot")
      .getMeshesFromContainer("links");

    nodesMeshArray.forEach((mesh) => {
      if (mesh.node.children) {
        mesh.position.x = mesh.node.x * scaleFactors.x;
        mesh.position.y = mesh.node.y * scaleFactors.y;
        mesh.position.z *= scaleFactors.z;
      } else {
        mesh.position.x =
          tree.maxRadius * Math.cos(mesh.node.angle) * scaleFactors.x;
        mesh.position.y =
          tree.maxRadius * Math.sin(mesh.node.angle) * scaleFactors.y;
        mesh.position.z *= scaleFactors.z;
      }
    });

    linksMeshArray.forEach((mesh) => {
      let geometry = mesh.geometry;
      if (geometry && geometry.attributes.position) {
        let positions = geometry.attributes.position.array;
        positions[0] = mesh.sourceNode.x * scaleFactors.x; // Start x
        positions[1] = mesh.sourceNode.y * scaleFactors.y; // Start y
        positions[2] *= scaleFactors.z; // Start z
        positions[3] = mesh.targetNode.x * scaleFactors.x; // End x
        positions[4] = mesh.targetNode.y * scaleFactors.y; // End y
        positions[5] *= scaleFactors.z; // End z
        geometry.attributes.position.needsUpdate = true;
      }
    });
  }

  // Add sliders to GUI for scaling
  gui.add(scaleFactors, "x", 0.1, 5).name("Scale X").onChange(updatePositions);
  gui.add(scaleFactors, "y", 0.1, 5).name("Scale Y").onChange(updatePositions);
  gui.add(scaleFactors, "z", 0.1, 5).name("Scale Z").onChange(updatePositions);

  // Function to handle button pressed action
  function onButtonPressed(key) {
    let nodesMeshArray = cosmos
      .getUniverseById("tree-plot")
      .getMeshesFromContainer("nodes");
    let linksMeshArray = cosmos
      .getUniverseById("tree-plot")
      .getMeshesFromContainer("links");

    let specificKey = key;
    let highestValueForKey = findHighestValues(nodes, specificKey);
    displayHighestValues(highestValueForKey);

    let height = cosmos
      .getUniverseById("tree-plot")
      .container.getBoundingClientRect().height;

    nodesMeshArray.forEach((mesh) => {
      mesh.position.z =
        mesh.node.data.values[key] * (height / highestValueForKey[key].value);
    });

    linksMeshArray.forEach((mesh) => {
      let geometry = mesh.geometry;
      if (geometry && geometry.attributes.position) {
        let positions = geometry.attributes.position.array;
        positions[2] =
          mesh.sourceNode.data.values[key] *
          (height / highestValueForKey[key].value); // New start z-coordinate
        positions[5] =
          mesh.targetNode.data.values[key] *
          (height / highestValueForKey[key].value); // New end z-coordinate
        geometry.attributes.position.needsUpdate = true;
      }
    });
  }

  // Filter keys to include only those with numeric values
  const numericValueKeys = Object.keys(values).filter(
    (key) => !isNaN(parseFloat(values[key])) && isFinite(values[key])
  );

  // Add radio buttons to GUI for choosing the key for the Z-axis
  let currentZProperty = { key: "depth" }; // Default property for Z-axis
  gui
    .add(currentZProperty, "key", numericValueKeys)
    .name("Z-Axis Property")
    .onChange(onButtonPressed);
  return gui;
}

export function initializeRectangleTreeDimensionPlot(
  cosmos,
  treeUniverseId,
  direction
) {
  let width = window.innerWidth;
  let height = window.innerHeight;

  // camera
  let camera = createCamera(width, height);
  // renderer
  let renderer = createRenderer(width, height);
  // scene
  let scene = new THREE.Scene();
  // listeners

  let winBoxOptions = {
    width: "100%",
    //'height': '100%',
    //'right': "50%",
    // 'max': true,
    onresize: function (width, height) {
      // Update camera and renderer on window resize
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    },
    onfullscreen: function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    },
  };

  if (direction === "left") {
    winBoxOptions.left = "50%";
  } else {
    winBoxOptions.right = "50%";
  }

  let treeDimensionBox = new WinBox(winBoxOptions);

  configureLightingAndReflections(renderer, scene);
  // controls
  let controls = new OrbitControls(camera, renderer.domElement);
  let composer = new EffectComposer(renderer);
  configurePostProcessing(composer, scene, camera);

  let container = treeDimensionBox.body;
  container.appendChild(renderer.domElement);
  let gui = "";
  cosmos.registerUniverse(
    treeUniverseId,
    new Universe(camera, renderer, container, controls, scene, gui, window)
  );

  initTreeDimensionGUI(cosmos);
  scene.background = new THREE.Color(0xffffff); // Set to white color
  // camera, renderer, container, controller, scene
}

function findHighestValues(nodes, specificKey = null) {
  let highestValues = {};

  nodes.forEach((node) => {
    if (node.data && node.data.values) {
      Object.entries(node.data.values).forEach(([key, value]) => {
        if (specificKey !== null && key !== specificKey) {
          return; // Skip keys that don't match the specificKey
        }

        if (typeof value === "number") {
          if (!highestValues[key]) {
            highestValues[key] = { value: -Infinity, node: null };
          }
          if (value > highestValues[key].value) {
            highestValues[key] = { value, node };
          }
        }
      });
    }
  });

  // If a specific key is provided, return only the result for that key
  return specificKey
    ? { [specificKey]: highestValues[specificKey] }
    : highestValues;
}
