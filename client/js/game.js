/// <reference path="vendor/pixi.js" />
/// <reference path="lobby.js" />
/// <reference path="vendor/socket.io.js" />
/// <reference path="vendor/jquery-3.1.1.js" />

var server = server || null;
let tints = [0xFF9999, 0x99FF99, 0xFFFF99, 0x9999FF, 0xFFCC99, 0xFF99CC];
let keybinds = [
    [37, 39, 38, 40, 13],
    [65, 68, 87, 83, 70]
];
function rgb(r, g, b) {
    b = (typeof b !== 'undefined') ? b : r;
    g = (typeof g !== 'undefined') ? g : r;

    return (Math.floor(0xFF * r) << 16) + (Math.floor(0xFF * g) << 8) + Math.floor(0xFF * b);
}

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

        var clientWidth = this.view.screen.clientWidth;
        var height = window.innerHeight - this.view.screen.clientTop;

        this.resolution = { x: clientWidth, y: height };
        this.origin = { x: 0, y: 0 };
        this.camera = { x: 0, y: 0 };

        this.time = { start: -1, last: 0, stage: 0 };

        this.loaded = false;

        this.root = new PIXI.Container();

        this.renderer = PIXI.autoDetectRenderer(this.resolution.x, this.resolution.y, { resolution: this.scale });
        this.renderer.autoResize = true;

        this.sprite = {};
        this.stage = 0;

        this.tiles = [];
        this.powerups = [];
        this.bombs = [];
        this.explosions = [];

        this.entered = false;
        this.levelGenerated = false;

        if (server) {
            this.socket = server.socket;

            this.socket.on('lobby-event', data => {
                if (data.event == 'start')
                    this.enter();
            });

        } else this.enter();

        this.view.screen.appendChild(this.renderer.view);
    }

    load() {
        PIXI.loader
            .add("logo", "/img/logo.png")
            .add("metal", "/img/metal.png")
            .add("metal-tombstone", "/img/metal-tombstone.png")
            .add("wood", "/img/wood.png")
            .add("shadow", "/img/shadow.png")
            .add("bomb", "/img/bomb.png")
            .add("fire", "/img/fire.png")
            .add("fire-sideways", "/img/fire-sideways.png")
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

        this.sprite.splashText = new PIXI.Text("SPLASHMAN", {
            align: 'center',
            fill: 'white',
            fontSize: 144,
            fontFamily: 'Sigmar One',
            stroke: 0x9999FF,
            strokeThickness: 10
        });
        this.sprite.splashText.anchor.set(0.5);

        this.sprite.white = new PIXI.Graphics();
        this.sprite.white.beginFill(0xFFFFFF);
        this.sprite.white.drawRect(0, 0, this.resolution.x, this.resolution.y);
        this.sprite.white.endFill();

        this.root.addChild(this.sprite.logo);
    }

    update(time) {
        var dtime = time - this.time.last;

        switch (this.stage) {
            case 0: // splash screen
                if (time > 0) {
                    this.time.stage = time;
                    this.stage = 1; // splash screen only lasts 5 seconds
                    break;
                }

                this.sprite.logo.alpha = 1 - Math.abs(2.5 - time) * Math.abs(2.5 - time) / 6.25;

                break;
            case 1:
                this.root.removeChildren();

                this.sprite.splashText.position.set(this.resolution.x / 2, this.resolution.y / 2);
                this.sprite.splashText.alpha = 0;
                this.root.addChild(this.sprite.splashText);

                if (time - this.time.stage > 1) {
                    this.time.stage = time;
                    this.stage = 2;
                } else {
                    this.renderer.backgroundColor = rgb(time - this.time.stage);
                }

                break;
            case 2:
                if (time - this.time.stage > 0) {
                    this.time.stage = time;
                    this.stage = 3;
                    break;
                }

                var t = time - this.time.stage;
                this.sprite.splashText.alpha = 1 - Math.abs(2.5 - t) * Math.abs(2.5 - t) / 6.25;
                               
                break;
            case 3:
                this.root.removeChildren();
                this.generateLevel();

                for (let player of this.players) {
                    player.update(time, dtime);
                }

                this.root.addChild(this.sprite.white);

                if (this.entered)
                {
                    this.time.stage = time;
                    this.stage = 4;
                }
                break;
            case 4:
                if (time - this.time.stage > 1) {
                    this.time.stage = time;
                    this.stage = 5;
                    this.root.removeChild(this.sprite.white);
                } else {
                    var t = time - this.time.stage;
                    this.sprite.white.alpha = 1 - t;
                }
                break;
            case 5:
                for (let player of this.players) {
                    player.update(time, dtime);
                }

                for (let bomb of this.bombs) {
                    bomb.update(time, dtime);
                }

                for (let explosion of this.explosions) {
                    explosion.update(time, dtime);
                }
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

    enter () {
        this.entered = true;
    }

    stop() {
        cancelAnimationFrame(this.hAnimFrame);
    }

    generateLevel() {
        if (this.levelGenerated) return;
        this.levelGenerated = true;

        var background = new PIXI.Graphics();
        background.beginFill(0x06A500);
        background.drawRect(0, 0, this.resolution.x, this.resolution.y);
        this.root.addChild(background);

        let hspace = 48, vspace = 14;

        // #region tree generation

        for (var i = 1; i <= Math.ceil(this.resolution.x / hspace) ; i += 2) { // top dark
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-dark"]);
            tree.x = i * hspace;
            tree.y = (i + 1) % 2 * vspace - 32;
            tree.anchor.set(0.5, 0);

            this.root.addChild(tree);
        }

        for (var i = 0; i <= Math.ceil(this.resolution.x / hspace) ; i += 2) { // top light
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-light"]);
            tree.x = i * hspace;
            tree.y = (i + 1) % 2 * vspace - 32;
            tree.anchor.set(0.5, 0);
            this.root.addChild(tree);
        }

        for (var i = 1; i <= Math.ceil(this.resolution.y / vspace) ; i += 2) { // left dark
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-dark"]);
            tree.x = 0;
            tree.y = i * 28;
            tree.anchor.set(0.5, 0);

            this.root.addChild(tree);
        }

        for (var i = 1; i <= Math.ceil(this.resolution.y / vspace) ; i += 2) { // right dark
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-dark"]);
            tree.x = this.resolution.x;
            tree.y = i * 28;
            tree.anchor.set(0.5, 0);

            this.root.addChild(tree);
        }

        for (var i = 0; i <= Math.ceil(this.resolution.y / vspace) ; i += 2) { // left light
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-light"]);
            tree.x = hspace;
            tree.y = i * 28;
            tree.anchor.set(0.5, 0);

            this.root.addChild(tree);
        }

        for (var i = 0; i <= Math.ceil(this.resolution.y / vspace) ; i += 2) { // right light
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-light"]);
            tree.x = this.resolution.x - hspace;
            tree.y = i * 28;
            tree.anchor.set(0.5, 0);

            this.root.addChild(tree);
        }

        for (var i = 0; i <= Math.ceil(this.resolution.x / hspace) ; i += 2) { // bottom light
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-light"]);
            tree.x = i * hspace;
            tree.y = this.resolution.y - (i + 1) % 2 * vspace + 32;
            tree.anchor.set(0.5, 1);

            this.root.addChild(tree);
        }

        for (var i = 1; i <= Math.ceil(this.resolution.x / hspace) ; i += 2) { // bottom dark
            var tree = new PIXI.Sprite(PIXI.utils.TextureCache["tree-dark"]);
            tree.x = i * hspace;
            tree.y = this.resolution.y - (i + 1) % 2 * vspace + 32;
            tree.anchor.set(0.5, 1);

            this.root.addChild(tree);
        }

        // #endregion

        // #region grid generation

        this.bounds = { x: 96, y: 128, width: (this.resolution.x - 192), height: (this.resolution.y - 256) };
        this.bounds.size = Math.min(Math.floor(this.bounds.height / 9), Math.floor(this.bounds.width / 13));
        this.bounds.x = this.resolution.x / 2 - 6 * this.bounds.size;
        this.bounds.y = this.resolution.y / 2 - 4 * this.bounds.size - 40;
        this.bounds.width = 13 * this.bounds.size;
        this.bounds.height = 9 * this.bounds.size;

        this.grid = new PIXI.Container();
        this.grid.position.set(this.bounds.x, this.bounds.y);

        let hrange = 13,
            vrange = 9;

        var darkTile = new PIXI.Graphics();
        darkTile.beginFill(0, 0.25);
        darkTile.drawRect(0, 0, this.bounds.size, this.bounds.size);
        darkTile.endFill();
        var darkTex = darkTile.generateCanvasTexture();

        for (var y = 0; y < vrange; y++) {
            for (var x = 0; x < hrange; x++) {
                if ((x + (y % 2)) % 2 == 0) {
                    var sprite = new PIXI.Sprite(darkTex);
                    sprite.x = x * this.bounds.size;
                    sprite.y = y * this.bounds.size;
                    this.grid.addChild(sprite);
                }
            }
        }

        // #endregion

        this.tileLayer = new PIXI.Container();
        this.powerupLayer = new PIXI.Container();
        this.tileLayer.position.set(this.bounds.x, this.bounds.y);
        this.powerupLayer.position.set(this.bounds.x, this.bounds.y);

        // #region tile generation

        for (var x = 0; x < hrange; x++) {
            for (var y = (x + 1) % 2; y < vrange; y += 2) {
                if (x < 3 && y < 3) continue;
                if (x > 9 && y < 3) continue;
                if (x > 9 && y > 5) continue;
                if (x < 3 && y > 5) continue;

                var woodTile = new Tile(this, Tile.TYPE.WOOD, x, y);
            }
        }

        var bombTiles = [
            new Powerup(this, Powerup.TYPE.BOMB, 2, 0),
            new Powerup(this, Powerup.TYPE.BOMB, 0, 2),
            new Powerup(this, Powerup.TYPE.BOMB, 10, 0),
            new Powerup(this, Powerup.TYPE.BOMB, 12, 2),
            new Powerup(this, Powerup.TYPE.BOMB, 2, 8),
            new Powerup(this, Powerup.TYPE.BOMB, 0, 6),
            new Powerup(this, Powerup.TYPE.BOMB, 10, 8),
            new Powerup(this, Powerup.TYPE.BOMB, 12, 6)];

        this.players = [new Player(this, false, 0, 0, this.bounds.size), new Player(this, false, 1, 1, this.bounds.size)];

        this.players[1].x = 12;
        this.players[1].y = 8;

        if (server) {
            var index = server.allPlayers.findIndex(p => p['player-id'] == server.playerID);
            this.players = [new Player(this, false, index, 0, this.bounds.size)];

            var i = 0;
            for(let playerOnline of server.allPlayers) {
                if (i == index) { i++; continue; }

                var player = new Player(this, true, i, 0, this.bounds.size);
                player.id = playerOnline['player-id'];
                this.players.push(player);

                i++;
            }

            this.players[1].x = 12;
            this.players[1].y = 8;

            if (players[2]) {
                this.players[2].x = 0;
                this.players[2].y = 8;
            }

            if (players[3]) {
                this.players[3].x = 12;
                this.players[3].y = 0;
            }
        }


        for (var x = 1; x < hrange; x += 2) {
            for (var y = 1; y < vrange; y += 2) {
                var metalTile = new Tile(this, Tile.TYPE.METAL, x, y);
            }
        }
        // #endregion

        this.root.addChild(this.grid);
        this.root.addChild(this.powerupLayer);
        this.root.addChild(this.tileLayer);
    }

    tileAt(x, y) {
        for(let mtile of this.tiles) {
            if (mtile.x == x && mtile.y == y)
                return mtile;
        }

        return null;
    }

    powerupAt(x, y) {
        for(let mtile of this.powerups) {
            if (mtile.x == x && mtile.y == y)
                return mtile;
        }

        return null;
    }

    playerAt(x, y) {
        for(let mtile of this.players) {
            if (mtile.x == x && mtile.y == y)
                return mtile;
        }

        return null;
    }

    /**
     *
     * @param {Tile} tile
     */
    removeTile(tile) {
        this.tileLayer.removeChild(tile.container);

        switch (tile.type) {
            case Tile.TYPE.METAL:
            case Tile.TYPE.WOOD:
                this.tiles.splice(this.tiles.indexOf(tile), 1);
                if(Math.random() < 0.5)
                    new Powerup(this, Powerup.TYPE.BOMB, tile.x, tile.y);
                break;
        }
    }

    removePowerup(tile) {
        this.powerupLayer.removeChild(tile.container);

        switch (tile.type) {
            case Powerup.TYPE.BOMB:
                this.powerups.splice(this.powerups.indexOf(tile), 1);
                break;
        }
    }
}

class Player {
    /**
     *
     * @param {Game} game
     * @param {Number} index
     * @param {Number} size
     */
    constructor(game, online, index, keys, size, x, y) {
        this.game = game;
        this.online = online;
        this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache["player-front"]);
        this.sprite.tint = tints[index];
        this.sprite.width = size;
        this.sprite.height = size;
        this.sprite.x = 0;
        this.sprite.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.x = 0;
        this.y = 0;
        this.facing = "down";
        this.bomb = false;
        this.dead = false;
        this.deadTime = -1;
        this.moving = false;

        this.game.grid.addChild(this.sprite);

        if (!this.online) {
            var keybind = keybinds[keys];
            this.keyboard = {
                left: new Keyboard(keybind[0]),
                right: new Keyboard(keybind[1]),
                up: new Keyboard(keybind[2]),
                down: new Keyboard(keybind[3]),
                enter: new Keyboard(keybind[4]),
                last: null
            };

            this.keyboard.left.onpress = () => this.keyboard.last = this.keyboard.left;
            this.keyboard.down.onpress = () => this.keyboard.last = this.keyboard.down;
            this.keyboard.up.onpress = () => this.keyboard.last = this.keyboard.up;
            this.keyboard.right.onpress = () => this.keyboard.last = this.keyboard.right;
            this.keyboard.enter.onpress =
                () => this.dropBomb((performance.now() - this.game.time.start) / 1000);
        } else {
            game.socket.on('lobby-event', data => {
                if (data.playerID == this.id) {
                    if (data.event.startsWith("move")) {
                        this.move.direction = "left";
                        this.facing = "left";
                    }

                    if (data.event.startsWith("bomb"))
                        this.dropBomb((performance.now() - this.game.time.start) / 1000);
                }
            })
        }

        this.move = { lastTime: 0, direction: null, sx: NaN, sy: NaN, keepGoing: false };
    }

    update(time, dtime) {
        if (this.dead) {
            this.sprite.alpha = Math.max(0, 1 - time + this.deadTime);
            return;
        }

        if (!this.online) {

            if (this.keyboard.last && !this.keyboard.last.isDown)
                this.move.keepGoing = false;

            if (!this.moving && this.keyboard.last && this.keyboard.last.isDown && time - this.move.lastTime > 0.25) {
                this.move.lastTime = time;
                var target = { x: 0, y: 0 };

                switch (this.keyboard.last) {
                    case this.keyboard.left:
                        this.sprite.texture = PIXI.utils.TextureCache["player-left"];

                        if (this.x - 1 < 0) break;
                        target = { x: this.x - 1, y: this.y };

                        this.move.direction = "left";
                        this.facing = "left";
                        break;
                    case this.keyboard.right:
                        this.sprite.texture = PIXI.utils.TextureCache["player-right"];

                        if (this.x + 1 >= this.game.bounds.width / this.game.bounds.size) break;
                        target = { x: this.x + 1, y: this.y };

                        this.move.direction = "right";
                        this.facing = "right";
                        break;
                    case this.keyboard.up:
                        this.sprite.texture = PIXI.utils.TextureCache["player-back"];

                        if (this.y - 1 < 0) break;
                        target = { x: this.x, y: this.y - 1 };

                        this.move.direction = "up";
                        this.facing = "up";
                        break;
                    case this.keyboard.down:
                        this.sprite.texture = PIXI.utils.TextureCache["player-front"];

                        if (this.y + 1 >= this.game.bounds.height / this.game.bounds.size) break;
                        target = { x: this.x, y: this.y + 1 };

                        this.move.direction = "down";
                        this.facing = "down";
                        break;
                }

                this.moving = true;
                this.move.keepGoing = true;

                var tile = this.game.tileAt(target.x, target.y);

                if (tile) {
                    this.move.direction = null;
                    this.moving = false;
                    this.move.keepGoing = false;
                }

                var powerup = this.game.powerupAt(target.x, target.y);
                if (powerup) {
                    switch (powerup.type) {
                        case Powerup.TYPE.BOMB:
                            if (!this.pickBomb(powerup))
                                this.move.direction = null;
                            break;
                    }
                }

                this.move.sx = this.x;
                this.move.sy = this.y;

                if (server && this.move.direction)
                    this.game.socket.emit('lobby-event', {
                        'player-id': server.playerID,
                        'lobby-id': server.lobbyID,
                        'data': {
                            'event': 'move ' + this.move.direction
                        }
                    });
            }
        }

        if (this.moving && this.move.direction) {
            if (time - this.move.lastTime <= 0.25) {
                if (!this.move.keepGoing && time - this.move.lastTime <= 0.1) {
                    if (!this.online && !this.keyboard.last.isDown)
                        this.move.direction = null;
                }
                else {
                    switch (this.move.direction) {
                        case "left":
                            this.sprite.x = this.move.sx * this.game.bounds.size - this.game.bounds.size * (time - this.move.lastTime) * 4;
                            break;
                        case "right":
                            this.sprite.x = this.move.sx * this.game.bounds.size + this.game.bounds.size * (time - this.move.lastTime) * 4;
                            break;
                        case "up":
                            this.sprite.y = this.move.sy * this.game.bounds.size - this.game.bounds.size * (time - this.move.lastTime) * 4;
                            break;
                        case "down":
                            this.sprite.y = this.move.sy * this.game.bounds.size + this.game.bounds.size * (time - this.move.lastTime) * 4;
                            break;
                    }
                }
            } else {
                switch (this.move.direction) {
                    case "left":
                        this.x = this.move.sx - 1;
                        break;
                    case "right":
                        this.x = this.move.sx + 1;
                        break;
                    case "up":
                        this.y = this.move.sy - 1;
                        break;
                    case "down":
                        this.y = this.move.sy + 1;
                        break;
                }

                this.sprite.x = this.x * this.game.bounds.size;
                this.sprite.y = this.y * this.game.bounds.size;

                this.move.direction = null;
            }
        } else {
            this.sprite.x = this.x * this.game.bounds.size;
            this.sprite.y = this.y * this.game.bounds.size;
            this.moving = false;
        }
    }

    /**
     *
     * @param {Tile} tile
     */
    pickBomb(tile) {
        if (this.bomb) return false;
        this.bomb = true;

        if (tile) {
            this.game.removePowerup(tile);
        }

        var bombSprite = new PIXI.Sprite(PIXI.utils.TextureCache["bomb"]);
        bombSprite.width = 48;
        bombSprite.height = 48;
        this.sprite.addChild(bombSprite);

        bombSprite.anchor.set(0.5, 0.5);
        bombSprite.x = 32;
        bombSprite.y = 32;

        return true;
    }

    dropBomb(time) {
        if (!this.bomb) return false;

        var offset = { x: 0, y: 0 };
        switch (this.facing) {
            case "left":
                if (this.x <= 0) return false;
                offset.x = -1;
                break;
            case "right":
                if (this.x + 1 >= this.game.grid.width / this.game.bounds.size) return false;
                offset.x = 1;
                break;
            case "up":
                if (this.y <= 0) return false;
                offset.y = -1;
                break;
            case "down":
                if (this.y + 1 >= this.game.grid.height / this.game.bounds.size) return false;
                offset.y = 1;
                break;
        }

        var target = { x: this.x + offset.x, y: this.y + offset.y };
        if (this.game.tileAt(target.x, target.y)) return false;
        if (this.game.powerupAt(target.x, target.y)) return false;
        if (this.game.playerAt(target.x, target.y)) return false;

        var bomb = new Bomb(this.game, time, target.x, target.y);
        this.game.bombs.push(bomb);

        this.bomb = false;
        this.sprite.removeChildren();
    }

    die(time) {
        this.dead = true;
        this.sprite.tint = 0x999999;
        this.game.tiles.push(new Tile(this.game, Tile.TYPE.TOMB, this.x, this.y));
    }
}

