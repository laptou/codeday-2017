$( document ).ready(function() {
    console.log('window loaded');
    
    var lobbyTemplate = Handlebars.compile($('#lobby-template').html());

    var socket = io.connect('http://localhost');

    socket.emit('player-connect');

    socket.on('player-assign', function(data) {
        $('#player-name').text("Welcome " + data["player-name"]);
        localStorage.setItem('player-id', data['player-id']);
    });

    socket.on('game-lobbies', function(data) {
        console.log(data);
        var lobbies = data['lobbies'];

        $('#lobbies').text("");
        for(var i = 0; i < data['lobby-num']; i++) {
            $('#lobbies').append(lobbyTemplate(lobbies[i]))
        }
    });

    $('#createLobby').on('click', function() {
        console.log('lobby created');
        socket.emit('game-createLobby');
        getLobbies();
    }); 

    getLobbies();
    function getLobbies() {
        socket.emit('game-lobbies');
    }
});     