
/** Class For drawing Hierarchical Trees. */
export default class TreeDisplay {

  static colorMap = {
    defaultColor: "black",
    markedColor: "red",
    strokeColor: "black",
    changingColor: "orange",
    defaultLabelColor: "black",
    extensionLinkColor: "black",
    userMarkedColor: "magenta",
  };

  static sizeMap = {
    strokeWidth: "0.5px",
    fontSize: "1em",
  };

  static msaMatrix = {};

  /**
   * Create a TreeDisplay.
   * @param _currentRoot
   */
  constructor(_currentRoot, currentMaxRadius, container) {
    this.root = _currentRoot;
    this.currentMaxRadius = currentMaxRadius;
    this.container = container;
    // Calculate font size based on some algorithm
    TreeDisplay.sizeMap.fontSize = this.calculateFontSize(2);
    this.collapse(this.root.children);
  }

  static treeColorMap = {};

  /**
   * getter for the svg application container.
   * @return {Object}
   */
  getSvgContainer() {
    return d3.select(`#${this.container}`);
  }

  /**
   * Generating id for an edge by combining the name of the source node name and the target name
   * @param  {Object} link
   * @return {string}
   */
  generateEdgeId(link) {
    return `link-${this.container}-${link.source.data.name.join("-")}`;
  }

  /**
   * Updates the branches of the trees by binding new data with old SVG elements.
   *
   * @returns {void}
   */
  updateEdges() {
    // JOIN new data with old SVG elements.
    // Data Binding

    let edges = this.getSvgContainer()
      .selectAll(".edge")
      .data(this.root.links(), (d) => this.getLinkId);

    // EXIT old elements not present in new data.
    edges
      .exit()
      .transition()
      .style("stroke-opacity", 0)
      .remove();

    // ENTER new elements present in new data.
    edges
      .enter()
      .append("path")
      .style("stroke", TreeDisplay.colorMap.strokeColor)
      .attr("class", "edge")
      .attr("stroke-width", TreeDisplay.sizeMap.strokeWidth)
      .attr("z-index", "-1")
      .attr("fill", "none")
      .attr("id", (d) => this.generateEdgeId(d))
      .attr("data-source", (d) => d.source.data.name)
      .attr("data-target", (d) => d.target.data.name)
      .attr("d", (d) => this.buildSvgString(d))
      .style("stroke-opacity", 1);

    // UPDATE old elements present in new data.
    edges
      .attr("z-index", "-1")
      .attr("stroke-width", TreeDisplay.sizeMap.strokeWidth)
      .style("stroke", 'blue');
  }

  /**
   * This function is drawing the extension of the branches in the trees.
   * @return {void}
   */
  updateExternalEdges() {
    // JOIN new data with old elements.
    const colorExternalEdges = this.getSvgContainer()
      .selectAll(".edge-extension") //updates the links
      .data(this.root.leaves(), (link) => link.data.name);

    // UPDATE old elements present in new data.
    colorExternalEdges
      .transition()
      .attr("stroke-width", TreeDisplay.sizeMap.strokeWidth)
      .ease(d3.easeExpInOut)
      .duration(this.drawDuration)

    colorExternalEdges.exit().remove();

    // ENTER new elements present in new data.
    colorExternalEdges
      .enter()
      .append("path")
      .attr("class", "edge-extension")
      .style("stroke", this.lookUpLeafColor(this.root.data.name))
      .attr("stroke-width", TreeDisplay.sizeMap.strokeWidth)
      .attr("stroke-dasharray", 5 + ",5")
      .attr("fill", "none")
      .attr("d", (d) => this.buildEdgeExtension(d, this.currentMaxRadius));
  }



  /**
   * Calculate font size based on number of leaves and current maximum radius
   * @return {number}
   */
  calculateFontSize(divider = 4) {
    let fontSize = (Math.sin(2 * Math.PI / this.root.leaves().length) * this.currentMaxRadius);
    return fontSize / divider;
  }

