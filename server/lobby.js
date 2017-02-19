require('./player.js');

function Lobby(name) {
    this.name = name; 
    this.winner = null;
    //person at index 0 is leader
    this.players = [];
    this.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
    }); 
};

Lobby.prototype.addPlayer = function(player) {
    this.players.push(player);
}

module.exports = Lobby;
