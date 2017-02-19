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
let tints = [0xFF9999, 0xFFFF99, 0x99FF99, 0x9999FF, 0xFFCC99, 0xFF99CC];

class Keyboard {
    constructor(keyCode) {
        this.code = keyCode;
        this.isDown = false;
        this.isUp = true;
        this.onpress = undefined;
        this.onrelease = undefined;
        //The `downHandler`
        this.downHandler = function (event) {
            if (event.keyCode === this.code) {
                if (this.isUp && this.press) this.press();
                this.isDown = true;
                this.isUp = false;

                event.preventDefault();
            }
        };

        //The `upHandler`
        this.upHandler = function (event) {
            if (event.keyCode === this.code) {
                if (this.isDown && this.release) this.release();
                this.isDown = false;
                this.isUp = true;

                event.preventDefault();
            }
        };

        //Attach event listeners
        window.addEventListener(
          "keydown", this.downHandler.bind(this), false
        );
        window.addEventListener(
          "keyup", this.upHandler.bind(this), false
        );
        return key;
    }
}

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
        PIXI.loader
            .add("logo", "/img/logo.png")
            .add("tree-light", "/img/tree-light.png")
            .add("tree-dark", "/img/tree-dark.png")
            .add("player-right", "/img/player-right.png")
            .add("player-left", "/img/player-left.png")
            .add("player-front", "/img/player-front.png")
            .add("player-back", "/img/player-back.png")
            .load(this.init.bind(this));
    }

    init() {
        this.sprite.logo = new PIXI.Sprite(PIXI.utils.TextureCache["logo"]);
        this.sprite.logo.alpha = 0;
        this.sprite.logo.anchor.set(0.5);
        this.sprite.logo.position.set(this.resolution.x / 2, this.resolution.y / 2);

        this.root.addChild(this.sprite.logo);
    }

    update(time) {
        var dtime = time - this.time.last;

        switch (this.stage) {
            case 0: // splash screen
                if (time > 0) {
                    this.stage = 1; // splash screen only lasts 5 seconds
                    break;
                }

                this.sprite.logo.alpha = 1 - Math.abs(2.5 - time) * Math.abs(2.5 - time) / 6.25;

                break;
            case 1: // skip title screen for now
                this.root.removeChildren();
                this.generateLevel();

                this.stage = 2;

                break;
            case 2:
                break;
        }

        this.time.last = time;
    }

    render(ptime) {
        this.update((ptime - this.time.start) / 1000);
        this.hAnimFrame = requestAnimationFrame(this.render.bind(this));

        this.renderer.render(this.root, null, true);
    }

    start() {
        this.time.start = performance.now();
        this.render(this.time.start);
    }

    stop() {
        cancelAnimationFrame(this.hAnimFrame);
    }

    generateLevel() {
        var background = new PIXI.Graphics();
        background.beginFill(0x06A500);
        background.drawRect(0, 0, this.resolution.x, this.resolution.y);
        this.root.addChild(background);

        let hspace = 48, vspace = 14;

        // #region tree generation

        for (var i = 1; i <= Math.ceil(game.resolution.x / hspace) ; i += 2) { // top dark
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-dark"]);
            tree.x = i * hspace;
            tree.y = (i + 1) % 2 * vspace - 32;
            tree.anchor.set(0.5, 0);

            this.root.addChild(tree);
        }

        for (var i = 0; i <= Math.ceil(game.resolution.x / hspace) ; i += 2) { // top light
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-light"]);
            tree.x = i * hspace;
            tree.y = (i + 1) % 2 * vspace - 32;
            tree.anchor.set(0.5, 0);
            this.root.addChild(tree);
        }

        for (var i = 1; i <= Math.ceil(game.resolution.y / vspace) ; i += 2) { // left dark
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-dark"]);
            tree.x = 0;
            tree.y = i * 28;
            tree.anchor.set(0.5, 0);

            this.root.addChild(tree);
        }

        for (var i = 1; i <= Math.ceil(game.resolution.y / vspace) ; i += 2) { // right dark
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-dark"]);
            tree.x = game.resolution.x;
            tree.y = i * 28;
            tree.anchor.set(0.5, 0);

            this.root.addChild(tree);
        }

        for (var i = 0; i <= Math.ceil(game.resolution.y / vspace) ; i += 2) { // left light
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-light"]);
            tree.x = hspace;
            tree.y = i * 28;
            tree.anchor.set(0.5, 0);

            this.root.addChild(tree);
        }

        for (var i = 0; i <= Math.ceil(game.resolution.y / vspace) ; i += 2) { // right light
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-light"]);
            tree.x = game.resolution.x - hspace;
            tree.y = i * 28;
            tree.anchor.set(0.5, 0);

            this.root.addChild(tree);
        }

        for (var i = 0; i <= Math.ceil(game.resolution.x / hspace) ; i += 2) { // bottom light
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-light"]);
            tree.x = i * hspace;
            tree.y = game.resolution.y - (i + 1) % 2 * vspace + 32;
            tree.anchor.set(0.5, 1);

            this.root.addChild(tree);
        }

        for (var i = 1; i <= Math.ceil(game.resolution.x / hspace) ; i += 2) { // bottom dark
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-dark"]);
            tree.x = i * hspace;
            tree.y = game.resolution.y - (i + 1) % 2 * vspace + 32;
            tree.anchor.set(0.5, 1);

            this.root.addChild(tree);
        }

        // #endregion

        // #region grid generation

        let size = 64;
        let hrange = Math.floor((game.resolution.x - 192) / size),
            vrange = Math.floor((game.resolution.y - 256) / size);

        var darkTile = new PIXI.Graphics();
        darkTile.beginFill(0, 0.25);
        darkTile.drawRect(0, 0, size, size);
        darkTile.endFill();
        var darkTex = darkTile.generateCanvasTexture();

        for (var y = 0; y < vrange; y++) {
            for (var x = 0; x < hrange; x++) {
                if ((x + (y % 2)) % 2 == 0) {
                    var sprite = new PIXI.Sprite(darkTex);
                    sprite.x = 96 + x * size;
                    sprite.y = 140 + y * size;
                    this.root.addChild(sprite);
                }
            }
        }

        // #endregion

        var player = new Player(this, 0, size);
    }
}

class Player {
    /**
     * 
     * @param {Game} game
     * @param {Number} index
     * @param {Number} size
     */
    constructor(game, index, size) {
        this.game = game;
        this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache["player-front"]);
        this.sprite.tint = tints[index];
        this.sprite.width = size;
        this.sprite.height = size;

        this.game.root.addChild(this.sprite);
        
        var left = new Keyboard(37),
            right = new Keyboard(39),
            up = new Keyboard(38),
            down = new Keyboard(40);

        
    }

    update(time, dtime) {

    }

    get x() { return this.sprite.x; }
    set x(x) { this.sprite.x = x; }
    get y() { return this.sprite.y; }
    set y(y) { this.sprite.y = y; }
}



var game = new Game();
game.load();
game.init();
game.start();