  /**
   * Creates leave labels and update the position and the color of them.
   * @return {void}
   */
  updateLeaveLabels() {
    let leaves = this.root.leaves()//
    
    leaves = leaves.filter((leaf)=> !leaf.collapsed);
    
    // JOIN new data with old svg elements
    let textLabels = this.getSvgContainer()
      .selectAll(".leave-label")
      .data(leaves, (d) => d.data.name);

    // UPDATE old elements present in new data
    textLabels
      .attr("transform", (d) => this.orientText(d, this.currentMaxRadius))
      .attr("text-anchor", (d) => this.anchorCalc(d))
      .style("font-size", `${TreeDisplay.sizeMap.fontSize}`)
      .style("fill", (d) => this.lookUpLeafColor(d.data.name));

    textLabels.exit().remove();

    // ENTER new elements present in new data
    textLabels
      .enter()
      .append("text")
      .attr("class", "leave-label")
      .attr("id", (d) => `leave-label-${d.data.name}`)
      .attr("dy", ".31em")
      .style("font-size", `${TreeDisplay.sizeMap.fontSize}`)
      .text((d) => `${d.data.name}`)
      .attr("transform", (d) => this.orientText(d, this.currentMaxRadius))
      .attr("text-anchor", (d) => this.anchorCalc(d))
      .attr("font-family", "Courier New")
      .style("fill", (d) => this.lookUpLeafColor(d.data.name));
  }

  /**
   * Updates the values displayed on the edges of the tree. 
   * This function handles data join, updates and removal of old elements, and addition of new elements.
   * 
   * @param {string} value - The value that needs to be displayed on the edges.
   */
  updateEdgeValues(value) {
    // Get all nodes from the hierarchy
    const edges = this.root.links();

    // JOIN new data with old svg elements
    let textLabels = this.getSvgContainer()
      .selectAll(".edge-value")
      .data(edges,
        (d) => `edge-value-${d.source.data.name}`
      );

    // REMOVE old elements not present in new data
    textLabels.exit().remove();

    // Function to set up attributes and styles for a text label
    const setTextLabelAttributes = (selection) => {
      selection
        .attr("transform", (d) => this.orientText(d.target, (d.source.radius + d.target.radius) / 2))
        .attr("text-anchor", (d) => this.anchorCalc(d))
        .text((d) => this.getEdgeValue(value, d))
        .style("font-size", `${TreeDisplay.sizeMap.fontSize}`)
        .attr("class", "edge-value")
        .attr("dy", "-1em")
        .attr("font-family", "Mono Space")
        .style("fill", TreeDisplay.colorMap.defaultLabelColor);
    };

    // UPDATE old elements present in new data
    setTextLabelAttributes(textLabels);

    // ENTER new elements present in new data
    setTextLabelAttributes(textLabels.enter().append("text"));
  }

  /**
   * Retrieves the edge value based on the given value type.
   * 
   * @param {string} value - The type of the value that needs to be retrieved.
   * @param {Object} d - The data object for the edge.
   * 
   * @returns {string|undefined} - The retrieved value or undefined if not found.
   */
  getEdgeValue(value, d) {
    // if 'value' is "length", return the length
    if (value === "length") {
      return d.source.data.length;
    }
    // else, if the 'values' object exists on the target, return the corresponding value
    else if (d.target.data.values) {
      return d.target.data.values[value];
    }
    // if 'values' object does not exist, return undefined
    else {
      return undefined;
    }
  }

  /**
   * Creates and updates leaf circle nodes for the tree.
   * On each node, click and hover events are attached for interactivity.
   * @returns {void}
   */
  updateNodeCircles() {
    const nodes = this.root;

    // JOIN new data with old SVG elements
    const nodeCircles = this.getSvgContainer()
      .selectAll(".node")
      .data(nodes, (d) => d.data.name);


    let angle = 360 / this.root.leaves().length;
    let circumference = (angle / 360 * (2 * this.currentMaxRadius * Math.PI));

    // Define the radius of the circle node.
    let circleNodeRadius = circumference - (circumference / 1.3); // Math.sin(2 * Math.PI / this.root.leaves().length) * this.currentMaxRadius;

    // UPDATE old elements present in new data.
    nodeCircles
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .raise();

    nodeCircles.exit().remove();

    // ENTER new elements present in new data.
    nodeCircles
      .enter()
      .append("circle")
      .attr("id", (d) => `${this.container}!${d.data.name}`)
      .attr("class", "node")
      .style("z-index", "1000")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .style("fill", TreeDisplay.colorMap.defaultColor)
      //.attr("filter", "drop-shadow(0px 1px 3px rgba(0, 0, 0, 1))")
      .attr("r", `${circleNodeRadius}px`)
      .on("click", (e, d) => this.handleNodeClick(e, d))
      .on("mouseover", this.mouseOver)
      .on("mouseleave", this.mouseLeaveNode)
      .raise();
  }

