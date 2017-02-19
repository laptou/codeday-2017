$( document ).ready(function() {
    console.log('window loaded');
    
    var lobbyTemplate = Handlebars.compile($('#lobby-template').html());
    var lobbyID;
    var socket = io.connect(window.location.protocol + "//" + window.location.hostname);

    socket.on('game-lobbies', function(data) {
        console.log(data);
        var lobbies = data['lobbies'];

        $('#lobbies').text("");
        for(var i = 0; i < lobbies.length; i++) {
            $('#lobbies').append(lobbyTemplate(lobbies[i]))
        }
    });

    $('#createLobby').on('click', function() {
        console.log('lobby created');
        socket.emit('game-lobby-create');
    }); 
    socket.on('game-lobby-created', function(data) {
        $( location ).attr('href', '/lobby/' + data['game-lobby']);
    });
    socket.emit('game-lobbies');
});     