# JSON Tree Input Format for Visualization

The JavaScript tree visualization (`TreeConstructor.js`) expects tree data in a specific JSON format. This document outlines that format. The structure is designed to be compatible with `d3.hierarchy`.

## Overall Structure

The tree is represented as a recursive JSON object. Each object is a node in the tree. Nodes can have children, which are also node objects.

## Key Properties for Each Node

Each node object in the JSON structure can have the following properties:

-   **`name`** (String, Mandatory)
    -   Description: The label or identifier for the node. This will be displayed for leaf nodes and can be used to identify internal nodes.
    -   Example: `"Leaf A"`, `"InternalNode_1"`

-   **`length`** (Number, Optional)
    -   Description: The branch length of this node to its parent. For the root node, the length is often conceptually 0 or not directly used in radius calculation by `TreeConstructor.js` (it sets the root's initial radius to 0 before accumulation). The `TreeConstructor` uses this value to determine the radial distance of child nodes from their parent if `ignoreBranchLengths` is false.
    -   Example: `0.1`, `2.5`

-   **`children`** (Array of Node Objects, Optional)
    -   Description: An array containing the child node objects of the current node. If this property is absent or is an empty array, the node is considered a leaf node.
    -   Example: `"children": [ { "name": "Child1", "length": 0.05 }, { "name": "Child2", "length": 0.07 } ]`

-   **`values`** (Object, Optional)
    -   Description: A key-value store for any arbitrary metadata associated with the node. This data can be used by `TreeDisplay.js` to display values on edges (if the key is specified in the `displayEdgeValue` option) or for other custom interactions.
    -   Keys should be strings. Values can be numbers or strings.
    -   Example: `"values": { "bootstrap": 95, "p_value": 0.001, "custom_metric": "high" }`
    -   If you have 2D coordinates from another analysis (e.g., PCA, t-SNE) that you wish to associate with leaves, you can include them here, for example: `"values": { "x_coord": 10.5, "y_coord": -2.3 }`. Note that `TreeConstructor.js` calculates its own x,y for the radial layout.

## Example JSON Tree

Here's an example of a simple tree in this JSON format:

```json
{
  "name": "Root",
  "length": 0,
  "children": [
    {
      "name": "InternalNode_A",
      "length": 0.1,
      "values": {
        "bootstrap": 90
      },
      "children": [
        {
          "name": "Leaf_1",
          "length": 0.05,
          "values": {
            "description": "Species X"
          }
        },
        {
          "name": "Leaf_2",
          "length": 0.06,
          "values": {
            "description": "Species Y"
          }
        }
      ]
    },
    {
      "name": "Leaf_3",
      "length": 0.12,
      "values": {
        "bootstrap": 100,
        "description": "Species Z"
      }
    }
  ]
}
```

This structure allows for a flexible representation of phylogenetic trees and associated metadata, suitable for processing with `d3.hierarchy` and subsequent visualization.
