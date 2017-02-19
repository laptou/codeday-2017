require('./player.js');

function Lobby(name) {
    this.name = name; 
    this.winner = null;
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
    if(this.players.length > 1) {
        this.players = this.players.splice(this.players.indexOf(player), 1);
    } else {
        this.players = [];
    }
}   

module.exports = Lobby;
