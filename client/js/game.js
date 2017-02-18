/// <reference path="pixi.js" />

var vector = {
    mult: function multiply(vec, x) {
        return { x: vec.x * x, y: vec.y * x };
    },
    elemMult: function elementwiseMultiply(veca, vecb) {
        return { x: veca.x * vecb.x, y: veca.y * vecb.y };
    },
    dot: function dot(veca, vecb) {
        return veca.x * vecb.x + veca.y * vecb.y;
    },
    sub: function subtract(veca, vecb) {
        return { x: veca.x - vecb.x, y: veca.y - vecb.y };
    },
    add: function add(veca, vecb) {
        return { x: veca.x + vecb.x, y: veca.y + vecb.y };
    },
    neg: function subtract(vec) {
        return { x: -vec.x, y: -vec.y };
    },
    len: function length(vec) {
        return Math.sqrt(vector.dot(vec, vec));
    },
    rot: function rotate(vec, theta) {
        var s = Math.sin(theta);
        var c = Math.cos(theta);
        return { x: vec.x * c - vec.y * s, y: vec.x * s + vec.y * c };
    },
    norm: function normalise(vec) {
        return vector.mult(vec, 1 / (vector.len(vec) || 1));
    }
};

class Game {
    constructor() {
        this.view = {
            screen: document.getElementById('game')
        };

        var setting = localStorage.getItem("settings");
        this.setting = setting ? JSON.parse(setting) : {};

        this.scale = window.devicePixelRatio;
        this.resolution = { x: this.view.screen.clientWidth * this.scale, y: this.view.screen.clientHeight * this.scale };
        this.origin = { x: 0, y: 0 };
        this.camera = { x: 0, y: 0 };

        this.time = { start: -1, last: 0 };

        this.loaded = false;

        this.root = new PIXI.Container();

        this.renderer = PIXI.autoDetectRenderer(this.resolution.x, this.resolution.y, { resolution: this.scale });
        this.renderer.autoResize = true;

        this.sprite = {};
        this.stage = 0;

        this.view.screen.appendChild(this.renderer.view);
    }

    load() {
        PIXI.loader.add("logo", "/img/logo.png").load(this.init.bind(this));
    }

    init() {
        this.sprite.logo = new PIXI.Sprite(PIXI.utils.TextureCache["logo"]);
        this.sprite.logo.alpha = 0;
        this.sprite.logo.anchor.set(0.5);

        this.root.addChild(this.sprite.logo);
    }

    update(time) {
        var dtime = time - this.time.last;

        switch (this.stage) {
            case 0: // splash screen
                if (time > 5) {
                    this.stage = 1; // splash screen only lasts 5 seconds
                    break;
                }

                this.sprite.logo.alpha = 1 - Math.abs(2.5 - time) * Math.abs(2.5 - time) / 6.25;

                break;
        }

        this.time.last = time;
    }

    render(ptime) {
        this.update((ptime - this.time.start) / 1000);
        this.hAnimFrame = requestAnimationFrame(this.render.bind(this));
        
        var transform = new PIXI.Transform();
        this.root.position.set(this.resolution.x / 2 - this.camera.x, this.resolution.y / 2 - this.camera.y);

        this.renderer.render(this.root, null, true, transform);
    }

    start() {
        this.time.start = performance.now();
        this.render(this.time.start);
    }

    stop() {
        cancelAnimationFrame(this.hAnimFrame);
    }
}

var game = new Game();
game.load();
game.init();
game.start();