  /**
   * Fetches and prepares the HTML for the sequence alignment data.
   *
   * @param {Array} taxonList - The list of taxa for the selected node.
   * @param {Object} msa - The multiple sequence alignment data.
   * @return {string} The generated HTML string.
   */
  generateSequenceAlignmentHTML(taxonList) {
    return taxonList.map(taxon => `
    <div class="sequence">
      <div class="taxon-id" style="min-width: 200px !important; background:${TreeDisplay.leaveColorMap[taxon]}">${taxon}</div>
      <div style="background:${TreeDisplay.leaveColorMap[taxon]}" class="letter">
        <span>${TreeDisplay.msaMatrix[taxon]}</span>
      </div>            
    </div>
  `).join('');
  }

  /**
   * Toggles the modal window displaying sequence alignment data.
   *
   * @param {string} alignmentDataHTML - The HTML string containing the sequence alignment data.
   */
  toggleAlignmentModal(alignmentDataHTML) {
    const alignmentContainer = document.getElementById('msa-alignment-window');
    alignmentContainer.innerHTML = alignmentDataHTML;
    UIkit.modal('#modal-sections').toggle();
  }

  /**
   * Displays the sequence alignment data for the selected node.
   *
   * @param {Array} taxonList - The list of taxa for the selected node.
   */
  displayAlignmentData(e, d) {
    const alignmentDataHTML = this.generateSequenceAlignmentHTML(d.data.name);
    this.toggleAlignmentModal(alignmentDataHTML);
  }

  /**
   * Handles the click event on a node.
   * When a node is clicked, two circles (buttons) with their associated labels are drawn.
   * The first circle collapses the tree and the second one displays alignment data.
   * After 2000ms, these circles disappear.
   *
   * @param {Object} event - The event data.
   * @param {Object} d - The data associated with the clicked node.
   */
  handleNodeClick(event, d) {
    // Select the application element and append a new group for the collapse menu
    d3.selectAll("#application")
      .data([d])
      .append("g")
      .attr("id", "menu-group-collapse");

    // Create a reference to the collapse menu group
    let menuGroupCollapse = d3.select("#menu-group-collapse");

    menuGroupCollapse.attr('cursor', 'pointer')

    // Append a circle to the collapse menu group that, when clicked, collapses the tree
    menuGroupCollapse
      .append("circle")
      .attr("cx", d.x - 20)
      .attr("cy", d.y)
      .attr("id", "menu-circle-collapse")
      .attr("r", 15)
      .attr("fill", "#F44336")
      .attr("filter", "drop-shadow(0px 3px 3px rgba(0, 0, 0, 1))")
      .on("click", (e, d) => {
        this.click(e, d); // call the click method when the circle is clicked
      });

    // Append a text label to the collapse menu group
    menuGroupCollapse
      .append("text")
      .text("C")
      .attr("x", d.x - 20)
      .attr("y", d.y + 5)
      .attr("text-anchor", "middle")
      .attr("fill", "white");

    // Select the application element and append a new group for the MSA (Multiple Sequence Alignment) menu
    d3.selectAll("#application")
      .data([d])
      .append("g")
      .attr("id", "menu-group-msa")
      .on("click", (e, d) => {
        this.displayAlignmentData(e, d); // call the displayAlignmentData method when the group is clicked
      });

    // Create a reference to the MSA menu group
    let menuGroupMsa = d3.select("#menu-group-msa");

    menuGroupMsa.attr('cursor', 'pointer')

    // Append a circle to the MSA menu group
    menuGroupMsa
      .append("circle")
      .attr("cx", d.x - 60)
      .attr("cy", d.y)
      .attr("id", "menu-circle-open-msa")
      .attr("filter", "drop-shadow(0px 3px 3px rgba(0, 0, 0, 1))")
      .attr("r", 15)
      .attr("fill", "#039be5");

    // Append a text label to the MSA menu group
    menuGroupMsa
      .append("text")
      .text("M")
      .attr("x", d.x - 60)
      .attr("y", d.y + 5)
      .attr("style", "0.1rem")
      .attr("text-anchor", "middle")
      .attr("fill", "white");

    // After 2000ms, remove the MSA and collapse menu groups
    d3.select("#menu-group-msa")
      .transition()
      .duration(2000)
      .remove();

    d3.select("#menu-group-collapse")
      .transition()
      .duration(2000)
      .remove();
  }


