function GameServer() {
    this.lobbies = [];
};

GameServer.prototype.addLobby = function(lobby) {
    this.lobbies.push(lobby);
}

module.exports = GameServer;
