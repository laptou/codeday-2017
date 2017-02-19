$( document ).ready(function() {
    console.log('window loaded');
    
    var socket = io.connect('http://localhost');
    var lobbyPlayerTemplate = Handlebars.compile($('#playerListTemplate').html());

    socket.emit('player-connect', {
        "lobby-id": window.location.pathname.replace('/lobby/','')
    });

    socket.on('player-assign', function(data) {
        $('#player-name').text("Welcome " + data["player-name"]);
        localStorage.setItem('player-id', data['player-id']);
    });

    socket.on('lobby-info', function(data) {
        console.log(data);
        $('#lobby-name').text(data['lobby-name']);
        lobbyID = data['lobby-id'];
        $('#players').text("");
        data['lobby-players'].forEach(function(player) {
            console.log(player['player-name']);
            $('#players').append("<li class='list-group-item'>" + 
            (player['player-host'] ? "HOST" : "") +
            player['player-name'] + "</li>");
        });
    });

    socket.on('lobby-event', function(data) {
        
    });
});     