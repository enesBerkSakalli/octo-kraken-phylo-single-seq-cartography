# TreeDisplay.js Options

The `TreeDisplay.js` class provides a method `updateDisplay(options)` which accepts an options object to customize the tree visualization. This document details the key available options.

## Options Object

The `options` parameter for `updateDisplay(options)` is a JavaScript object.

### Key Options

-   **`fontSize`** (String)
    -   Description: Sets the font size for labels (leaf names, edge values) on the tree.
    -   Expected Data Type: String representing a valid CSS font size (e.g., '1rem', '12px', '0.8em').
    -   Default: Handled internally by `TreeDisplay` (initial calculation based on tree size, can be overridden).
    -   Example: `{ fontSize: '0.9rem' }`

-   **`strokeWidth`** (String)
    -   Description: Sets the stroke width for the tree branches (edges).
    -   Expected Data Type: String representing a valid CSS stroke width (e.g., '1px', '2.5px').
    -   Default: `'1px'` (from `TreeDisplay.sizeMap` initialization, now `this.sizeMap`).
    -   Example: `{ strokeWidth: '1.5px' }`

-   **`leaveColorMap`** (Object)
    -   Description: An object used to assign specific colors to leaf labels and their corresponding external edge extensions.
    -   Expected Data Type: Object where keys are leaf names (strings matching `node.data.name` for leaves) and values are color strings (e.g., 'red', '#FF0000', 'rgb(0,0,255)').
    -   Default: `{}` (empty object, meaning default label color is used).
    -   Example: `{ leaveColorMap: { "Leaf_1": "green", "Leaf_2": "#D2691E" } }`

-   **`msaMatrix`** (Array)
    -   Description: Provides the data for the Multiple Sequence Alignment (MSA) modal that can be opened by clicking on a node's menu.
    -   Expected Data Type: An array of objects. Each object represents a sequence and should have at least:
        -   `id` (String): The identifier for the sequence, which should match a taxon name present in the tree (leaf or internal node name if MSAs are for internal nodes).
        -   `sequence` (String): The biological sequence string (e.g., DNA, protein).
    -   Default: `[]` (empty array).
    -   Example:
        ```javascript
        {
          msaMatrix: [
            { "id": "Leaf_1", "sequence": "ATGCGT..." },
            { "id": "Leaf_2", "sequence": "ATTCGA..." }
          ]
        }
        ```

-   **`displayEdgeValue`** (String)
    -   Description: Specifies which value associated with nodes should be displayed as labels on the tree edges/branches.
    -   Expected Data Type: String. This string can be:
        -   `'length'`: To display the branch length (`node.data.length`).
        -   A key from the `node.data.values` object (e.g., `'bootstrap'`, `'p_value'`).
    -   Default: No edge values are displayed by default unless this option is provided.
    -   Example: `{ displayEdgeValue: 'bootstrap' }` or `{ displayEdgeValue: 'length' }`

-   **`colorMode`** (String)
    -   Description: Controls the coloring scheme for tree edges, typically used in conjunction with `displayEdgeValue`.
    -   Expected Data Type: String.
        -   `'regular'`: Edges are drawn with the default stroke color (e.g., black).
        -   Any other string (conventionally, a value like `'gradient'` or specific to the interpolation like `'interpolatePlasma'` if `setGradientForEdges` is active): Enables gradient coloring of edges based on the numerical value specified by `displayEdgeValue`. The gradient is typically from a cool to warm color scale (e.g., `d3.interpolatePlasma`).
    -   Default: Assumed `'regular'` if not specified or if `displayEdgeValue` is not set for gradient.
    -   Example: `{ displayEdgeValue: 'length', colorMode: 'gradient' }`

-   **`mode`** (String)
    -   Description: Influences certain display aspects, particularly for nodes.
    -   Expected Data Type: String.
        -   `'classical-phylo'`: In this mode, internal node circles might be hidden to give a more traditional phylogenetic tree appearance.
        -   Other values might enable the display of clickable circles on internal nodes.
    -   Default: Varies; if not set, node circles for internal nodes are typically displayed.
    -   Example: `{ mode: 'classical-phylo' }`

## Example Usage

```javascript
// Assuming 'treeDisplayInstance' is an instance of TreeDisplay
// and 'currentTreeData' is the processed D3 hierarchy.

let displayOptions = {
  fontSize: '10px',
  strokeWidth: '2px',
  leaveColorMap: {
    'Human': 'blue',
    'Chimp': 'lightblue'
  },
  msaMatrix: [ /* ... MSA data ... */ ],
  displayEdgeValue: 'bootstrap',
  colorMode: 'gradient', // Color edges by bootstrap value
  mode: 'interactive' // Or some mode that shows node circles
};

treeDisplayInstance.updateDisplay(displayOptions);
```

These options allow for dynamic customization of the tree's appearance and the data it presents.
