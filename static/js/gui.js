
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

    let d3tree = constructTree(
      tree,
      this.ignoreBranchLengths,
      'application-container'
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
