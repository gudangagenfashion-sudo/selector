const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const Room = require('./game/Room');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('client'));

const rooms = {};

function createRoom() {
    const room = new Room(); // generates its own ID via generateCode(6)
    room._io = io;           // <-- IMPORTANT: enables room.broadcast() to work
    rooms[room.id] = room;
    return room;
}

function getRoom(roomId) {
    return rooms[roomId];
}

function deleteRoom(roomId) {
    delete rooms[roomId];
}

io.on('connection', (socket) => {

    // ---------- CREATE ROOM ----------
    socket.on('createRoom', ({ playerName, playerId }) => {
        const room = createRoom();

        // Your addPlayer expects (id, name, socket)
        room.addPlayer(playerId, playerName, socket);

        socket.data.playerId = playerId;
        socket.data.roomId = room.id;
        socket.join(room.id);

        socket.emit('roomCreated', {
            roomId: room.id,
            playerId: playerId,
            isHost: room.isHost(playerId),
            imposterCount: room.imposterCount
        });

        // Broadcast updated player list to everyone in the room
        broadcastPlayerList(room);
    });

    // ---------- JOIN ROOM ----------
    socket.on('joinRoom', ({ roomId, playerName, playerId }) => {
        const room = getRoom(roomId);

        if (!room) {
            socket.emit('errorMessage', 'Room not found. Check the code.');
            return;
        }

        // Check if player is already in the room (page refresh / reconnect)
        let player = room.getPlayer(playerId);
        if (!player) {
            // Add new player
            room.addPlayer(playerId, playerName, socket);
        } else {
            // Player exists: update their socket (reconnect) and name (just in case)
            player.socket = socket;
            player.name = playerName;
        }

        socket.data.playerId = playerId;
        socket.data.roomId = roomId;
        socket.join(roomId);

        socket.emit('joined', {
            message: `Welcome to room ${roomId}!`,
            playerId: playerId,
            isHost: room.isHost(playerId),
            imposterCount: room.imposterCount
        });

        broadcastPlayerList(room);
    });

    // ---------- DISCONNECT ----------
    socket.on('disconnect', () => {
        const playerId = socket.data.playerId;
        const roomId = socket.data.roomId;

        if (!roomId || !playerId) return;

        const room = getRoom(roomId);
        if (!room) return;

        room.removePlayer(playerId);

        if (room.getPlayerCount() === 0) {
            deleteRoom(roomId);
        } else {
            broadcastPlayerList(room);
        }

        console.log(`Player ${playerId} disconnected from ${roomId}`);
    });

    socket.on('startGame', ({ roomId }) => {
        const room = getRoom(roomId);
        if (!room) {
            socket.emit('errorMessage', 'Room not found.');
            return;
        }

        const playerId = socket.data.playerId;
        if (!room.isHost(playerId)) {
            socket.emit('errorMessage', 'Only the host can start.');
            return;
        }

        if (room.game) {
            socket.emit('errorMessage', 'Game already started.');
            return;
        }

        try {
            room.startGame();
        } catch (err) {
            socket.emit('errorMessage', err.message);
        }
    });

    // ---------- HELPER: Broadcast Player List ----------
    function broadcastPlayerList(room) {
    const playersArray = Object.values(room.players).map(p => ({
        id: p.id,
        name: p.name
    }));
    room.broadcast('playerListUpdate', {
        players: playersArray,
        hostId: room.hostId
    });
}

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});