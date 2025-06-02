
import TreeDisplay from './TreeDisplay.js';
import constructTree from './TreeConstructor.js'; // Assuming constructTree is from here

export default class Gui {
  constructor(
    treeList,
    fileName,
  ) {
    this.treeList = treeList;
    this.treeNameList = [
      "Full. ",
      "Intermediate ",
      "Consensus 1 ",
      "Consensus 2 ",
      "Intermedidate ",
    ];
    this.fileName = fileName;
    this.treeDisplay = null; // Initialize treeDisplay instance holder
    this.msaMatrix = []; // Placeholder for msaMatrix
    this.leaveColorMap = {}; // Placeholder for leaveColorMap
    // this.index and this.ignoreBranchLengths should be initialized, e.g.
    this.index = 0; // Default to first tree
    this.ignoreBranchLengths = false; // Default behavior
  }

  initializeMovie() {
    this.resize();
    this.update();
  }

  getIntervalDuration() {
    let treeTimeList = [200, 200, 200, 500, 200];
    let type = this.index % 5;
    return (
      treeTimeList[type] * parseInt(document.getElementById("factor").value)
    );
  }

  update() {
    this.resize();
    this.updateLineChart();
    this.updateControls();
    this.updateScale();
    this.updateMain();
  }


  saveSVG() {

    let containerWidth = document.getElementById("application").getBBox().width;

    let containerHeight = document
      .getElementById("application")
      .getBBox().height;

    containerWidth += containerWidth * 0.05;
    containerHeight += containerHeight * 0.05;

    const svg = document
      .getElementById("application-container")
      .cloneNode(true); // clone your original svg

    svg.setAttribute("id", "imageExport");

    document.body.appendChild(svg); // append element to document

    const g = svg.querySelector("g"); // select the parent g

    g.setAttribute(
      "transform",
      `translate(${containerWidth / 2},${containerHeight / 2})`
    ); // clean transform

    svg.setAttribute("width", containerWidth); // set svg to be the g dimensions

    svg.setAttribute("height", containerHeight);

    const svgAsXML = new XMLSerializer().serializeToString(svg);
    const svgData = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`;

    const link = document.createElement("a");

    document.body.appendChild(link);

    link.setAttribute("href", svgData);

    link.setAttribute(
      "download", `tree-1.svg`
    );

    link.click();

    document.getElementById("imageExport").remove();
  }



  updateMain() {
    let tree = this.treeList[this.index];

    // Ensure this.index is valid
    if (this.index === undefined || this.index < 0 || this.index >= this.treeList.length) {
      console.error("Invalid tree index:", this.index);
      this.index = 0; // Reset to a safe default
      if (!this.treeList || this.treeList.length === 0) {
        console.error("Tree list is empty. Cannot display tree.");
        return;
      }
    }

    if (this.ignoreBranchLengths === undefined) {
      this.ignoreBranchLengths = false; // Default if not set
    }

    let d3tree = constructTree(
      tree,
      this.ignoreBranchLengths,
      'application-container' // This is the SVG container ID
    );

    if (this.treeDisplay) {
      this.treeDisplay.root = d3tree;
      this.treeDisplay.currentMaxRadius = d3tree.maxRadius;
    } else {
      // 'application' is the ID of the <g> element within the SVG for TreeDisplay
      this.treeDisplay = new TreeDisplay(d3tree, d3tree.maxRadius, 'application');
    }

    // Prepare options for TreeDisplay updateDisplay
    let displayOptions = {
      msaMatrix: (this.msaMatrix || []), // Use instance msaMatrix
      leaveColorMap: (this.leaveColorMap || {}), // Use instance leaveColorMap
      fontSize: 1, // Example default, consider making configurable
      strokeWidth: '1px', // Example default
      mode: 'classical-phylo', // Example default
      // If displayEdgeValue is a feature, it might be controlled by other UI elements later
      // displayEdgeValue: 'length',
      // colorMode: 'regular'
    };

    // If there are specific options stored in Gui instance related to display that TreeDisplay handles
    // For example, if this.currentDisplayMode, this.currentFontSize etc. were properties of Gui
    // displayOptions.mode = this.currentDisplayMode || 'classical-phylo';
    // displayOptions.fontSize = this.currentFontSize || 1;

    this.treeDisplay.updateDisplay(displayOptions);
  }

  resize() {
    let applicationContainer = document.getElementById("application-container");
    let width = applicationContainer.clientWidth;
    let height = applicationContainer.clientHeight;
    d3.select("#application").attr(
      "transform",
      "translate(" + width / 2 + "," + height / 2 + ")"
    );
  }
}
