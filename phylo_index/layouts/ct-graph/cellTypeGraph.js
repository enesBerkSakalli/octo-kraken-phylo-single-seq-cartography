export function calculateMonophyleticCladesCtGraph(tree) {
  let nodeIndex = 0;

  tree.eachBefore((nodeX) => {
    nodeX.data.name = nodeIndex;
    nodeIndex++;
  });

  collapseBackwards(tree);
  //collapseForwards(tree);
}

function collapseBackwards(tree) {
  tree.eachAfter((node) => {
    if (!node.children) return;

    node.mono_metrics = {};

    const directLeafChildren = node.children.filter((child) => !child.children);

    const leafGroups = new Set(
      directLeafChildren.map((child) => child.data.values.group)
    );

    if (
      leafGroups.size === 1 &&
      node.children.every((child) => !child.children)
    ) {
      const group = directLeafChildren[0].data.values.group;
      node.mono_metrics[group] = directLeafChildren.length;
      node._children = node.children;
      node.children = null;
      node.data.values.group = group;
    } else {
      node.children.forEach((child) => {
        if (child.mono_metrics) {
          Object.entries(child.mono_metrics).forEach(([group, count]) => {
            node.mono_metrics[group] = (node.mono_metrics[group] || 0) + count;
          });
        } else if (!child.children) {
          const group = child.data.values.group;
          node.mono_metrics[group] = (node.mono_metrics[group] || 0) + 1;
        }
      });
    }
  });
}

function collapseForwards(tree) {
  tree.each((nodeX) => {
    if (!nodeX.children) return;

    const directLeafChildren = nodeX.children.filter(
      (child) => !child.children
    );
    const leafGroupsX = new Set(
      directLeafChildren.map((child) => child.data.values.group)
    );

    if (leafGroupsX.size === 1) {
      collapseMatchingLeafGroups(nodeX, leafGroupsX);
    }
  });
}

function collapseMatchingLeafGroups(nodeY, leafGroupX) {
  if (!nodeY || !nodeY.children) return;

  const directLeafChildren = nodeY.children.filter((child) => !child.children);
  const leafGroupsY = new Set(
    directLeafChildren.map((child) => child.data.values.group)
  );

  // Extract the single group value for comparison more cleanly
  const groupX = [...leafGroupX][0];
  const groupY = [...leafGroupsY][0];

  // Compare the leaf group of the current node with the provided leaf group
  if (groupX === groupY) {
    const parent = nodeY.parent;

    if (parent) {
      nodeY.children.forEach((child) => {
        if (!parent.children.includes(child)) {
          parent.children.push(child);
        }

        child.parent = parent; // Re-assign parent of the child
      });

      // Remove the current node from its parent's children
      parent.children = parent.children.filter((child) => child !== nodeY);
    }
  }
  if ([...leafGroupX][0] !== [...leafGroupsY][0]) {
    return;
  }

  nodeY.children.forEach((child) => {
    collapseMatchingLeafGroups(child, leafGroupX);
  });
}

export function initializeCtGraphUniverse(id) {
  // Accept an 'id' parameter
  // Check if a window with the given ID already exists to avoid duplicates
  if (document.getElementById(id)) {
    console.error(`A window with the ID '${id}' already exists.`);
    return;
  }

  // Create the WinBox with the specified 'left' and 'max' options
  let dataPlotContainer = new WinBox({
    id: id, // Assign the provided ID to the WinBox
    left: "50%",
    max: true,
    onfocus: function () {
      this.setBackground("#00aa00"); // Example of an action to take on focus
    },
    onblur: function () {
      this.setBackground("#777"); // Example of an action to take on blur
    },
    // Ensure the HTML content is properly set up for stats display
    html: `<div id="statsContent" style="overflow-y: auto; height: 100%;"></div>`,
  });

  // Store the reference to the WinBox in a global variable for easy access
  window.myWinBoxes = window.myWinBoxes || {};
  window.myWinBoxes[id] = dataPlotContainer;
}

export function createCtUniverseGraph(root, universeId, colorScale) {
  const dataPlotContainer = window.myWinBoxes[universeId];
  if (!dataPlotContainer) {
    console.error("WinBox container not found.");
    return;
  }

  const statsContent = dataPlotContainer.body.querySelector("#statsContent");
  if (!statsContent) {
    console.error("Stats content div not found inside WinBox.");
    return;
  }

  const width = statsContent.clientWidth;
  const height = statsContent.clientHeight;

  const svg = d3
    .select(statsContent)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(
      d3.zoom().on("zoom", function (event) {
        svgGroup.attr("transform", event.transform);
      })
    )
    .append("g");

  const svgGroup = svg.append("g").attr("transform", `translate(40,40)`);

  const tree = d3
    .tree()
    .size([height * 2 - 80, width * 2 - 80])
    .separation(function (a, b) {
      return a.parent == b.parent ? 20 : 2;
    });

  tree(root);

  const link = svgGroup
    .selectAll("path.link")
    .data(root.links())
    .enter()
    .append("path")
    .attr("class", "link")
    .attr(
      "d",
      d3
        .linkVertical()
        .x((d) => d.x)
        .y((d) => d.y)
    )
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5);

  const getTotalLeaves = (node) =>
    Object.values(node.mono_metrics || {}).reduce((acc, val) => acc + val, 0);
  const leafCount = root.descendants().map((d) => getTotalLeaves(d));
  console.log(leafCount);
  const maxLeaves = Math.max(...leafCount);
  const radiusScale = d3.scaleSqrt().domain([0, maxLeaves]).range([5, 20]);

  const node = svgGroup
    .selectAll("g.node")
    .data(root.descendants())
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

  node.each(function (d) {
    const selection = d3.select(this);
    const leaves = getTotalLeaves(d);
    const radius = radiusScale(leaves);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    if (d.mono_metrics) {
      const pieData = d3.pie().value((d) => d.value)(
        Object.entries(d.mono_metrics).map(([group, value]) => ({
          group,
          value,
        }))
      );

      selection
        .selectAll("path")
        .data(pieData)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", (d) => colorScale(d.data.group));
    } else if (d.children) {
      selection.append("circle").attr("r", radius).attr("fill", "lightgrey");
    } else {
      selection
        .append("circle")
        .attr("r", radiusScale(1))
        .attr("fill", (d) => colorScale(d.data.values.group));
    }
  });
}