  mouseOver(e, d) {

    d3.selectAll(".node")
      .transition()
      .duration(200)
      .style("opacity", .5);

    d3.select(this)
      .transition()
      .duration(200)
      .style("opacity", 1)
      .style("stroke", "rgb(38, 222, 176)");

  }

  mouseLeaveNode(e, d) {

    d3.selectAll(".node")
      .transition()
      .duration(200)
      .style("opacity", 1);

    d3.select("#menu-circle")
      .transition()
      .duration(1000)
      .remove();

    d3.select(this)
      .transition()
      .duration(200)
      .style("stroke", "transparent");
  }

  /**
   * Generating the path for the Branch Extension.
   * @param  {Object} d
   * @return {string}
   */
  buildSvgString(d) {
    const mx = d.source.x;
    const my = d.source.y;

    const lx = d.target.x;
    const ly = d.target.y;

    const curveX = d.source.radius * Math.cos(d.target.angle);
    const curveY = d.source.radius * Math.sin(d.target.angle);

    const arcFlag = Math.abs(d.target.angle - d.source.angle) > Math.PI ? 1 : 0;

    const sweepFlag =
      Math.abs(d.source.angle) < Math.abs(d.target.angle) ? 1 : 0;

    return `M ${mx}, ${my} A${d.source.radius}, ${d.source.radius
      } ${0} ${arcFlag} ${sweepFlag} ${curveX}, ${curveY} L ${lx}, ${ly}`;
  }

  /**
   * Generating the path for the Branch Extension.
   * @param  {Object} d
   * @param  {Number} currentMaxRadius
   * @return {string}
   */
  buildEdgeExtension(d, currentMaxRadius) {
    const mx = d.x;
    const my = d.y;

    const lxMax = currentMaxRadius * Math.cos(d.angle);
    const lyMax = currentMaxRadius * Math.sin(d.angle);

    return `M ${mx}, ${my} L ${lxMax}, ${lyMax}`;
  }

  /**
   * Orienting to the right direction.
   * @param  {Object} d  ths link itself which itself stores the data
   * @param  {Number} currentMaxRadius maximal radius, of one tree, so that labels are in the right outer range
   * @return {string}
   */
  orientText(d, currentMaxRadius) {
    const angle = (d.angle * 180) / Math.PI;

    return `rotate(${angle}) translate(${currentMaxRadius}, 0) rotate(${angle < 270 && angle > 90 ? 180 : 0
      })`;
  }

  anchorCalc(d) {
    const angle = (d.angle * 180) / Math.PI;
    return angle < 270 && angle > 90 ? "end" : "start";
  }

  /**
   * Looks up the color for a given leaf name.
   *
   * @param {string} leafName - The name of the leaf.
   * @returns {string} The color associated with the leaf name, or the default label color if not found.
   */
  lookUpLeafColor(leafName) {
    /**
     * The color map object that associates leaf names with colors.
     * @type {object}
     */
    const leaveColorMap = TreeDisplay.leaveColorMap;

    /**
     * The default label color to be used if the leaf name is not found in the color map.
     * @type {string}
     */
    const defaultLabelColor = TreeDisplay.colorMap.defaultLabelColor;

    return leaveColorMap[leafName] || defaultLabelColor;
  }

  collapse(d) {

    const self = this; // Get a reference to your object.
  
    if (d.children) {
      d.collapsed = false;
      d._children = d.children;
      d._children.forEach((child) => {
        self.collapse(child);
      });
      d.children = null;
    }
  }

