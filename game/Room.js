const Player = require('./Player');
const Game = require('./Game');
const { generateCode } = require('../utils/CodeGenerator');

class Room {
    constructor(id) {
        this.id = id || generateCode(6);
        this.hostId = null;
        this.players = {};
        this._io = null;
        this.imposterCount = 1;
        this.isActive = true;
        this.game = null;
    }

    // Set how many imposters (minimum 1)
    setImposterCount(count) {
        const num = parseInt(count);
        this.imposterCount = (isNaN(num) || num < 1) ? 1 : num;
    }

    addPlayer(id, name, socket) {
        if (this.players[id]) {
            throw new Error(`Player ${id} already in room`);
        }
        const player = new Player(id, name);
        player.socket = socket;
        this.players[id] = player;

        // First player becomes host
        if (Object.keys(this.players).length === 1) {
            this.hostId = id;
        }
        return player;
    }

    removePlayer(id) {
        const player = this.players[id];
        if (!player) return null;
        delete this.players[id];

        if (this.hostId === id) {
            const aliveIds = Object.keys(this.players);
            this.hostId = aliveIds.length > 0 ? aliveIds[0] : null;
        }
        if (Object.keys(this.players).length === 0) {
            this.isActive = false;
        }
        return player;
    }

    getPlayer(id) {
        return this.players[id] || null;
    }

    getPlayerCount() {
        return Object.keys(this.players).length;
    }

    isHost(id) {
        return this.hostId === id;
    }

    // ---------- GAME ----------
    startGame() {
        if (this.game) {
            throw new Error('Game already in progress');
        }
        const count = this.getPlayerCount();
        if (count < 3) {
            throw new Error('Need at least 3 players to start');
        }

        // Clamp imposters to at most half the players (so crew has a chance)
        const maxImposters = Math.floor(count / 2);
        if (this.imposterCount > maxImposters) {
            this.imposterCount = maxImposters;
        }

        this.game = new Game(this);
        this.game.initialize();
        return this.game;
    }

    endGame() {
        if (this.game) {
            this.game.clearTimers();
            this.game = null;
        }
    }

    // ---------- BROADCASTING ----------
    broadcast(event, data) {
        if (this._io) {
            this._io.to(this.id).emit(event, data);
        }
    }

    emitToPlayer(playerId, event, data) {
        const player = this.getPlayer(playerId);
        if (player && player.socket) {
            player.socket.emit(event, data);
        }
    }

    // ---------- SERIALIZATION ----------
    toJSON() {
        return {
            id: this.id,
            hostId: this.hostId,
            players: Object.values(this.players).map(p => p.toJSON()),
            playerCount: this.getPlayerCount(),
            isActive: this.isActive,
            imposterCount: this.imposterCount   // send this to clients
        };
    }
}

module.exports = Room;