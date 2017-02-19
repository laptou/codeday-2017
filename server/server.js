var path = require('path');
var express = require('express');
var exphbs = require('express-handlebars');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var GameServer = require('./gameserver.js');
var Player = require('./player.js');
var Lobby = require('./lobby.js');

app.use('/', express.static(path.join(__dirname, '../client')));

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');  

app.get('/lobby/:uuid'), function(req, res) {
        
}

var gameServer = new GameServer();

var count = 0;
io.on('connection', function(socket) {
    count++;
    var newPlayer = new Player("randomPlayer" + count, socket);

    //adds a new player/connects with an existing player
    gameServer.addPlayer(newPlayer);
    socket.emit('player-assign', {
            "player-name": newPlayer.name,
            "player-id" : newPlayer.id
    });

    console.log('Player connected: ' + newPlayer.name);


    //player
    socket.on('disconnect', function() {
        console.log('Player disconnected: ' + newPlayer.name);
    })

    //creates game lobby
    socket.on('game-createLobby', function(data) {
        var lobby = new Lobby("a small lobby " + count);
        gameServer.addLobby(lobby);
        console.log('lobby created: ' + lobby.name);
    });

    //gets game lobbies
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

    //use 'game-play-event' message header to transmit any events 
    //you need to retransmit to all players in lobby
    // needs 'game-lobby', 'game-player', 'game-data' json things
    socket.on('game-play-event', function(data) {
        var lobby = gameServer.lobbies.get(data['game-lobby']);
        lobby.players.forEach(function(player) {
            if(player.id != data['game-player']) {
                player.socket.emit('game-play-event', data);
            }           
        });
    });
});

http.listen(80, function() {
    console.log("Listening on port 80.");
}); 