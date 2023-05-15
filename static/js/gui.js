
export default class Gui {
  constructor(
    treeList,
    weightedRobinsonFouldsDistances,
    robinsonFouldsDistances,
    windowSize,
    windowStepSize,
    hightLightTaxaMap,
    leaveOrder,
    colorInternalBranches,
    fileName,
    taxaColorMap
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




  updateMain() {
    let tree = this.treeList[this.index];

    let d3tree = constructTree(
        tree, 
        this.ignoreBranchLengths, 
        'application-container'
      );

    if (this.index === 0) {
      this.colorIndex = 0;
    } else {
      if (this.index % 5 === 0 && this.firstFull === 0) {
        this.colorIndex = Math.floor(this.index / 5) - 1;
      } else {
        this.colorIndex = Math.floor(this.index / 5);
      }
    }

    drawTree(
      d3tree,
      this.hightLightTaxaMap[this.colorIndex],
      this.leaveOrder,
      this.fontSize,
      this.strokeWidth,
      "application",
      this.taxaColorMap
    );

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
