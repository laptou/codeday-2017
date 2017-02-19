var path = require('path');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var GameServer = require('./gameserver.js');
var Player = require('./player.js');
var Lobby = require('./lobby.js');

app.use('/', express.static(path.join(__dirname, '../client')));

var gameServer = new GameServer();

var count = 0;
io.on('connection', function(socket) {
    count++;
    var newPlayer = new Player("randomPlayer" + count, socket);
    
    socket.emit('player-assign', {
        "player-name": newPlayer.name,
        "player-id" : newPlayer.id
    });

    console.log('Player connected: ' + newPlayer.name);
    socket.on('disconnect', function() {
        console.log('Player disconnected: ' + newPlayer.name);
    })

    socket.on('game-createLobby', function(data) {
        var lobby = new Lobby("a small lobby " + count);
        gameServer.addLobby(lobby);
        console.log('lobby created: ' + lobby.name);
    });

    socket.on('game-lobbies', function() {
        count++;
        var lobbyJSON = {
            "lobby-num" : gameServer.lobbies.length, 
            "lobbies" : []
        }
        for(var i = 0; i < gameServer.lobbies.length; i++) {
            lobbyJSON['lobbies'].push({
                "lobby-name" : gameServer.lobbies[i].name,
                "lobby-id" : gameServer.lobbies[i].id,
                "lobby-players" : gameServer.lobbies[i].players.length
            });
        }
        socket.emit('game-lobbies', lobbyJSON);
        console.log('sent lobbies');    
    });
});

http.listen(80, function() {
    console.log("Listening on port 80.");
}); 