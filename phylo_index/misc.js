export function makeSummarizedLinks(links, leaves, scene, tree, cosmos, colorScale) {
    // Array to store line meshes
    let linkMeshArray = [];
    let treeUniverse = cosmos.getUniverseById('tree-plot');

    let universeHeight = cosmos.getUniverseById('tree-plot').container.getBoundingClientRect().height;
    let maximumNodeDepth = Math.max(...leaves.map(node => node.depth));

    // Function to create a line mesh
    function createLineMesh(source, target, index, linkMeshArray) {

        console.log("Source", source);
        console.log("Target", target);

        console.log(maximumNodeDepth, index)
        console.log(source.x, source.y, source.depth * (universeHeight / maximumNodeDepth))
        console.log(target.x, target.y, target.depth * (universeHeight / maximumNodeDepth))

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(source.x, source.y, source.depth * (universeHeight / maximumNodeDepth)),
            new THREE.Vector3(target.x, target.y, target.depth * (universeHeight / maximumNodeDepth))
        ]);

        // Use a darker color for better visibility against a white background
        let hexOrange = 0xffa500;
        const material = new THREE.LineBasicMaterial({
            color: hexOrange, // Teenage Engineering-style grey
            transparent: true,
            opacity: 1,
        });

        const lineMesh = new THREE.Line(geometry, material);
        lineMesh.sourceNode = source;
        lineMesh.targetNode = target;
        linkMeshArray.push(lineMesh);
        scene.add(lineMesh);
    }

    function createParachuteMesh(source, target, index, linkMeshArray) {
        if (source.summarized_groups) {
            // console.log("Source", source.summarized_groups);

            const hexOrange = 0xffa500;
            const material = new THREE.MeshBasicMaterial({
                color: hexOrange,
                side: THREE.DoubleSide, // Render both sides of the triangle
                transparent: true,
                opacity: 0.5,
            });


            Object.values(source.summarized_groups).forEach(group => {

                if (group.maxAngle !== null && group.minAngle !== null && group.maxAngle !== -Infinity && group.minAngle !== Infinity) {

                    if (group.maxAngle !== group.minAngle) {

                        let groupColor = "#e5d0ff";

                        // Define the vertices of the triangle
                        const point1 = new THREE.Vector3(source.x, source.y, source.depth * (universeHeight / maximumNodeDepth));
                        const point2 = new THREE.Vector3(Math.cos(group.minAngle) * tree.maxRadius, Math.sin(group.minAngle) * tree.maxRadius, group.depth * (universeHeight / maximumNodeDepth));
                        const point3 = new THREE.Vector3(Math.cos(group.maxAngle) * tree.maxRadius, Math.sin(group.minAngle) * tree.maxRadius, group.depth * (universeHeight / maximumNodeDepth));

                        // Create the geometry and define the vertices
                        const geometry = new THREE.BufferGeometry();
                        const vertices = new Float32Array([
                            point1.x, point1.y, point1.z,
                            point2.x, point2.y, point2.z,
                            point3.x, point3.y, point3.z,
                        ]);
                        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

                        // Create the mesh
                        const triangleMesh = new THREE.Mesh(geometry, material);

                        scene.add(triangleMesh);
                        linkMeshArray.push(triangleMesh);
                    } else {
                        const geometry = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(source.x, source.y, source.depth * (universeHeight / maximumNodeDepth)),
                            new THREE.Vector3(Math.cos(group.maxAngle) * tree.maxRadius, Math.sin(group.minAngle) * tree.maxRadius, target.depth * (universeHeight / maximumNodeDepth))
                        ]);

                        // Use a darker color for better visibility against a white background
                        const material = new THREE.LineBasicMaterial({
                            color: 0xA0A0A0, // Teenage Engineering-style grey
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

                }


            });
        }
    }


    let nodes = tree.descendants();
    nodes.forEach((leaf, index) => {
        createParachuteMesh(leaf, leaf, index, linkMeshArray);
    })

    links.forEach((link, index) => {
        if (link.source.summarized_groups) {
            createParachuteMesh(link.source, link.target, index, linkMeshArray);
        }
    });


    // let index = 0;
    // tree.eachAfter(node => {
    //     index++;
    //     if (node.summarized_groups) {
    //         createLineMesh(node.nextNodeWithGroup ,node , index, linkMeshArray);
    //     }
    // });

    // Create line meshes for links
    // links.forEach((link, index) => {
    //     if (link.source.summarized_groups) {
    //         createLineMesh(link.source, link.source.summarized_groups, index, linkMeshArray);
    //     }
    // });

    // Create line meshes for leaves
    //leaves.forEach((leaf, index) => {
    //    const leafTarget = {
    //        x: Math.cos(leaf.angle) * tree.maxRadius,
    //        y: Math.sin(leaf.angle) * tree.maxRadius,
    //        depth: leaf.depth,
    //        data: leaf.data
    //    };
    //    createLineMesh(leaf, leafTarget, links.length + index, linkMeshArray);
    //});



    treeUniverse.addMeshesToContainer(linkMeshArray, 'links');

}

