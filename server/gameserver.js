function GameServer() {
    this.lobbies = new Map();
    this.players = new Map();
};

GameServer.prototype.addLobby = function(lobby) {
    this.lobbies.set(lobby['id'], lobby);
}

GameServer.prototype.addPlayer = function(player) {
    this.players.set(player['id'], player);
}

GameServer.prototype.removeLobby = function(lobby) {
    this.lobbies.delete(lobby['id']);
}

GameServer.prototype.removePlayers = function(player) {
    this.players.delete(player['id']);
}

module.exports = GameServer;
