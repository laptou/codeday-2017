require('./player.js');

function Lobby(name) {
    this.name = name; 
    this.winner = null;
    this.host = null;
    //person at index 0 is host
    this.players = [];
    this.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
    }); 
};

Lobby.prototype.addPlayer = function(player) {
    this.players.push(player);
}

Lobby.prototype.removePlayer = function(player) {
    this.players = array.splice(players.indexOf(player), 1);
}

Lobby.prototype.setHost = function(player) {
    this.host = player;
}

module.exports = Lobby;