class Powerup {
    static get TYPE() {
        return { BOMB: 3, SPEED: 4 };
    }

    constructor(game, type, x, y) {
        let size = game.bounds.size;

        this.container = new PIXI.Container();
        this.x = x;
        this.y = y;
        this.type = type;

        game.powerupLayer.addChild(this.container);
        game.powerups.push(this);

        switch (type) {
            case Powerup.TYPE.BOMB:
                var bombTile = new PIXI.Sprite(PIXI.utils.TextureCache["bomb-tile"]);

                bombTile.x = x * size;
                bombTile.y = y * size;
                bombTile.anchor.set(0, 0);
                bombTile.width = size;
                bombTile.height = size;

                this.container.addChild(bombTile);
                break;
        }
    }
}

class Tile {
    static get TYPE() {
        return { METAL: 1, TOMB: 1.5, WOOD: 2 };
    }

    constructor(game, type, x, y) {
        let size = game.bounds.size;

        this.container = new PIXI.Container();
        this.x = x;
        this.y = y;
        this.type = type;

        game.tileLayer.addChild(this.container);
        game.tiles.push(this);

        switch (type) {
            case Tile.TYPE.METAL:
            case Tile.TYPE.TOMB:
                var metalTile = new PIXI.Sprite(PIXI.utils.TextureCache[type == Tile.TYPE.METAL ? "metal" : "metal-tombstone"]);
                var shadowTile = new PIXI.Sprite(PIXI.utils.TextureCache["shadow"]);

                metalTile.x = x * size;
                metalTile.y = y * size - size * 0.25;
                metalTile.anchor.set(0, 0);
                metalTile.width = size;
                metalTile.height = size * 1.25;

                shadowTile.x = x * size - size * 0.125;
                shadowTile.y = y * size + size * 0.5;
                shadowTile.anchor.set(0, 0);
                shadowTile.width = size * 1.25;
                shadowTile.height = size * 1.25 * 0.6;

                // this.container.addChild(shadowTile);
                this.container.addChild(metalTile);
                break;
            case Tile.TYPE.WOOD:
                var woodTile = new PIXI.Sprite(PIXI.utils.TextureCache["wood"]);
                var shadowTile = new PIXI.Sprite(PIXI.utils.TextureCache["shadow"]);

                woodTile.x = x * size;
                woodTile.y = y * size;
                woodTile.anchor.set(0, 0);
                woodTile.width = size;
                woodTile.height = size;

                shadowTile.x = x * size - size * 0.125;
                shadowTile.y = y * size + size * 0.5;
                shadowTile.anchor.set(0, 0);
                shadowTile.width = size * 1.25;
                shadowTile.height = size * 1.25 * 0.6;

                // this.container.addChild(shadowTile);
                this.container.addChild(woodTile);
                break;
            case Tile.TYPE.BOMB:
                var bombTile = new PIXI.Sprite(PIXI.utils.TextureCache["bomb-tile"]);

                bombTile.x = x * size;
                bombTile.y = y * size;
                bombTile.anchor.set(0, 0);
                bombTile.width = size;
                bombTile.height = size;

                this.container.addChild(bombTile);
                break;
        }
    }
}

