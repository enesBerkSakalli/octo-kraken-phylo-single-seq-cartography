import constructTree from "./layouts/circular/TreeConstructor.js";
import { deepCopyJSON } from "./nebulaDB.js";
import {
  createTrailGraphLayout,
  calculateMonophyleticClade,
} from "./forceTrailGraphs.js";

export function initializeStatisticWindow(id) {
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

export function ensureLeaveGroupStatistics(statistics, group) {
  if (!statistics.groups[group]) {
    statistics.groups[group] = {
      leaveCount: 0,
      leavesData: [],
      // Initialize other statistics for this new group as needed
    };
  }
}

export function ensureMonoPhyleticCladeStatistics(statistics, group) {
  if (!statistics.groups[group]) {
    statistics.groups[group] = {
      leaveCount: 0,
      leavesData: [],
      clades: [], // Now an array to hold individual clades and their leaves count
    };
  }
}

// Updates statistics for a leaf node
export function updateLeafStatistics(statistics, node) {
  const group = node.data.values.group; // Assuming group data is in node.data for leaves
  ensureLeaveGroupStatistics(statistics, group);

  statistics.groups[group].leaveCount += 1;
  statistics.groups[group].leavesData.push(node.data.name);
  statistics.totalLeaveCount += 1;
}

export function calculateMonoPhyleticStatistics(appliedMonophyleticTree) {
  let leaveStatistics = {
    totalLeaveCount: 0,
    groups: {},
  };

  let monophyleticCladeStatistics = {
    groups: {},
  };

  let heterogeneousCladeStatistics = [];

  appliedMonophyleticTree.eachAfter((node) => {
    if (node.trail_graph_metrics || !node.children) {
      // Node with metrics indicates a monophyletic clade
      updateMonoPhyleticCladeStatistics(monophyleticCladeStatistics, node);
    }
    if (!node.children) {
      updateLeafStatistics(leaveStatistics, node);
    } else if (!node.trail_graph_metrics && node.children) {
      calculateHeterogeneousStatistics(node, heterogeneousCladeStatistics);
    }
  });

  calculateMetricsForCladeOrLeaves(
    leaveStatistics,
    monophyleticCladeStatistics
  );

  return {
    leaves: leaveStatistics,
    monophyletic: monophyleticCladeStatistics,
  };
}

export function calculateHeterogeneousStatistics(node, statistics) {
  let heterogeneousCladeCombinations = {};
  node.children.forEach((child) => {
    if (child.trail_graph_metrics) {
      heterogeneousCladeCombinations[child.trail_graph_metrics.group] =
        child.trail_graph_metrics.groupPoints.length;
    } else if (!child.children) {
      heterogeneousCladeCombinations[child.data.values.group] = 1;
    }
  });
  statistics.push(heterogeneousCladeCombinations);
}

export function updateMonoPhyleticCladeStatistics(statistics, node) {
  if (node.trail_graph_metrics) {
    const { group, groupPoints } = node.trail_graph_metrics;
    let leavesCount = groupPoints.length;
    const cladeId = node.data.name; // Assuming node ID is used as clade ID

    if (!statistics.groups[group]) {
      statistics.groups[group] = [];
    }

    statistics.groups[group].push({
      cladeId,
      leavesCount,
    });
  } else {
    let leaveId = node.data.name;
    let group = node.data.values.group;
    let leavesCount = 1;

    if (!statistics.groups[group]) {
      statistics.groups[group] = [];
    }

    statistics.groups[group].push({
      leaveId,
      leavesCount,
    });
  }
}

export function displayLeaveStatisticsInWinBox(
  statistics,
  winBoxId,
  colorScale
) {
  const winBox = window.myWinBoxes[winBoxId];
  if (!winBox) {
    console.error(`WinBox with ID '${winBoxId}' not found.`);
    return;
  }

  const statsDiv = winBox.body.querySelector("#statsContent");
  if (!statsDiv) {
    console.error("Statistics content div not found inside WinBox.");
    return;
  }

  // Clear previous content
  d3.select(statsDiv).selectAll("*").remove();

  // Prepare the data
  const data = Object.entries(statistics.groups).map(([group, stats]) => ({
    group,
    count: stats.leaveCount,
    color: colorScale(group),
  }));

  // Create a flex container for each list item
  const li = d3
    .select(statsDiv)
    .append("ul")
    .selectAll("li")
    .data(data)
    .enter()
    .append("li")
    .style("display", "flex")
    .style("align-items", "center")
    .style("margin-bottom", "5px");

  // Prepend colored rectangles to each list item
  li.append("svg")
    .attr("width", 20)
    .attr("height", 10)
    .style("margin-right", "5px")
    .append("rect")
    .attr("width", 20)
    .attr("height", 10)
    .attr("fill", (d) => d.color);

  // Add text after the rectangle
  li.append("span").text((d) => `${d.group}: ${d.count} unclad leaves`);
}

export function calculateMetricsForCladeOrLeaves(
  leaveStatistics,
  monophyleticCladeStatistics
) {
  // Iterate through each group in the monophyletic clade statistics
  const groups = Object.entries(monophyleticCladeStatistics.groups);

  groups.forEach(([partition, clades]) => {
    // Create an array of all leaf counts in the clades
    const allLeaveCounts = clades.map((clade) => clade.leavesCount);

    // Add the count of unclustered leaves to the array if they exist in the leave statistics
    //if (leaveStatistics.groups[partition]) {
    //  const unclusteredLeavesCount =
    //    leaveStatistics.groups[partition].leaveCount;
    //  for (let i = 0; i < unclusteredLeavesCount; i++) {
    //    allLeaveCounts.push(1); // Each unclustered leaf is considered individually
    //  }
    //}

    // Calculate total, mean, max, and median of the leave counts
    const totalLeaves = allLeaveCounts.reduce((acc, count) => acc + count, 0);
    const meanLeaves = totalLeaves / allLeaveCounts.length;
    const maxLeaves = Math.max(...allLeaveCounts);
    const medianLeaves = calculateMedian(allLeaveCounts);

    // Calculate variance
    const varianceLeaves =
      allLeaveCounts.reduce(
        (acc, count) => acc + (count - meanLeaves) ** 2,
        0
      ) / allLeaveCounts.length;

    const standardDeviation = Math.sqrt(varianceLeaves);

    // Assign calculated statistics back to the groups object
    monophyleticCladeStatistics.groups[partition].totalLeaves = totalLeaves;
    monophyleticCladeStatistics.groups[partition].meanLeaves = meanLeaves;
    monophyleticCladeStatistics.groups[partition].maxLeaves = maxLeaves;
    monophyleticCladeStatistics.groups[partition].medianLeaves = medianLeaves;
    monophyleticCladeStatistics.groups[partition].varianceLeaves =
      varianceLeaves;
    monophyleticCladeStatistics.groups[partition].std = standardDeviation;
  });
}

function calculateMedian(numbers) {
  numbers.sort((a, b) => a - b);
  const midIndex = Math.floor(numbers.length / 2);
  if (numbers.length % 2 === 0) {
    return (numbers[midIndex - 1] + numbers[midIndex]) / 2;
  }
  return numbers[midIndex];
}

export function displayMonophyleticCladeViolinPlot(
  statistics,
  statsDiv,
  group,
  clades,
  colorScale
) {
  const totalLeavesInGroup = clades.totalLeaves;
  let statsSummary = `
    <div style="font-size:10px">
      Total Number of Leaves: ${totalLeavesInGroup}<br>
      Mean Number of Leaves in a Monophyletic Clade: ${clades.meanLeaves}<br>
      Standard Deviation: ${Math.sqrt(clades.varianceLeaves)}<br>
      Variance: ${clades.varianceLeaves}<br>
      Median Number of Leaves in Clade: ${clades.medianLeaves}<br>
      Max Number of Leaves in Clade: ${clades.maxLeaves}<br>
    </div>`;
  statsDiv.innerHTML += statsSummary;

  // Prepare data for violin plot
  const boxData = clades.map((clade) => clade.leavesCount);

  const trace = {
    type: "violin",
    y: boxData,
    box: {
      visible: true,
    },
    line: {
      color: colorScale(group),
    },
    meanline: {
      visible: true,
    },
    x0: group,
  };

  const data = [trace];

  const layout = {
    title: `Violin Plot for Group: ${group}`,
    yaxis: {
      title: "Number of Leaves",
    },
  };

  const plotDiv = document.createElement("div");
  statsDiv.appendChild(plotDiv);

  Plotly.newPlot(plotDiv, data, layout);
}

export function displayMonophyleticCladePercentagePlot(
  statistics,
  statsDiv,
  group,
  clades,
  colorScale
) {
  const totalLeavesInGroup = clades.totalLeaves;

  // Calculate percentage of leaves in each clade for percentage plot
  const cladesWithPercentage = clades.map((clade) => {
    const percentage = (clade.leavesCount / totalLeavesInGroup) * 100;
    return { ...clade, percentage };
  });

  // Sort clades by leaves count
  cladesWithPercentage.sort((a, b) => b.leavesCount - a.leavesCount);

  // Determine the top 10 clades to plot individually
  const topClades = cladesWithPercentage.slice(0, 10);
  const smallerClades = cladesWithPercentage.slice(10);

  // Calculate cumulative percentage for smaller clades
  const cumulativeSmallerClades = smallerClades.reduce(
    (acc, clade) => {
      acc.leavesCount += clade.leavesCount;
      acc.percentage += clade.percentage;
      return acc;
    },
    { leavesCount: 0, percentage: 0 }
  );

  const finalPlotData = [
    ...topClades.map((clade) => ({
      ...clade,
      cladeLabel: `Clade c${clade.leavesCount}`,
    })),
    {
      ...cumulativeSmallerClades,
      cladeLabel: "Smaller < 10 clades",
    },
  ];

  const trace = {
    x: finalPlotData.map((d) => d.cladeLabel),
    y: finalPlotData.map((d) => d.percentage),
    type: "bar",
    marker: {
      color: colorScale(group),
    },
  };

  const data = [trace];

  const layout = {
    title: `Percentage Plot for Group: ${group}`,
    xaxis: {
      title: "Clades",
      tickangle: -45,
    },
    yaxis: {
      title: "Percentage of Leaves",
    },
  };

  const plotDiv = document.createElement("div");
  statsDiv.appendChild(plotDiv);

  Plotly.newPlot(plotDiv, data, layout);
}

export function displayMonophyleticCladeStatisticsInWinBox(
  statistics,
  winBoxId,
  colorScale
) {
  const winBox = window.myWinBoxes[winBoxId];
  if (!winBox) {
    console.error(`WinBox with ID '${winBoxId}' not found.`);
    return;
  }

  const statsDiv = winBox.body.querySelector("#statsContent");
  if (!statsDiv) {
    console.error("Statistics content div not found inside WinBox.");
    return;
  }

  // Prepare the data from monophyletic clade statistics
  const groups = Object.entries(statistics["monophyletic"].groups);

  groups.forEach(([group, clades]) => {
    const groupHeader = document.createElement("h3");
    groupHeader.textContent = `Group: ${group}`;
    statsDiv.appendChild(groupHeader);

    // Display violin plot
    displayMonophyleticCladeViolinPlot(
      statistics,
      statsDiv,
      group,
      clades,
      colorScale
    );

    // Display percentage plot
    displayMonophyleticCladePercentagePlot(
      statistics,
      statsDiv,
      group,
      clades,
      colorScale
    );
  });
}

export function createStatisticsWindowAndWriteContent(treeData, colorScale) {
  let statisticsUniverse = "statistics-universe";
  initializeStatisticWindow(statisticsUniverse);
  let appliedMonophyleticTree = constructTree(
    deepCopyJSON(treeData),
    false,
    "application-container"
  );
  createTrailGraphLayout(appliedMonophyleticTree);
  calculateMonophyleticClade(appliedMonophyleticTree);
  let statistics = calculateMonoPhyleticStatistics(appliedMonophyleticTree);
  // Corrected the order of arguments here
  displayLeaveStatisticsInWinBox(
    statistics["leaves"],
    statisticsUniverse,
    colorScale
  );

  displayMonophyleticCladeStatisticsInWinBox(
    statistics,
    statisticsUniverse,
    colorScale
  );
  return statistics;
}
