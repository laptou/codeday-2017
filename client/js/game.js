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
                if (this.isUp && this.onpress) this.onpress();
                this.isDown = true;
                this.isUp = false;

                event.preventDefault();
            }
        };

        //The `upHandler`
        this.upHandler = function (event) {
            if (event.keyCode === this.code) {
                if (this.isDown && this.onrelease) this.onrelease();
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
            .add("metal", "/img/metal.png")
            .add("wood", "/img/wood.png")
            .add("shadow", "/img/shadow.png")
            .add("bomb", "/img/bomb.png")
            .add("bomb-tile", "/img/bomb-tile.png")
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
                this.player.update(time, dtime);
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
        this.bounds = { x: 96, y: 140, width: (game.resolution.x - 192), height: (game.resolution.y - 256) };
        this.grid = new PIXI.Container();
        this.grid.position.set(this.bounds.x, this.bounds.y);

        let hrange = Math.floor(this.bounds.width / size),
            vrange = Math.floor(this.bounds.height / size);

        var darkTile = new PIXI.Graphics();
        darkTile.beginFill(0, 0.25);
        darkTile.drawRect(0, 0, size, size);
        darkTile.endFill();
        var darkTex = darkTile.generateCanvasTexture();

        for (var y = 0; y < vrange; y++) {
            for (var x = 0; x < hrange; x++) {
                if ((x + (y % 2)) % 2 == 0) {
                    var sprite = new PIXI.Sprite(darkTex);
                    sprite.x = x * size;
                    sprite.y = y * size;
                    this.grid.addChild(sprite);
                }
            }
        }

        // #endregion

        this.tiles = [];


        // #region tile generation

        for (var z = 0; z < 10; z++) {
            var x = Math.floor(Math.random() * hrange / 2) * 2;
            var y = Math.floor(Math.random() * vrange / 2) * 2;

            var bombTile = new Tile(Tile.TYPE.BOMB, x, y);

            this.grid.addChild(bombTile.container);
            this.tiles.push(bombTile);
        }

        this.player = new Player(this, 1, size);

        for (var x = 1; x < hrange; x += 2) {
            for (var y = 1; y < vrange; y += 2) {
                var metalTile = new Tile(Tile.TYPE.METAL, x, y);

                this.grid.addChild(metalTile.container);
                this.tiles.push(metalTile);
            }
        }
        // #endregion

        this.root.addChild(this.grid);
    }

    tileAt(x, y) {
        for(let mtile of this.tiles) {
            if (mtile.x * 64 <= x && mtile.x * 64 + 64 >= x)
                if (mtile.y * 64 <= y && mtile.y * 64 + 64 >= y)
                    return mtile;
        }

        return null;
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
        this.vx = 0;
        this.vy = 0;
        this.bomb = false;

        this.game.grid.addChild(this.sprite);
        
        this.keyboard = {
            left: new Keyboard(37),
            right: new Keyboard(39),
            up: new Keyboard(38),
            down: new Keyboard(40),
            last: null
        };

        this.keyboard.left.onpress = () => this.keyboard.last = this.keyboard.left;
        this.keyboard.down.onpress = () => this.keyboard.last = this.keyboard.down;
        this.keyboard.up.onpress = () => this.keyboard.last = this.keyboard.up;
        this.keyboard.right.onpress = () => this.keyboard.last = this.keyboard.right;
        this.move = { lastTime: 0, direction: null, sx: NaN, sy: NaN };
    }

    update(time, dtime) {
        if (!this.move.direction && this.keyboard.last && this.keyboard.last.isDown && time - this.move.lastTime > 0.25) {
            this.move.lastTime = time;
            var target = { x: 0, y: 0 };

            switch (this.keyboard.last) {
                case this.keyboard.left:
                    this.sprite.texture = PIXI.utils.TextureCache["player-right"];

                    if (this.x - 64 < 0) break;
                    target = { x: this.x - 32, y: this.y + 32 };

                    this.move.direction = "left";
                    break;
                case this.keyboard.right:
                    this.sprite.texture = PIXI.utils.TextureCache["player-left"];

                    if (this.x + 64 > this.game.bounds.width) break;
                    target = { x: this.x + 96, y: this.y + 32 };

                    this.move.direction = "right";
                    break;
                case this.keyboard.up:
                    this.sprite.texture = PIXI.utils.TextureCache["player-back"];

                    if (this.y - 64 < 0) break;
                    target = { x: this.x + 32, y: this.y - 32 };

                    this.move.direction = "up";
                    break;
                case this.keyboard.down:
                    this.sprite.texture = PIXI.utils.TextureCache["player-front"];

                    if (this.y + 64 > this.game.bounds.height) break;
                    target = { x: this.x + 32, y: this.y + 96 };

                    this.move.direction = "down";
                    break;
            }

            var tile = this.game.tileAt(target.x, target.y);

            if(tile) {
                switch (tile.type) {
                    case Tile.TYPE.METAL:
                    case Tile.TYPE.WOOD:
                        this.move.direction = null;
                        break;
                    case Tile.TYPE.BOMB:
                        if (!this.pickBomb(tile))
                            this.move.direction = null;
                        break;
                }
            }

            this.move.sx = this.x;
            this.move.sy = this.y;
        }

        if (this.move.direction) {
            if (time - this.move.lastTime <= 0.25) {
                switch (this.move.direction) {
                    case "left":
                        this.x = this.move.sx - 64 * (time - this.move.lastTime) * 4;
                        break;
                    case "right":
                        this.x = this.move.sx + 64 * (time - this.move.lastTime) * 4;
                        break;
                    case "up":
                        this.y = this.move.sy - 64 * (time - this.move.lastTime) * 4;
                        break;
                    case "down":
                        this.y = this.move.sy + 64 * (time - this.move.lastTime) * 4;
                        break;
                }
            } else {
                switch (this.move.direction) {
                    case "left":
                        this.x = this.move.sx - 64;
                        break;
                    case "right":
                        this.x = this.move.sx + 64;
                        break;
                    case "up":
                        this.y = this.move.sy - 64;
                        break;
                    case "down":
                        this.y = this.move.sy + 64;
                        break;
                }
                this.move.direction = null;
            }
        }
    }

    /**
     * 
     * @param {Tile} tile
     */
    pickBomb(tile) {
        if (this.bomb) return false;
        this.bomb = true;

        if(tile)
            tile.container.parent.removeChild(tile.container);

        var bombSprite = new PIXI.Sprite(PIXI.utils.TextureCache["bomb"]);
        bombSprite.width = 48;
        bombSprite.height = 48;
        bombSprite.anchor.set(0.5, 1);
        bombSprite.position.set(32, 64);
        this.sprite.addChild(bombSprite);

        return true;
    }

    get x() { return this.sprite.x; }
    set x(x) { this.sprite.x = x; }
    get y() { return this.sprite.y; }
    set y(y) { this.sprite.y = y; }
}

