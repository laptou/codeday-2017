var server = {
    lobbyID: null,
    playerID: null,
    socket: io.connect(window.location.protocol + "//" + window.location.hostname),
    allPlayers: null
};

$(document).ready(function () {
    console.log('window loaded');

    var lobbyPlayerTemplate = Handlebars.compile($('#playerListTemplate').html());

    server.socket.emit('player-connect', {
        "lobby-id": window.location.pathname.replace('/lobby/', '')
    });

    server.socket.on('player-assign', function (data) {
        $('#player-name').text("Welcome " + data["player-name"]);
        server.playerID = data['player-id'];
    });

    server.socket.on('lobby-info', function (data) {
        console.log(data);
        $('#lobby-name').text(data['lobby-name']);
        server.lobbyID = data['lobby-id'];
        $('#players').html("");
        server.allPlayers = data['lobby-players'];
        data['lobby-players'].forEach(function (player) {
            console.log(player['player-name']);
            $('#players').append("<li class='list-group-item'>" +
            player['player-name'] + "</li>");
        });

        //if (data['lobby-players'].length > 3) {
        //    $('#lobby-game-start').removeClass("hidden");
        //} else {
        //    $('#lobby-game-start').addClass("hidden");
        //}
    });

    server.socket.on('lobby-event', function (data) {
        console.log(data);
    });

    $('#lobby-game-start').on('click', function () {
        server.socket.emit('lobby-event', {
            'player-id': server.playerID,
            'lobby-id': server.lobbyID,
            'data': {
                'event': 'start'
            }
        });
    });
});