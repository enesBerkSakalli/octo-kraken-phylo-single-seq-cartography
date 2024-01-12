/**
 * Handles the generation and placement of the list item for data options.
 * Fetches data options, creates a new list item with these options,
 * adds the created item to the branch values vector, 
 * and sets up a listener for changes on the branch value selector.
 *
 * @param {Object} tree - The tree object from which to derive data options.
 * @param {Object} leafColorMap - The color map for leaf nodes in the tree.
 * @return {void}
 */
function handleDataOptionsList(tree, leafColorMap) {
    // Extract data options from the tree.
    let dataOptions = getDataOptions(tree);

    // Create a new list item with the extracted data options.
    let listItem = createListItem(dataOptions);

    // Add the new list item to the branch values vector.
    addToBranchValuesVector(listItem);

    // Setup a listener for changes on the branch value selector.
    addBranchValueSelectorListener(tree, leafColorMap);
}

/**
 * Extracts data options from the tree and adds the 'length' option.
 * 
 * @param {Object} tree - The tree data.
 * @return {Array} The array of data options.
 */
function getDataOptions(tree) {
    let { values = {} } = tree.data;
    let dataOptionsArray = Object.keys(values);
    dataOptionsArray.push('length');

    return dataOptionsArray;
}

/**
* Creates the HTML for an option element.
* 
* @param {string} optionValue - The value for the option.
* @return {string} The option HTML string.
*/
function createOptionElement(optionValue) {
    return `<option>${optionValue}</option>`;
}

/**
 * Creates and returns a new list item element.
 * 
 * @param {Array} dataOptions - The data options for the list.
 * @return {Object} The created list item element.
 */
function createListItem(dataOptions) {
    let li = document.createElement("li");
    let options = dataOptions.map(createOptionElement).join('');

    li.innerHTML = `<div class="uk-margin">
                    <div class="uk-form-controls">
                      <select id="selector-option-branch-value" class="uk-select" id="form-stacked-select">
                        <option></option>
                        ${options}
                      </select>
                    </div>
                  </div>`;

    return li;
}

/**
* Adds the list item to the branch values vector.
* @param {Object} li - The list item element.
*/
function addToBranchValuesVector(li) {
    let branchValuesVector = document.getElementById("branch-values-vector");
    branchValuesVector.appendChild(li);
}

/**
 * Adds the change event listener to the branch value selector.
 * 
 * @param {Object} tree - The tree data.
 * @param {Object} leafColorMap - The leaf color map.
 */
function addBranchValueSelectorListener(tree, leafColorMap) {
    document.getElementById('selector-option-branch-value').addEventListener('change', (e) => {

        treeDisplay.updateDisplay({
            'displayEdgeValue': e.target.value,
        })

    });
}

function getLeaveColor(leaves) {
    let colorMap = {};
    leaves.forEach((leave) => {
        let name = leave.data.name;
        let color = document.getElementById(`taxa-${name}`).value;
        colorMap[name] = color;
    });
    return colorMap;
}

function getGroupColor() {
    let colorMap = {};
    document.querySelectorAll(".group-color").forEach((element) => {
        colorMap[element.dataset.group] = element.value;
    });
    return colorMap;
}

function zoomed({ transform }) {
    let xZoomedTransform = (width / 2) + (transform.x / 2);
    let yZoomedTransform = (height / 2) + (transform.y / 2);
    d3.select('#application').attr("transform", `translate(${xZoomedTransform}, ${yZoomedTransform})` + "scale(" + transform.k + ")");
}

function accessLeaveNames(leaves) {
    return leaves.map((leave) => { return leave.data.name; });
}

function groupLeaves(leaves, separator) {
    let groups = new Set();

    if (separator == "first") {

        leaves.forEach((leave) => {
            groups.add(leave.data.name[0]);
        });

    } else {

        leaves.forEach((leave) => {
            let group = leave.data.name.split(separator);
            groups.add(group[0]);
        });

    }

    return groups;

}

function setZoom() {
    d3.select('#application-container').call(
        d3.zoom().on("zoom", zoomed)
    );
}


/**
* This function is used to convert a groupColorMap into a leaveColorMap.
* It iterates over the leaves and extracts the group of each leaf based on the provided separator.
* It then assigns the color of that group to the leaf in the new color map.
* 
* @param {Object} groupColorMap - The map of group names to colors.
* @param {Array} leaves - An array of leaf nodes from the tree.
* @param {String} separator - The character(s) that separates group name from the rest of the leaf name. 
*                             If "first", the first character of the leaf name is used as the group name.
* 
* @return {Object} colorMap - A map of leaf names to colors.
*/
function convertGroupColorMapToLeafColorMap(groupColorMap, leaves, separator) {
    let colorMap = {};

    leaves.forEach((leaf) => {
        let leafName = leaf.data.name;
        let groupName;

        if (separator === "first") {
            groupName = leafName[0];
        } else {
            groupName = leafName.split(separator)[0];
        }

        let groupColor = groupColorMap[groupName];
        colorMap[leafName] = groupColor;
    });

    return colorMap;
}


export default function initializeLeafColorMap(leaves) {
    let colorMap = {};
    leaves.forEach((leave) => {
        let name = leave.data.name;
        colorMap[name] = "#00000";
    });
    return colorMap;
}