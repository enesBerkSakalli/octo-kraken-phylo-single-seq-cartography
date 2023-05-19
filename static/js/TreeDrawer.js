import ParseUtil from "./ParseUtil.js";
import * as d3 from "https://cdn.skypack.dev/d3@7";

/** Class For drawing Hierarchical Trees. */
export class TreeDrawer {

  static colorMap = {
    defaultColor: "white",
    markedColor: "red",
    strokeColor: "#4469FF",
    changingColor: "orange",
    defaultLabelColor: "white",
    extensionLinkColor: "black",
    userMarkedColor: "magenta",
  };

  static sizeMap = {
    strokeWidth: "1px",
    fontSize: "1em",
  };

  /**
   * Create a TreeDrawer.
   * @param _currentRoot
   */
  constructor(_currentRoot) {
    this._colorInternalBranches = true;
    this.root = _currentRoot;
    this.marked = [];
    this.leaveOrder = [];
    this._drawDuration = 1000;
    this._treeSpaceId = "";
    this._currentMaxRadius = 0;
  }

  static treeColorMap = {};

  static parser = new ParseUtil();

  /**
   * getter for the svg application container.
   * @return {Object}
   */
  getSvgContainer() {
    return d3.select(`#${this._treeSpaceId}`);
  }

  /**
   * Generating id for an edge by combining the name of the source node name and the target name
   * @param  {Object} link
   * @return {string}
   */
  getLinkId(link) {
    if (typeof link.target.data.name === "string") {
      return `link-${this._treeSpaceId}-${link.target.data.name}`;
    } else {
      return `link-${this._treeSpaceId}-${link.target.data.name.join("-")}`;
    }
  }

  /**
   * Generating the path for a leave.
   * @param  {Object} ancestor
   * @return {string|null}
   */
  generateLinkIdForLeave(ancestor) {
    if (ancestor.parent) {
      if (typeof ancestor.data.name === "string") {
        return `#link-${this._treeSpaceId}-${ancestor.data.name}`;
      } else {
        return `#link-${this._treeSpaceId}-${ancestor.data.name.join("-")}`;
      }
    } else {
      return null;
    }
  }

  /**
   * This function is drawing the branches of the trees.
   * @return {void}
   */
  updateEdges() {
    // JOIN new data with old svg elements.
    // Data Binding
    let edges = this.getSvgContainer()
      .selectAll(".links")
      .data(this.root.links(), (d) => { this.getLinkId(d) });

    // EXIT old elements not present in new data.
    edges.exit().remove();

    // ENTER new elements present in new data.
    edges
      .enter()
      .append("path")
      .style("stroke", 'rgb(55, 68, 105)')
      .attr("class", "links")
      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
      .attr("z-index", "-1")
      .attr("fill", "none")
      .attr("id", (d) => {
        return this.getLinkId(d);
      })
      .attr("source", (d) => {
        return d.source.data.name;
      })
      .attr("target", (d) => {
        return d.target.data.name;
      })
      .attr("d", (d) => {
        return this.buildSvgString(d);
      })
      .style("stroke-opacity", 1)
      .attr("neededHighlightingTaxa", 0);

    // UPDATE old elements present in new data.
    edges
      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
      .style("stroke", 'blue')
      .transition()
      .ease(d3.easeExpInOut)
      .duration(this.drawDuration);

  }

  /**
   * This function is drawing the extension of the branches in the trees.
   * @return {void}
   */
  updateExternalEdges() {
    // JOIN new data with old elements.
    const colorExternalEdges = this.getSvgContainer()
      .selectAll(".link-extension") //updates the links
      .data(this.root.leaves(), (link) => link.data.name);

    // UPDATE old elements present in new data.
    colorExternalEdges
      .transition()
      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
      .ease(d3.easeExpInOut)
      .duration(this.drawDuration)


    // ENTER new elements present in new data.
    colorExternalEdges
      .enter()
      .append("path")
      .attr("class", "link-extension")
      .style("stroke", 'rgb(55, 68, 105)')
      .attr("stroke-width", TreeDrawer.sizeMap.strokeWidth)
      .attr("stroke-dasharray", () => {
        return 5 + ",5";
      })
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
    let leaves = this.root.leaves();

    // JOIN new data with old svg elements
    let textLabels = this.getSvgContainer()
      .selectAll(".leave-label")
      .data(leaves, (d) => d.data.name);

    let fontSize = this.calculateFontSize(4);

    // UPDATE old elements present in new data
    textLabels
      .attr("transform", (d) => this.orientText(d, this.currentMaxRadius))
      .attr("text-anchor", (d) => this.anchorCalc(d))
      .style("font-size", `${fontSize}px`)
      .style("fill", (d) => this.lookUpLeafColor(d.data.name));;


    // ENTER new elements present in new data
    textLabels
      .enter()
      .append("text")
      .attr("class", "leave-label")
      .attr("id", (d) => `leave-label-${d.data.name}`)
      .attr("dy", ".31em")
      .style("font-size", `${fontSize}px`)
      .text((d) => `${d.data.name}`)
      .attr("transform", (d) => this.orientText(d, this.currentMaxRadius))
      .attr("text-anchor", (d) => this.anchorCalc(d))
      .attr("font-family", "Courier New")
      .style("fill", (d) => this.lookUpLeafColor(d.data.name));
  }


