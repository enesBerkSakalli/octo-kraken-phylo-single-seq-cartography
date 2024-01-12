
export class Universe {

    constructor(camera, renderer, container, controller, scene, composer, gui, window) {
        this.camera = camera;
        this.renderer = renderer;
        this.container = container;
        this.controller = controller;
        this.scene = scene;
        this.composer = composer;
        this.gui = gui;
        this.window = window;
        this.singleMeshes = null;
        this.meshContainer = {};
    }

    getMeshes() {
        return this.singleMeshes;
    }

    setMeshes(mesh) {
        this.singleMeshes = mesh;
    }

    addMeshesToContainer(mesh, meshId) {
        this.meshContainer[meshId] = mesh;
    }

    getMeshesFromContainer(meshId) {
        return this.meshContainer[meshId];
    }

    deleteMeshesFromContainer(meshId) {
        delete this.meshContainer[meshId];
    }

}

export class CosmosController {

    constructor() {
        this.universes = new Map();
    }

    registerUniverse(universeId, universe) {
        this.universes.set(universeId, universe);
    }

    getUniverseById(universeId) {
        return this.universes.get(universeId);
    }

    checkIfUniverseExists(universeId) {
        return this.universes.has(universeId);
    }

}


export function animateUniverse(universe) {

    let controls = universe.controller;
    let scene = universe.scene;
    let renderer = universe.renderer;
    let camera = universe.camera;

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}

