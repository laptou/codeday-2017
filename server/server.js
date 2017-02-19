var path = require('path');
var express = require('express');
var exphbs  = require('express-handlebars');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var GameServer = require('./gameserver.js');
var Player = require('./player.js');
var Lobby = require('./lobby.js');

app.use('/', express.static(path.join(__dirname, '../client')));
app.engine('.hbs', exphbs({defaultLayout: 'standard', extname: '.hbs'}));
app.set('view engine', '.hbs');

app.get('/lobby/:id', function(req, res) {
    gameServer.lobbies.forEach(function(data) {
        console.log(data.id); 
    })
    if(gameServer.lobbies.get(req.params.id) != null) {
        res.render('lobby');
    } else {
        res.redirect("/ws");
    }
});

var gameServer = new GameServer();

var count = 0;

io.on('connection', function(socket) {
    /******************************THIS DEALS WITH GAME CODE AND SYNCING************************/
    count++;
    var newPlayer = new Player("randomPlayer" + count, socket);

    //adds a new player/connects with an existing player

    socket.on('player-connect', function(data) {
        var lobby = gameServer.lobbies.get(data['lobby-id']);
        gameServer.addPlayer(newPlayer);
        lobby.addPlayer(newPlayer);

        socket.emit('player-assign', {
                "player-name": newPlayer.name,
                "player-id" : newPlayer.id
        });

        var players = []
        lobby.players.forEach(function(player) {
            players.push({
                "player-id": player.id,
                "player-name" : player.name
            })
        });

        socket.emit('lobby-info', {
            "lobby-id": lobby.id,
            "lobby-name": lobby.name,
            "lobby-players": players
        });
        console.log('Player connected: ' + newPlayer.name);

        //player
        socket.on('disconnect', function() {
            console.log('Player disconnected: ' + newPlayer.name);
            lobby.removePlayer(newPlayer);
        })
    });

    //use 'game-play-event' message header to transmit any events 
    //you need to retransmit to all players in lobby
    // needs 'game-lobby', 'game-player', 'game-data' json things
    socket.on('lobby-event', function(data) {
        var lobby = gameServer.lobbies.get(data['game-lobby']);
        lobby.players.forEach(function(player) {
            if(player.id != data['game-player']) {
                player.socket.emit('lobby-event', data);
            }           
        });
    });

    /*********************************THIS DEALS WITH GETTING LOBBIES***********************/

    //creates game lobby
    socket.on('game-lobby-create', function(data) {
        var lobby = new Lobby("a small lobby " + count);
        gameServer.addLobby(lobby);
        console.log('lobby created: ' + lobby.name);
        socket.emit('game-lobby-created', {
            "game-lobby": lobby.id
        });
    });

    //gets game lobbies
    socket.on('game-lobbies', function() {
        count++;    
        var lobbyJSON = {
            "lobby-num" : gameServer.lobbies.length, 
            "lobbies" : []
        }
        gameServer.lobbies.forEach(function(lobby) {
            if(lobby.players.length < 4) {
                lobbyJSON['lobbies'].push({
                    "lobby-name" : lobby.name,
                    "lobby-id" : lobby.id,
                    "lobby-players" : lobby.players.length
                });
            }
        });
        socket.emit('game-lobbies', lobbyJSON);
        console.log('sent lobbies');    
    });
});

http.listen(80, function() {
    console.log("Listening on port 80.");
}); 