class Bomb {
    constructor(game, time, x, y) {
        this.game = game;
        this.time = time;
        this.x = x;
        this.y = y;

        this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache["bomb"]);
        this.sprite.width = game.bounds.size;
        this.sprite.height = game.bounds.size;
        this.game.grid.addChild(this.sprite);

        this.sprite.x = x * game.bounds.size;
        this.sprite.y = y * game.bounds.size;
    }

    update(time, dtime) {
        var red = (time - this.time) / 2;
        if (red >= 1) {
            this.explode(time);
        }

        this.sprite.tint = (0xFF * red) << 16;
        this.sprite.x = this.x * this.game.bounds.size + Math.random() * red * 5;
        this.sprite.y = this.y * this.game.bounds.size + Math.random() * red * 5;
    }

    explode(time) {
        this.game.grid.removeChild(this.sprite);
        this.game.bombs.splice(this.game.bombs.indexOf(this), 1);

        this.game.explosions.push(new Explosion(this.game, this.x, this.y, time));
    }
}

class Explosion {
    /**
     *
     * @param {Game} game
     * @param {Number} x
     * @param {Number} y
     * @param {Number} time
     */
    constructor(game, x, y, time) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.beginTime = time;
        this.container = new PIXI.Container();
        this.game.grid.addChild(this.container);