  click(e, d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
      d.collapsed = true;
    } else {
      d.children = d._children;
      d._children = null;
      d.collapsed = false;
    }
    this.updateEdges();
    this.updateExternalEdges();
    this.updateLeaveLabels();
    this.updateNodeCircles();
    this.updateEdgeValues();
  }

  /**
    * Method to update the display of a tree using the provided parameters.
    *
    * @param {object} tree - Contains the tree data and maximum radius for visualization.
    * @param {string}  - The ID of the DOM element where the tree is to be drawn.
    * @param {object} options - Contains optional parameters for tree visualization.
    * @returns {void}
    */
  updateDisplay(options) {

    // Update this instance's attributes if corresponding options are provided
    if ("fontSize" in options) {
      TreeDisplay.sizeMap.fontSize = `${options.fontSize}rem`;  // Update font size
    }
    if ('strokeWidth' in options) {
      TreeDisplay.sizeMap.strokeWidth = options.strokeWidth;  // Update stroke width
    }
    if ('drawDurationFrontend' in options) {
      this.drawDuration = options.drawDurationFrontend;  // Update drawing duration
    }
    if ('leaveOrder' in options) {
      this.leaveOrder = options.leaveOrder;  // Update the order of leaves
    }
    if ('leaveColorMap' in options) {
      TreeDisplay.leaveColorMap = options.leaveColorMap;  // Update the color mapping of leaves
    }
    if ('msaMatrix' in options) {
      TreeDisplay.msaMatrix = options.msaMatrix;  // Update MSA matrix
    }

    // Call this instance's methods to update visualization attributes
    this.updateEdges();  // Update the edges of the tree
    this.updateExternalEdges();  // Update the external edges of the tree
    this.updateLeaveLabels();  // Update the labels of the leaves
    this.updateNodeCircles();  // Update the node circles

    // Update edge values if displayEdgeValue option is provided
    if ('displayEdgeValue' in options) {
      this.updateEdgeValues(options.displayEdgeValue);
    }
  }

  // Getter for container
  get container() {
    return this._container;
  }

  // Setter for container
  set container(value) {
    this._container = value;
  }

  // Getter and Setter for currentMaxRadius
  get currentMaxRadius() {
    return this._currentMaxRadius;
  }

  set currentMaxRadius(value) {
    this._currentMaxRadius = value;
  }

  // Getter and Setter for leaveColorMap
  get leaveColorMap() {
    return this._leaveColorMap;
  }

  set leaveColorMap(value) {
    this._leaveColorMap = value;
  }

}

export class TreeMathUtils {

  /**
   * Converting Cartesian Coordinates to Polar Coordinates
   * @param  {Number} x -
   * @param  {Number} y -
   * @return {Object} Object with element r for radius and angle.
   */
  static kar2pol(x, y) {
    const radius = Math.sqrt(x ** 2 + y ** 2);
    let angle = Math.atan(y / x);
    if (x < 0) {
      angle += Math.PI;
    }
    if (x === 0) {
      angle = 0;
    }

    return {
      r: radius,
      angle: angle,
    };
  }

  /**
   * Get shortest angle between two points
   * @param  {Number} a -
   * @param  {Number} b -
   * @return {Number}.
   */
  static shortestAngle(a, b) {
    let v1 = b - a;
    let v2 = b - a - Math.sign(v1) * 2 * Math.PI;

    if (Math.abs(v1) < Math.abs(v2)) {
      return v1;
    } else {
      return v2;
    }
  }

  static calculateFontSize(count) {
    // Set the minimum and maximum font sizes
    const minFontSize = 1;
    const maxFontSize = 1;

    // Calculate the font size based on the count of elements
    const fontSize = minFontSize + (maxFontSize / count);

    // Return the calculated font size
    return fontSize;
  }

  static calculateRadius(count, svgWidth, svgHeight) {
    // Set the minimum and maximum radius values
    const minRadius = 10;
    const maxRadius = 50;

    // Calculate the radius based on the count of elements and the dimensions of the SVG
    const radius = Math.min(svgWidth, svgHeight) * (minRadius + (maxRadius - minRadius) * (count / 20)) / 200;

    // Return the calculated radius
    return radius;
  }

}