  updateBranchValues(value) {
    // Get all nodes from the hierarchy
    const edges = this.root.links();

    // JOIN new data with old svg elements
    const textLabels = this.getSvgContainer()
      .selectAll(".edge-value")
      .data(edges,
        (d) => `branch-value-${d.source.data.name}`
      );

    textLabels.exit().remove();

    let fontSize = this.calculateFontSize(8);

    // UPDATE old elements present in new data
    textLabels
      .attr("transform", (d) => this.orientText(d.target, (d.source.radius + d.target.radius) / 2))
      .attr("text-anchor", (d) => this.anchorCalc(d))
      .text((d) => this.getBranchValue(value, d))
      .style("font-size", `${fontSize}px`);

    // ENTER new elements present in new data
    textLabels
      .enter()
      .append("text")
      .attr("class", "edge-value")
      .attr("dy", "-1em")
      .style("font-size", `${fontSize}px`)
      .text((d) => this.getBranchValue(value, d))
      .attr("transform", (d) => this.orientText(d.target, (d.source.radius + d.target.radius) / 2))
      .attr("text-anchor", (d) => this.anchorCalc(d.target))
      //.attr("font-family", "Courier New")
      .style("fill", TreeDrawer.colorMap.defaultLabelColor);


  }

  getBranchValue(value, d) {
    if (value == "length") {
      return d.source.data.length;
    }
    else {
      if (d.target.data.values) {
        return d.source.data.values[value];
      }
    }

  }

  /**
   * Creates leaf circle nodes for the tree.
   *
   * @param  {Number} currentMaxRadius
   * @return {void}
   */
  updateNodeCircles() {
    const nodes = this.root;

    //getting leave names for creating legend
    // JOIN new data with old svg elements
    const nodeCircles = this.getSvgContainer()
      .selectAll(".node")
      .data(nodes, (d) => d.data.name);

    // UPDATE old elements present in new data
    nodeCircles
      .attr("cx", (d) => (d.x)) // * Math.cos(d.angle)) 
      .attr("cy", (d) => (d.y)) // * Math.cos(d.angle)) 

    let circleNodeRadius = (Math.sin(2 * Math.PI / this.root.leaves().length) * this.currentMaxRadius)
    circleNodeRadius = circleNodeRadius / (this.root.leaves().length / 2);

    // ENTER new elements present in new data
    nodeCircles
      .enter()
      .append("circle")
      .attr("id", (d) => `${this._treeSpaceId}!${d.data.name}`)
      .attr("class", "node")
      .attr("z-index", "1000")
      .attr("cx", (d) => (d.x)) // * Math.cos(d.angle)) 
      .attr("cy", (d) => (d.y)) // * Math.sin(d.angle)) 
      .style("fill", 'rgb(3, 192, 220')
      .attr("r", `${circleNodeRadius}px`)
      .on("click", (event) => {

        d3.json('../../static/test/simulated_test_mlt.json').then((msa) => {
          let node_taxon_list = event.target.id.split("!");
          node_taxon_list = node_taxon_list[1].split(",");

          let alignmentContainer = document.getElementById('msa-alignment-window');
          alignmentContainer.innerHTML = "";
          node_taxon_list.forEach((taxon) => {

            alignmentContainer.innerHTML += `
            <div class="sequence">
              <div class="id">${taxon}</div>
              <div class="letter">
                <span>${msa[taxon]}</span>
              </div>            
            </div>
            `;
          });

          UIkit.modal('#modal-sections').toggle(); //you can use toggle or open here

        });

      })
      .on("mouseover", this.mouseOver)
      .on("mouseleave", this.mouseLeaveNode);

  }

  mouseOver(d) {
    d3.selectAll(".Country")
      .transition()
      .duration(200)
      .style("opacity", .5)
    d3.select(this)
      .transition()
      .duration(200)
      .style("opacity", 1)
      .style("stroke", "rgb(38, 222, 176)")
  }

