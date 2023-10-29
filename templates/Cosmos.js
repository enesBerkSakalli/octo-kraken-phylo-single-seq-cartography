
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