export function makeCollapsedTree(links, leaves, scene, tree, cosmos, colorScale, universeId) {
    // Array to store line meshes
    let linkMeshArray = [];
    let treeUniverse = cosmos.getUniverseById(universeId);
    let universeHeight = cosmos.getUniverseById(universeId).container.getBoundingClientRect().height;
    let maximumNodeDepth = Math.max(...leaves.map(node => node.depth));

    // Function to create a line mesh
    function createLineMesh(source, target, index, linkMeshArray) {

        if (target.node_metric) {
            console.log("Source", source);
            console.log("Target", target);
            console.log(maximumNodeDepth, index)
            console.log(source.x, source.y, source.depth * (universeHeight / maximumNodeDepth))
            console.log(target.x, target.y, target.depth * (universeHeight / maximumNodeDepth))

            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(source.x, source.y, source.depth * (universeHeight / maximumNodeDepth)),
                new THREE.Vector3(target.x, target.y, target.depth * (universeHeight / maximumNodeDepth))
            ]);
            //
            //// Use a darker color for better visibility against a white background
            let hexOrange = 0xffa500;
            const material = new THREE.LineBasicMaterial({
                color: hexOrange, // Teenage Engineering-style grey
                transparent: true,
                opacity: 1,
            });
            //
            const lineMesh = new THREE.Line(geometry, material);
            lineMesh.sourceNode = source;
            lineMesh.targetNode = target;
            linkMeshArray.push(lineMesh);
            scene.add(lineMesh);

        }

    }

    function createParachuteMesh(source, target, index, linkMeshArray) {
        if (source.summarized_groups) {


            const hexOrange = 0xffa500;
            const material = new THREE.MeshBasicMaterial({
                color: hexOrange,
                side: THREE.DoubleSide, // Render both sides of the triangle
                transparent: true,
                opacity: 0.5,
            });


            Object.values(source.summarized_groups).forEach(group => {

                if (group.maxAngle !== null && group.minAngle !== null && group.maxAngle !== -Infinity && group.minAngle !== Infinity) {

                    if (group.maxAngle !== group.minAngle) {

                        let groupColor = "#e5d0ff";

                        // Define the vertices of the triangle
                        const point1 = new THREE.Vector3(source.x, source.y, source.depth * (universeHeight / maximumNodeDepth));
                        const point2 = new THREE.Vector3(Math.cos(group.minAngle) * tree.maxRadius, Math.sin(group.minAngle) * tree.maxRadius, group.depth * (universeHeight / maximumNodeDepth));
                        const point3 = new THREE.Vector3(Math.cos(group.maxAngle) * tree.maxRadius, Math.sin(group.minAngle) * tree.maxRadius, group.depth * (universeHeight / maximumNodeDepth));

                        // Create the geometry and define the vertices
                        const geometry = new THREE.BufferGeometry();
                        const vertices = new Float32Array([
                            point1.x, point1.y, point1.z,
                            point2.x, point2.y, point2.z,
                            point3.x, point3.y, point3.z,
                        ]);
                        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

                        // Create the mesh
                        const triangleMesh = new THREE.Mesh(geometry, material);

                        scene.add(triangleMesh);
                        linkMeshArray.push(triangleMesh);
                    } else {
                        const geometry = new THREE.BufferGeometry().setFromPoints([
                            new THREE.Vector3(source.x, source.y, source.depth * (universeHeight / maximumNodeDepth)),
                            new THREE.Vector3(Math.cos(group.maxAngle) * tree.maxRadius, Math.sin(group.minAngle) * tree.maxRadius, target.depth * (universeHeight / maximumNodeDepth))
                        ]);

                        // Use a darker color for better visibility against a white background
                        const material = new THREE.LineBasicMaterial({
                            color: 0xA0A0A0, // Teenage Engineering-style grey
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

                }


            });
        }
    }




    //let nodes = tree.descendants();
    //nodes.forEach((leaf, index) => {
    //    createParachuteMesh(leaf, leaf, index, linkMeshArray);
    //})
    //links.forEach((link, index) => {
    //    if (link.source.summarized_groups) {
    //        createParachuteMesh(link.source, link.target, index, linkMeshArray);
    //    }
    //});
    // let index = 0;
    // tree.eachAfter(node => {
    //     index++;
    //     if (node.summarized_groups) {
    //         createLineMesh(node.nextNodeWithGroup ,node , index, linkMeshArray);
    //     }
    // });
    // Create line meshes for leaves
    //leaves.forEach((leaf, index) => {
    //    const leafTarget = {
    //        x: Math.cos(leaf.angle) * tree.maxRadius,
    //        y: Math.sin(leaf.angle) * tree.maxRadius,
    //        depth: leaf.depth,
    //        data: leaf.data
    //    };
    //    createLineMesh(leaf, leafTarget, links.length + index, linkMeshArray);
    //});
    // Initialize a 4x4 transformation matrix


    const geometry = new THREE.SphereGeometry(2, 32, 16);
    // Create line meshes for links
    links.forEach((link, index) => {
        createLineMesh(link.source, link.target, index, linkMeshArray);
    });



    let nodesMeshArray = [];
    let nodes = tree.descendants();

    // Iterate over each node in the nodes array
    for (let i = 0; i < nodes.length; i++) {
        // Create a unique material for each node, with its own color

        let hexColor = "#e5d0ff";
        if (colorScale && !nodes[i].children) {
            hexColor = colorScale(nodes[i].data.values.group);
        }

        let material = new THREE.MeshStandardMaterial({
            color: nodes[i].children ? 0x0A84FF : hexColor, // White for internal nodes, random for leaves
            alphaHash: true,
            opacity: 1
        });

        // Create an individual mesh for each node
        let mesh = new THREE.Mesh(geometry, material);

        // Check if the current node has children (is an internal node)
        if (nodes[i].children) {
            // Set the position of the internal node in 3D space
            mesh.position.set(
                nodes[i].x,
                nodes[i].y,
                (nodes[i].depth) * (universeHeight / maximumNodeDepth)
            );
        } else {
            // Calculate and set the position based on the angle and the tree's maximum radius
            mesh.position.set(
                (tree.maxRadius) * Math.cos(nodes[i].angle),
                (tree.maxRadius) * Math.sin(nodes[i].angle),
                (nodes[i].depth) * (universeHeight / maximumNodeDepth)
            );
        }

        // Assign a name (index) and the node data to the mesh for later reference
        nodes[i].meshId = mesh.id;
        mesh.name = i;
        mesh.node = nodes[i];
        // Add the mesh to the array of node meshes for later access
        nodesMeshArray.push(mesh);

        // Add the mesh to the scene, making it visible
        scene.add(mesh);
    }

    nodes.forEach((node, index) => { });

    cosmos.getUniverseById('tree-plot').addMeshesToContainer(nodesMeshArray, 'nodes');


    treeUniverse.addMeshesToContainer(linkMeshArray, 'links');

}

function hasMultipleGroupEntries(node) {
    // Check if summarized_groups is defined and not null
    if (!node.summarized_groups) {
        return false;
    }

    let entryCount = 0;

    // Iterate over each group in summarized_groups
    Object.values(node.summarized_groups).forEach(group => {
        // Check if the group has an entry (non-null or non-default)
        if (
            group?.maxAngle !== null && group?.minAngle !== null
            && group?.maxAngle !== -Infinity && group?.minAngle !== Infinity
        ) {
            entryCount++;
        }
    });

    // Return true if more than one group has an entry
    return entryCount => 1;
}

export function makeNodesSummarized(geometry, nodes, scene, tree, cosmos, colorScale) {
    // Initialize a 4x4 transformation matrix

    let nodesMeshArray = [];

    let universeHeight = cosmos.getUniverseById('tree-plot').container.getBoundingClientRect().height;
    let maximumNodeDepth = Math.max(...nodes.map(node => node.depth));

    // Iterate over each node in the nodes array
    for (let i = 0; i < nodes.length; i++) {


        if (nodes[i].summarized_groups || !nodes[i].children) {

            if (hasMultipleGroupEntries(nodes[i]) || !nodes[i].children) {
                // Create a unique material for each node, with its own color

                let hexColor = "#e5d0ff";
                if (colorScale && !nodes[i].children) {
                    hexColor = colorScale(nodes[i].data.values.group);
                }

                let material = new THREE.MeshStandardMaterial({
                    color: nodes[i].children ? 0x0A84FF : hexColor, // White for internal nodes, random for leaves
                    alphaHash: true,
                    opacity: 1
                });

                // Create an individual mesh for each node
                let mesh = new THREE.Mesh(geometry, material);

                // Check if the current node has children (is an internal node)
                if (nodes[i].children) {
                    // Set the position of the internal node in 3D space
                    mesh.position.set(
                        nodes[i].x,
                        nodes[i].y,
                        (nodes[i].depth) * (universeHeight / maximumNodeDepth)
                    );
                } else {
                    // Calculate and set the position based on the angle and the tree's maximum radius
                    mesh.position.set(
                        (tree.maxRadius) * Math.cos(nodes[i].angle),
                        (tree.maxRadius) * Math.sin(nodes[i].angle),
                        (nodes[i].depth) * (universeHeight / maximumNodeDepth)
                    );
                }

                // Assign a name (index) and the node data to the mesh for later reference
                nodes[i].meshId = mesh.id;
                mesh.name = i;
                mesh.node = nodes[i];


                // Add the mesh to the array of node meshes for later access
                nodesMeshArray.push(mesh);

                // Add the mesh to the scene, making it visible
                scene.add(mesh);
            }



        }



    }

    cosmos.getUniverseById('tree-plot').addMeshesToContainer(nodesMeshArray, 'nodes');

}

/**
 * Creates and adds links (as line meshes) to the scene.
 * @param {Object[]} links - Array of link objects containing source and target node objects.
 * @param {Object[]} leaves - Array of leaf node objects.
 * @param {THREE.Scene} scene - The Three.js scene to which the lines will be added.
 * @param {Object} tree - The tree object, containing properties like maxRadius.
 */
export function makeHierarchicalEdgeBundling(links, leaves, scene, tree, cosmos) {
    // Array to store line meshes
    let linkMeshArray = [];


    let treeUniverse = cosmos.getUniverseById('tree-plot');

    let universeHeight = cosmos.getUniverseById('tree-plot').container.getBoundingClientRect().height;
    let maximumNodeDepth = Math.max(...leaves.map(node => node.depth));

    // Function to create a line mesh
    function createLineMesh(source, target, index, linkMeshArray) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(source.x, source.y, source.depth * (universeHeight / maximumNodeDepth)),
            new THREE.Vector3(target.x, target.y, target.depth * (universeHeight / maximumNodeDepth))
        ]);

        // Use a darker color for better visibility against a white background
        const material = new THREE.LineBasicMaterial({
            color: 0xA0A0A0, // Teenage Engineering-style grey
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
            x: Math.cos(leaf.angle) * tree.maxRadius,
            y: Math.sin(leaf.angle) * tree.maxRadius,
            depth: leaf.depth,
            data: leaf.data
        };
        createLineMesh(leaf, leafTarget, links.length + index, linkMeshArray);
    });

    treeUniverse.addMeshesToContainer(linkMeshArray, 'links');

}

