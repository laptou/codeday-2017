$( document ).ready(function() {
    console.log('window loaded');
    var socket = io.connect('http://localhost');
    socket.on('player-assign', function(data) {
        $('#player-name').text("Welcome " + data["player-name"]);
        localStorage.setItem('player-id', data['player-id']);
    });

    $('#createLobby').on('click', function() {
        console.log('lobby created');
        socket.emit('game-createLobby');
        getLobbies();
    });
    
    socket.on('game-lobbies', function(data) {
        console.log(data);
        var lobbies = data['lobbies'];

        $('#lobbies').text("");
        for(var i = 0; i < data['lobby-num']; i++) {
            var li = document.createElement('li');
            var text = document.createTextNode(
                'Lobby: ' + lobbies[i]['lobby-name'] + '<br>'
                + 'Players: ' + lobbies[i]['lobby-players']);
            li.appendChild(text);
            document.getElementById('lobbies').appendChild(li);
        }
    });
    function getLobbies() {
        socket.emit('game-lobbies');
    }
});     