        this.left = true;
        this.right = true;
        this.up = true;
        this.down = true;
        this.radius = 0;
    }

    update(time, dtime) {
        var t = time - this.beginTime;
        var r = Math.floor(t / 0.05) + 1; // r for current

        if (r > this.radius) {
            if (this.left && this.x - r >= 0) {
                var tile = this.game.tileAt(this.x - r, this.y);
                var powerup = this.game.powerupAt(this.x - r, this.y);
                var player = this.game.playerAt(this.x - r, this.y);

                if (!tile && !powerup && !player) {
                    this.container.addChild(this.generateTile(this.x - r, this.y, time));
                } else {
                    this.left = false;
                    if (tile && tile.type == Tile.TYPE.WOOD) {
                        this.game.removeTile(tile);
                    }

                    if (player) player.die();
                }
            }

            if (this.right && this.x + r <= 12) {
                var tile = this.game.tileAt(this.x + r, this.y);
                var powerup = this.game.powerupAt(this.x + r, this.y);
                var player = this.game.playerAt(this.x + r, this.y);

                if (!tile && !powerup && !player) {
                    this.container.addChild(this.generateTile(this.x + r, this.y, time));
                } else {
                    this.right = false;
                    if (tile && tile.type == Tile.TYPE.WOOD) {
                        this.game.removeTile(tile);
                    }

                    if (player) player.die();
                }
            }

            if (this.up && this.y - r >= 0) {
                var tile = this.game.tileAt(this.x, this.y - r);
                var powerup = this.game.powerupAt(this.x, this.y - r);
                var player = this.game.playerAt(this.x, this.y - r);
                if (!tile && !powerup && !player) {
                    this.container.addChild(this.generateTile(this.x, this.y - r, time));
                } else {
                    this.up = false;
                    if (tile && tile.type == Tile.TYPE.WOOD) {
                        this.game.removeTile(tile);
                    }

                    if (player) player.die();
                }
            }

            if (this.down && this.y + r <= 8) {
                var tile = this.game.tileAt(this.x, this.y + r);
                var powerup = this.game.powerupAt(this.x, this.y + r);
                var player = this.game.playerAt(this.x, this.y + r);

                if (!tile && !powerup && !player) {
                    this.container.addChild(this.generateTile(this.x, this.y + r, time));
                } else {
                    this.down = false;
                    if (tile && tile.type == Tile.TYPE.WOOD) {
                        this.game.removeTile(tile);
                    }

                    if (player) player.die();
                }
            }

            this.radius = r;
        }

        for(let tile of this.container.children) {
            tile.alpha = Math.max(0, 1 - (time - tile.time));
        }
    }

    generateTile(x, y, t) {
        var explosionTile = new PIXI.Sprite(PIXI.utils.TextureCache[x != this.x ? "fire-sideways" : "fire"]);
        
        explosionTile.width = this.game.bounds.size;
        explosionTile.height = this.game.bounds.size;

        explosionTile.x = x * this.game.bounds.size;
        explosionTile.y = y * this.game.bounds.size;

        explosionTile.time = t;

        return explosionTile;
    }
}

$(function() {
    var game = new Game();
    game.load();
    game.init();
    game.start();

    if ($('#lobby-game-start').length > 0) 
        $('#lobby-game-start').click(() => game.enter());
    else game.enter();
});