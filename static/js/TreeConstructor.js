/** Class for generating coordinates for every tree. */
export class TreeConstructor {
  constructor(root, ignore_branch_lengths = false) {
    //node element of d3

    this.root = root;
    this.ignore_branch_lengths = ignore_branch_lengths;

    //width of container
    this.containerWidth = 0;
    //height of container
    this.containerHeight = 0;
    this.margin = 0;
    this.scale = 0;
  }

  /**
   * Traversing the tree and getting the index of every node, which will be later used for the calculation of the layout of the tree.
   * @param node
   * @param i
   * @return {Number}
   */
  traverse(node, i = 0) {
    const self = this; // Get a reference to your object.
    if (!("children" in node)) {
      node.index = i;
      i++;
    }
    if (node.children) {
      node.children.forEach(function (child) {
        i = self.traverse(child, i);
      });
    }
    return i;
  }

  /**
   * calculating the radius for every node
   * @param  {Object} node
   * @param  {Number} radius
   * @return {void}
   */
  calcRadius(node, radius = 0) {
    let length = node.data.length;

    if (this.ignore_branch_lengths) {
      length = 1;
    }

    node.radius = length + radius;
    if (node.children) {
      node.children.forEach((child) => {
        this.calcRadius(child, node.radius);
      });
    }
  }

  /**
   * calculating recursively  every angle for every node
   * @param node
   * @param angle
   * @param  {Number} countLeaves
   * @return {Number}
   */
  calcAngle(node, angle, countLeaves) {
    const self = this; // Get a reference to your object.
    if (!node.children) {
      node.angle = (angle / countLeaves) * node.index;
    } else {
      const childrenAngle = [];

      node.children.forEach((node) => {
        childrenAngle.push(self.calcAngle(node, angle, countLeaves));
      });

      node.angle = 0;

      childrenAngle.forEach((angle) => {
        node.angle = node.angle + angle;
      });

      node.angle = node.angle / childrenAngle.length;

      node.children.forEach((child) => {
        child.parent_angle = node.angle;
      });
    }

    return node.angle;
  }

  /**
   * setting width and height for tree
   * @param  {Number} width
   * @param  {Number} height
   * @return {void}
   */
  setDimension(width, height) {
    this.containerWidth = width;
    this.containerHeight = height;
  }

  /**
   * setting the margin how the tree should be displayed
   * @return {void}
   * @param margin
   */
  setMargin(margin) {
    this.margin = margin;
    this.containerWidth = this.containerWidth - this.margin;
    this.containerHeight = this.containerHeight - this.margin;
  }

  /**
   * generating the coordinates of every tree
   * @param  {Object} root
   * @return {void}
   */
  generateCoordinates(root) {
    root.each(function (d) {
      d.x = d.radius * Math.cos(d.angle);
      d.y = d.radius * Math.sin(d.angle);
    });
  }

  /**
   * get max radius of all leaves.
   * @param  {Object} root
   * @return {Number}
   */
  getMaxRadius(root) {
    let maxRadius = 0;
    root.leaves().forEach(function (d) {
      if (d.radius > maxRadius) {
        maxRadius = d.radius;
      }
    });
    return maxRadius;
  }

  /**
   * scaling the radius, by the information of the height and width of the container where the tree should be displayed
   * @param  {Object} root
   * @param scale
   * @return {void}
   */
  scaleRadius(root, scale) {
    root.each(function (d) {
      d.radius = d.radius * scale;
    });
  }

  /**
   * scaling the radius, by the information of the height and width of the container where the tree should be displayed
   * @param  {Number} width
   * @param  {Number} height
   * @return {Number}
   */
  getMinDimension(width, height) {
    return Math.min(width, height);
  }

  /**
   * generating radial tree. Returns the tree with the coordinates to generate a tree with a radial Layout.
   * @return {root}
   */
  constructRadialTree() {
    this.root.data.length = 0;

    this.calcRadius(this.root, 0);

    this.traverse(this.root);

    this.calcAngle(this.root, Math.PI * 2, this.root.leaves().length);

    const minWindowSize = this.getMinDimension(
      this.containerWidth,
      this.containerHeight
    );

    const maxRadius = this.getMaxRadius(this.root);

    this.scale = this.calcScale(minWindowSize, maxRadius, 2);

    this.scaleRadius(this.root, this.scale);

    this.generateCoordinates(this.root);

    return this.root;
  }

  /**
   * calculates the scale of how of the tree should be scale by including the maximal Radius, minWindowSize, and a factor.
   * @param  {Number} minWindowSize
   * @param  {Number} maxRadius
   * @param  {Number} factor
   * @return {Number}
   */
  calcScale(minWindowSize, maxRadius, factor) {
    return minWindowSize / factor / maxRadius;
  }
}

/**
 * Constructs a radial tree by using a TreeConstructor instance. This function handles tree creation and layout settings.
 *
 * @param {Object} tree - The tree data to visualize, structured as a d3.hierarchy object.
 * @param {boolean} ignoreBranchLengths - Whether to ignore the lengths of branches when constructing the tree.
 * @param {string} container - The ID of the HTML container where the tree will be visualized.
 * @param {Object} options - An object containing optional parameters to define the size and margin of the tree.
 *    width: Width of the container. If not provided, it will be determined by the clientWidth of the container.
 *    height: Height of the container. If not provided, it will be determined by the clientHeight of the container.
 *    margin: Margin of the container. If not provided, it will be determined by the smaller dimension (width or height) of the container.
 * @returns {Object} The constructed tree.
 */
export default function constructTree(tree, ignoreBranchLengths, container, options = {}) {

  // Creates a TreeConstructor instance with the given tree and branch length setting
  let treeConstructor = new TreeConstructor(d3.hierarchy(tree), ignoreBranchLengths);

  // Retrieve the HTML container for tree visualization using its ID
  let applicationContainer = document.getElementById(container);
  if (!applicationContainer) {
    // If the container is not found, throw an error
    throw new Error(`No element found with id ${container}`);
  }

  // Get the width of the container. If 'width' is specified in options, use it instead
  let width = applicationContainer.clientWidth;
  if ('width' in options) {
    width = options['width'];
  }


  // Get the height of the container. If 'height' is specified in options, use it instead
  let height = applicationContainer.clientHeight;
  if ('height' in options) {
    height = options['height'];
  }

 
  // Calculate the margin for the container. It is 20% of the smaller dimension of the container
  // If 'margin' is specified in options, use it instead
  let margin = width < height ? width * 0.20 : height * 0.20;
  if ('margin' in options) {
    margin = options['margin'];
  }

  // Set the dimensions and margins for the TreeConstructor instance
  treeConstructor.setDimension(width, height);
  treeConstructor.setMargin(margin);

  // Construct the radial tree using the TreeConstructor instance
  let root_ = treeConstructor.constructRadialTree();

  // Get the maximum radius from the constructed tree and assign it to the root node
  root_.maxRadius = treeConstructor.getMaxRadius(root_);

  // Return the root node of the constructed tree
  return root_
}