export function sortTreeByGroup(node) {
  // Check if the node has children
  if (node.children) {
    // Check if the children are leaves (i.e., they do not have their own children)
    const areLeaves = node.children.every((child) => !child.children);

    if (areLeaves) {
      // Sort the children if they are leaves
      node.children.sort((a, b) => {
        if (a.values.group < b.values.group) {
          return -1;
        }
        if (a.values.group > b.values.group) {
          return 1;
        }
        return 0;
      });
    } else {
      // Otherwise, recursively call this function on each child
      node.children.forEach(sortTreeByGroup);
    }
  }
}

function printSorting(node) {
  if (node.children) {
    // Check if the children are leaves (i.e., they do not have their own children)
    const areLeaves = node.children.every((child) => !child.children);

    if (areLeaves) {
      // Sort the children if they are leaves
      let groupList = [];
      node.children.forEach((child) => groupList.push(child.values.group));

      console.log(groupList);
    } else {
      // Otherwise, recursively call this function on each child
      node.children.forEach(printSorting);
    }
  }
}

// Print the sorting
function aggregateChildGroupMetrics(tree) {
  tree.eachAfter((node) => {
    // Check if the node has children and calculate max and min angles for each group
    if (node.children && node.children.length > 0) {
      let hasLeaves = node.children.some((child) => {
        return child.children && child.children.length > 0;
      });

      if (!hasLeaves) {
        // Initialize the summarized_groups object for each node
        node.summarized_groups = Object.fromEntries(
          tree.data.groups.map((group) => [
            group,
            { maxAngle: -Infinity, minAngle: Infinity, count: 0 },
          ])
        );

        node.children.forEach((child) => {
          if (child.data.values.group !== undefined) {
            // Assuming each child node has a 'group' and an 'angle' property
            const group = child.data.values.group;

            if (node.summarized_groups[group]) {
              node.summarized_groups[group].maxAngle = Math.max(
                node.summarized_groups[group].maxAngle,
                child.angle
              );
              node.summarized_groups[group].minAngle = Math.min(
                node.summarized_groups[group].minAngle,
                child.angle
              );
              node.summarized_groups[group].count += 1;
              node.summarized_groups[group].radius = child.radius;
              node.summarized_groups[group].depth = child.depth;
            }
          }
        });
      }
    }
  });
}

function collapseTree(root) {
  // Recursive function to collapse nodes
  function collapse(node, addGroupsMetrics) {
    if (!node.children) {
      return; // This is a leaf node, so return
    }

    // First, recursively collapse child nodes
    node.children.forEach((child) => {
      collapse(child);
    });

    // After processing all children, perform the collapsing logic on the current node
    // Check if all children are leaves and belong to the same group
    let allChildrenAreLeaves = node.children.every((child) => !child.children);
    let leaves = node.children.filter((child) => !child.children);

    if (leaves.length === 0) {
      return;
    }

    let firstChildGroup = leaves[0].data.values.group;
    const allChildrenSameGroup = leaves.every(
      (child) => child.data.values.group === firstChildGroup
    );

    // Collapse this node if all children are leaves and are in the same group
    if (allChildrenAreLeaves && allChildrenSameGroup) {
      let maxLeafAngle = Math.max(...leaves.map((leaf) => leaf.angle));
      let minLeafAngle = Math.min(...leaves.map((leaf) => leaf.angle));

      let radius = node.children[0].radius;
      let group = node.children[0].data.values.group;
      let leafDepth = node.children[0].depth;
      let leafCount = node.children.length;

      let nodeMetric = {
        group: group,
        radius: radius,
        minLeafAngle: minLeafAngle,
        maxLeafAngle: maxLeafAngle,
        depth: node.depth,
        leafDepth: leafDepth,
        leafCount: leafCount,
      };

      let childrenWithNodeMetric = node.children.filter(
        (child) =>
          child.nodeMetric !== undefined &&
          child.nodeMetric.group === firstChildGroup
      );

      if (childrenWithNodeMetric.length !== 0) {
        radius = childrenWithNodeMetric[0].nodeMetric.radius;
        group = childrenWithNodeMetric[0].nodeMetric.group;
        leafDepth = childrenWithNodeMetric[0].nodeMetric.leafDepth;
        leafCount = childrenWithNodeMetric[0].nodeMetric.leafCount;

        let maxLeafAngle = Math.max(
          ...childrenWithNodeMetric.map((leaf) => leaf.nodeMetric.maxLeafAngle)
        );
        let minLeafAngle = Math.min(
          ...childrenWithNodeMetric.map((leaf) => leaf.nodeMetric.minLeafAngle)
        );

        nodeMetric["group"] = group;
        nodeMetric["radius"] = radius;
        nodeMetric["minLeafAngle"] = minLeafAngle;
        nodeMetric["maxLeafAngle"] = maxLeafAngle;
        nodeMetric["depth"] = node.depth;
        nodeMetric["leafDepth"] = leafDepth;
        nodeMetric["leafCount"] = nodeMetric["leafCount"] + leafCount;
      }

      node.nodeMetric = nodeMetric;
      node._children = node.children; // Store children in _children to 'collapse' them
      node.children = null; // Remove children to collapse the node
      node.data.values.group = group;
    }
  }
  collapse(root);
}

function assignZeroGroundValues(node) {
  if (!("children" in node)) {
    return; // This is a leaf node, so return
  }

  // First, recursively collapse child nodes
  node.children.forEach((child) => {
    assignZeroGroundValues(child);
  });

  if (!("values" in node)) {
    node.values = {
      ground_zero: 0,
    };
  } else {
    node.values.ground_zero = 0;
  }
}

export function assignUniqueIds(root) {
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
