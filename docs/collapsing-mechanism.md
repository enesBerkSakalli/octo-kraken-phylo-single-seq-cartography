# Node Collapsing Mechanism in TreeDisplay.js

The `TreeDisplay.js` module allows users to interactively collapse and expand subtrees within the phylogenetic visualization. This document explains the underlying mechanism.

## Core Concept: Data State Management

The collapsing feature relies on manipulating the data associated with each node in the D3.js hierarchy. D3's data join capabilities then automatically update the SVG rendering to reflect these data changes.

Key properties on a D3 node object (`d`) involved in collapsing:

-   **`d.children`**: An array containing the node's visible children. If `null` or empty, the node is a leaf or a collapsed internal node (from the perspective of rendering its own children).
-   **`d._children`**: A temporary storage property. When a node is collapsed, its original `d.children` array is moved to `d._children`. When expanded, `d.children` is restored from `d._children`.
-   **`d.collapsed`** (Boolean, optional flag): A flag that can be set to `true` when a node is collapsed. While not strictly necessary for D3's data join on `d.children` to work, it can be useful for styling or other logic.

## User Interaction: The `click(e, d)` Method

The `click(e, d)` method is typically bound to interactive elements representing internal nodes (e.g., the small circles drawn by `updateNodeCircles` or the visual collapse indicators themselves).

When an interactive element for node `d` is clicked:

1.  **Toggle State:**
    *   **If `d.children` exists (node is currently expanded):**
        1.  `d._children = d.children;` (Store the actual children away).
        2.  `d.children = null;` (Tell D3 this node now has no visible children).
        3.  `d.collapsed = true;` (Mark as collapsed).
        4.  A visual indicator (a wedge or arc) is drawn at node `d`'s position using `createArcPath(d)`. This marker is given an ID like `triangle-${d.data.name}`.
    *   **If `d._children` exists (node is currently collapsed):**
        1.  `d.children = d._children;` (Restore the children).
        2.  `d._children = null;` (Clear the temporary storage).
        3.  `d.collapsed = false;` (Mark as expanded).
        4.  The visual collapse indicator (e.g., element with ID `triangle-${d.data.name}`) is removed from the SVG.

2.  **Trigger SVG Update:** After modifying the data, rendering methods are called:
    *   `this.updateEdges();`
    *   `this.updateExternalEdges();`
    *   `this.updateLeaveLabels();`
    *   `this.updateNodeCircles();`
    *   (And potentially `this.updateEdgeValues()` if active).

    These methods use D3's data joins. For example, `this.root.links()` will now return a different set of links if a subtree is collapsed (links within the collapsed part are gone). D3's `.exit().remove()` will remove SVG elements for disappearing links/nodes, and `.enter().append()` will add them for newly visible ones.

## Visual Indicator for Collapsed Nodes (`createArcPath`)

-   When an internal node is collapsed, the `click` method calls `createArcPath(d)` to generate an SVG path string for a wedge-like shape.
-   This path is drawn using `d3.arc()`. It creates an arc segment that:
    -   Starts at the collapsed node's radius (`d.radius`).
    -   Extends outwards to the maximum radius of the tree (`this.currentMaxRadius`).
    -   Spans an angle from the angle of the first leaf in the collapsed subtree to the angle of the last leaf in that subtree.
-   This wedge is typically styled with a distinct fill color (e.g., orange) and is also made clickable to allow re-expansion.

## Initial Collapse State (`collapse(d)` method)

-   The `TreeDisplay` constructor calls `this.collapse(this.root.children)`.
    -   *Note: As previously identified, this call is likely incorrect. It should probably be `this.root.children.forEach(child => this.collapse(child));` or `this.collapse(this.root);` if the intent is to recursively collapse all children from a certain level, or to set an initial state.*
-   The `collapse(d)` method itself is a recursive function:
    -   If `d` has children, it moves `d.children` to `d._children`.
    -   It then recursively calls `collapse` for each of these "hidden" children.
    -   Finally, it sets `d.children = null`.
-   The purpose is to set an initial collapsed state for parts of the tree when it's first drawn, if desired. However, without visual indicators being drawn during this initial data setup, the user wouldn't see them as collapsed until they interact or `collapseToDepth` is called.

## Collapsing to a Specific Depth (`collapseToDepth(depth)`)

-   This method iterates over all nodes in the tree (`this.root.each(...)`).
-   For each `node`:
    -   **If `node.depth > depth` (deeper than target):**
        -   If it has visible children (`node.children`), they are moved to `node._children`, and a visual collapse indicator (`triangle-${node.data.name}`) is drawn for `node`.
        -   Any descendants that were already marked as `collapsed` (e.g. from a previous `click`) are programmatically expanded (their `_children` restored to `children` and their triangle marker removed) before the current `node` itself is collapsed. This ensures a clean collapse state at the target `node`.
    -   **Else (node.depth <= depth):**
        -   If the node has `_children` (meaning it was previously collapsed), it's expanded by restoring `node.children = node._children;` and removing its visual indicator.
-   After iterating through all nodes and adjusting their `children`/`_children` state, the standard `update...` rendering methods are called to refresh the entire SVG display.

This mechanism provides a flexible way to manage complex tree views by allowing users to focus on specific parts of the tree.
