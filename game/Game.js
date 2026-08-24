class Game {
    constructor(room) {
        this.room = room;
        this.started = false;
    }

    initialize() {
        if (this.started) return;
        this.started = true;

        const players = Object.values(this.room.players);
        if (players.length < 3) {
            throw new Error('Need at least 3 players to start');
        }

        // How many imposters? Use room.imposterCount (already clamped)
        const numImposters = this.room.imposterCount || 1;

        // Shuffle players and pick first N as imposters
        const shuffled = [...players];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const imposterSet = new Set(shuffled.slice(0, numImposters).map(p => p.id));

        // Send role to each player privately (just the boolean)
        players.forEach(player => {
            this.room.emitToPlayer(player.id, 'roleAssignment', {
                isImposter: imposterSet.has(player.id)
            });
        });
    }

    clearTimers() {
        // Nothing to clean up
    }
}

module.exports = Game;