class Tile {
    static get TYPE() {
        return { METAL: 1, WOOD: 2, BOMB: 3, SPEED: 4 };
    }

    constructor(type, x, y) {
        let size = 64;

        this.container = new PIXI.Container();
        this.x = x;
        this.y = y;
        this.type = type;

        switch (type) {
            case Tile.TYPE.METAL:
                var metalTile = new PIXI.Sprite(PIXI.utils.TextureCache["metal"]);
                var shadowTile = new PIXI.Sprite(PIXI.utils.TextureCache["shadow"]);

                metalTile.x = x * 64;
                metalTile.y = y * 64 - 16;
                metalTile.anchor.set(0, 0);
                metalTile.width = size;
                metalTile.height = size * 1.25;

                shadowTile.x = x * 64 - 8;
                shadowTile.y = y * 64 + 32;
                shadowTile.anchor.set(0, 0);
                shadowTile.width = size * 1.25;
                shadowTile.height = size * 1.25 * 0.6;

                this.container.addChild(shadowTile);
                this.container.addChild(metalTile);
                break;
            case Tile.TYPE.WOOD:
                var woodTile = new PIXI.Sprite(PIXI.utils.TextureCache["wood"]);
                var shadowTile = new PIXI.Sprite(PIXI.utils.TextureCache["shadow"]);

                woodTile.x = x * 64;
                woodTile.y = y * 64;
                woodTile.anchor.set(0, 0);
                woodTile.width = size;
                woodTile.height = size;

                shadowTile.x = x * 64 - 8;
                shadowTile.y = y * 64 + 32;
                shadowTile.anchor.set(0, 0);
                shadowTile.width = size * 1.25;
                shadowTile.height = size * 1.25 * 0.6;

                this.container.addChild(shadowTile);
                this.container.addChild(woodTile);
                break;
            case Tile.TYPE.BOMB:
                var bombTile = new PIXI.Sprite(PIXI.utils.TextureCache["bomb-tile"]);

                bombTile.x = x * 64;
                bombTile.y = y * 64;
                bombTile.anchor.set(0, 0);
                bombTile.width = size;
                bombTile.height = size;

                this.container.addChild(bombTile);
                break;
        }
    }
}

class Bomb {

}

var game = new Game();
game.load();
game.init();
game.start();