  mouseLeaveNode(d) {
    d3.selectAll(".Country")
      .transition()
      .duration(200)
      .style("opacity", .8)
    d3.select(this)
      .transition()
      .duration(200)
      .style("stroke", "transparent")
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
   * Generating the path for the Branch.
   * @param  {Object} d
   * @param  {Number} t
   * @param  {Array} pathArray
   * @return {string}
   */
  buildSvgStringTime(d, t, pathArray) {
    let old_startRadius = 0;
    let old_startAngle = 0;
    let old_endRadius = 0;
    let old_endAngle = 0;

    if (!!pathArray) {
      let old_start = TreeMathUtils.kar2pol(pathArray[0].x, pathArray[0].y);
      old_startRadius = old_start.r;
      old_startAngle = old_start.angle;
      let last = pathArray[pathArray.length - 1];
      let old_end = TreeMathUtils.kar2pol(last.x, last.y);
      old_endRadius = old_end.r;
      old_endAngle = old_end.angle;
    }

    let new_startAngle = d.source.angle;
    let new_endAngle = d.target.angle;
    let new_startRadius = d.source.radius;
    let new_endRadius = d.target.radius;

    let startDiff = TreeMathUtils.shortestAngle(old_startAngle, new_startAngle);
    let endDiff = TreeMathUtils.shortestAngle(old_endAngle, new_endAngle);

    let tween_startAngle = startDiff * t + old_startAngle;
    let tween_endAngle = endDiff * t + old_endAngle;
    let tween_startRadius =
      (new_startRadius - old_startRadius) * t + old_startRadius;
    let tween_endRadius = (new_endRadius - old_endRadius) * t + old_endRadius;

    // calculate values to draw the arc
    let rx = tween_startRadius;
    let ry = tween_startRadius;

    // coordinates before the arc
    let mx = tween_startRadius * Math.cos(tween_startAngle);
    let my = tween_startRadius * Math.sin(tween_startAngle);

    // coordinates after the arc
    let curveX = tween_startRadius * Math.cos(tween_endAngle);
    let curveY = tween_startRadius * Math.sin(tween_endAngle);

    // coordinates after the straight line
    let lx = tween_endRadius * Math.cos(tween_endAngle);
    let ly = tween_endRadius * Math.sin(tween_endAngle);

    let sweepFlag = 0;
    if (TreeMathUtils.shortestAngle(tween_startAngle, tween_endAngle) > 0) {
      sweepFlag = 1;
    }

    //let largeArcFlag = Math.abs(d.target.angle - d.source.angle) > Math.PI ? 1 : 0;
    const largeArcFlag = 0;
    const xAxisRotation = 0;

    return `M ${mx}, ${my} A${rx}, ${ry} ${xAxisRotation} ${largeArcFlag} ${sweepFlag} ${curveX}, ${curveY} L ${lx}, ${ly}`;
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

  lookUpLeafColor(leaveName) {
    if (leaveName in TreeDrawer.leaveColorMap) {
      return TreeDrawer.leaveColorMap[leaveName];
    } else {
      return TreeDrawer.colorMap.defaultLabelColor;
    }
  }

  /**
   * Set the time duration how one tree transforms to another.
   * @param  {Number} duration
   * @return {void}
   */
  set drawDuration(duration) {
    this._drawDuration = duration;
  }

  /**
   * Get the time duration how one tree transforms to another.
   * @return {Number}
   */
  get drawDuration() {
    return this._drawDuration;
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
  /**^
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

/**
 * Function to draw a tree using the provided parameters.
 *
 * @param {object} tree - The object containing the tree data and maximum radius for the tree visualization. It includes 'maxRadius' which denotes the maximum radius of the tree.
 * @param {string} treeSpaceId - The ID of the DOM element where the tree is to be drawn.
 * @param {object} options - An object containing optional parameters:
 *    fontSize: The font size for the tree visualization.
 *    strokeWidth: The stroke width for the tree visualization.
 *    drawDurationFrontend: The duration for the frontend draw.
 *    leaveOrder: Determines the order of leaves.
 *    leaveColorMap: Determines the color mapping of leaves.
 * @returns {void}
 */
export default function drawTree(
  tree,
  treeSpaceId,
  options,
) {
  // Extract the root and maximum radius from the tree
  let currentRoot = tree;
  let currentMaxRadius = tree.maxRadius;

  // Initialize a new TreeDrawer with the current root
  let currentTreeDrawer = new TreeDrawer(currentRoot);

  // Assign the treeSpaceId and currentMaxRadius to the TreeDrawer
  currentTreeDrawer._treeSpaceId = treeSpaceId;
  currentTreeDrawer.currentMaxRadius = currentMaxRadius;

  // Update optional TreeDrawer parameters if they are provided
  if ("fontSize" in options) {
    TreeDrawer.fontSize = options.fontSize;
  }
  if ('strokeWidth' in options) {
    TreeDrawer.sizeMap.strokeWidth = options.strokeWidth;
  }
  if ('drawDurationFrontend' in options) {
    currentTreeDrawer.drawDuration = options.drawDurationFrontend;
  }
  if ('leaveOrder' in options) {
    currentTreeDrawer.leaveOrder = options.leaveOrder;
  }
  if ('leaveColorMap' in options) {
    TreeDrawer.leaveColorMap = options.leaveColorMap;
  }

  // Execute tree drawing methods on the currentTreeDrawer
  currentTreeDrawer.updateEdges();
  currentTreeDrawer.updateExternalEdges();
  currentTreeDrawer.updateLeaveLabels();
  currentTreeDrawer.updateNodeCircles();

  if ('displayBranchValue' in options) {
    currentTreeDrawer.updateBranchValues(options.displayBranchValue);
  }
}