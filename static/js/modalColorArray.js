

function SelectorColoringMode() {
    return ` 
    <div >
      <select id="coloring-mode-selector" aria-label="Custom controls">
        <option value="1">Taxa</option>
        <option value="2">Groups</option>
      </select>
    </div>`
}

export default function ModalColorArray(root) {
    let leaves = root.leaves();

    document.getElementById("color-section").innerHTML = `
    <div id="color-selection-modal" uk-modal container="color-section">
      <div class="uk-modal-dialog uk-modal-body">
          <div class="uk-child-width-1-3@s uk-grid-small uk-text-center" uk-grid>
            ${SelectorColoringMode()}   
            <div id="separator-selector-container" class="uk-tile uk-tile-default uk-padding-remove"></div>
            <div id="group-button" class="uk-tile uk-tile-default uk-padding-remove"></div>
        </div>

        <div id="color-array-container" class="uk-child-width-1-3@s uk-grid-small uk-text-center" uk-grid>
            ${TaxaColorArray(accessLeaveNames(leaves))}
        </div>
        
        <div id="color-array-container" class="uk-child-width-1-3@s uk-grid-small uk-text-center" uk-grid>
            ${ApplyColorButton()}  
        </div>

      </div>
    </div>`;

    document.getElementById("button-row").innerHTML = AssignColorButton();

    document.getElementById("coloring-mode-selector").addEventListener("change", (event) => {

        if (event.target.value == 1) {
            document.getElementById("color-array-container").innerHTML = TaxaColorArray(accessLeaveNames(leaves));
            document.getElementById("separator-selector-container").innerHTML = ``;
            document.getElementById("group-button").innerHTML = ``;
        }

        if (event.target.value == 2) {

            document.getElementById("separator-selector-container").innerHTML = SeparatorSelector();
            document.getElementById("group-button").innerHTML = GroupBySeparatorSelectorButton();
            document.getElementById("group-button").addEventListener("click", (e) => {
                let separator = document.getElementById("separator-select-button").value;
                let group = groupLeaves(leaves, separator);
                document.getElementById("color-array-container").innerHTML = GroupColorArray(group);
            });

        }
    },
        false
    );

    document.getElementById("apply-color-button").addEventListener("click", (e) => {

        if (document.getElementById("coloring-mode-selector").value == 1) {
            leafColorMap = getLeaveColor(leaves);
        } else {
            groupColorMap = getGroupColor();
            leafColorMap = convertGroupColorMapToLeafColorMap(groupColorMap, leaves, document.getElementById('separator-select-button').value);
        }

        treeDisplay.updateDisplay({
            'leaveColorMap': leafColorMap,
        });

    });

}

function AssignColorButton() {
    return `<a id="color-group-action" href="#" uk-toggle="target: #color-selection-modal">
              <span class="uk-margin-small-right" uk-icon="icon: paint-bucket"></span> Assign Colors
            </a>`;
}

function ApplyColorButton() {
    return `<div id="apply-color-button" class="uk-button uk-button-default">
              Apply  
            </div>`
}

function GroupBySeparatorSelectorButton() {
    return `<div class="form-group row py-2">
              <div class="col p-0">
                  <a href="#" id="group-button" class="uk-button uk-button-default">
                      Group
                  </a>
              </div>
            </div>`
}

function SeparatorSelector() {
    return `<div class='button-container'">
                    <select id="separator-select-button" aria-label="Custom controls" name="separator">
                        <option value="-">-</option>
                        <option value="_">Underscore</option>
                        <option value="first">First Letter</option>
                    </select>
                </div>
            `
}

function GroupColorArray(elements) {
    let elementContainer = "";
    elements.forEach((element) => {
        elementContainer += `
            <div class="uk-tile uk-tile-default uk-padding-remove">
                <div>
                    ${element}
                </div>
                <div>
                    <input id="group-${element}" type="color" name="group-color-${element}" value=""#000000" class="group-color" data-group="${element}">
                </div>
            </div>
                `;
    });
    return elementContainer;
}

function TaxaColorArray(elements) {
    let elementContainer = "";
    elements.forEach((element) => {
        elementContainer += `
            <div class="uk-tile uk-tile-default uk-padding-remove">
                <div>
                    ${element}
                </div>
                <div>
                    <input id="taxa-${element}" type="color" name="taxa-color-${element}" value="#000000">
                </div>
            </div>
                `;
    });
    return elementContainer;
}



