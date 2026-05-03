const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {}; // { socketId: { color, score, isReady } }
let boardNumbers = [];
let gameState = { status: 'waiting', writer: null, searcher: null, targetNumber: null, foundNumbers: {} };

function generateBoard() {
    boardNumbers = [];
    for (let i = 1; i <= 60; i++) {
        boardNumbers.push({
            num: i,
            top: Math.floor(Math.random() * 80) + 10 + '%',
            left: Math.floor(Math.random() * 80) + 5 + '%'
        });
    }
}

io.on('connection', (socket) => {
    // Kirim status warna yang sudah diambil ke pemain baru
    const takenColors = Object.values(players).map(p => p.color);
    socket.emit('colorStatus', takenColors);

    socket.on('pickColor', (color) => {
        if (Object.keys(players).length >= 2) return;
        
        players[socket.id] = { id: socket.id, color: color, score: 0, isReady: true };
        io.emit('colorStatus', Object.values(players).map(p => p.color));

        // Jika 2 pemain sudah pilih warna, mulai game
        if (Object.keys(players).length === 2) {
            startNewGame();
        }
    });

    function startNewGame() {
        generateBoard();
        const ids = Object.keys(players);
        
        // ACAK SIAPA YANG MULAI DULUAN
        const randomIndex = Math.random() < 0.5 ? 0 : 1;
        const firstWriter = ids[randomIndex];
        const firstSearcher = ids[randomIndex === 0 ? 1 : 0];

        ids.forEach(id => players[id].score = 0);
        
        gameState = {
            status: 'playing',
            writer: firstWriter,
            searcher: firstSearcher,
            targetNumber: null,
            foundNumbers: {}
        };

        io.emit('gameStart', { board: boardNumbers, state: gameState, players: players });
    }

    socket.on('setTarget', (num) => {
        if (socket.id === gameState.writer) {
            gameState.targetNumber = num;
            io.emit('targetSet', num);
        }
    });

    socket.on('fillBox', () => {
        if (socket.id === gameState.writer && gameState.status === 'playing') {
            players[socket.id].score++;
            io.emit('updateScore', players);
            if (players[socket.id].score >= 144) {
                gameState.status = 'finished';
                io.emit('gameOver', players[socket.id].color);
            }
        }
    });

    socket.on('foundIt', (num) => {
        if (socket.id === gameState.searcher && num == gameState.targetNumber) {
            gameState.foundNumbers[num] = players[socket.id].color;
            const oldWriter = gameState.writer;
            gameState.writer = gameState.searcher;
            gameState.searcher = oldWriter;
            gameState.targetNumber = null;
            io.emit('roleSwapped', { state: gameState, found: num, color: players[socket.id].color });
        }
    });

    socket.on('requestReset', () => {
        startNewGame();
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        gameState.status = 'waiting';
        io.emit('playerLeft');
        io.emit('colorStatus', Object.values(players).map(p => p.color));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server on port ${PORT}`));

    const color = Object.keys(players).length === 0 ? 'red' : 'blue';
    players[socket.id] = { id: socket.id, color: color, score: 0 };
    
    socket.emit('init', { id: socket.id, color: color });
    io.emit('updatePlayers', players);

    if (Object.keys(players).length === 2) {
        startGame();
    }

    function startGame() {
        generateBoard();
        const ids = Object.keys(players);
        // Reset skor tiap mulai baru
        ids.forEach(id => players[id].score = 0);
        
        gameState = {
            status: 'playing',
            writer: ids[0],
            searcher: ids[1],
            targetNumber: null,
            foundNumbers: {}
        };
        io.emit('updateScore', players);
        io.emit('gameStart', { board: boardNumbers, state: gameState });
    }

    socket.on('setTarget', (num) => {
        if (socket.id === gameState.writer) {
            gameState.targetNumber = num;
            io.emit('targetSet', num);
        }
    });

    socket.on('fillBox', () => {
        if (socket.id === gameState.writer && gameState.status === 'playing') {
            players[socket.id].score++;
            io.emit('updateScore', players);
            if (players[socket.id].score >= 144) {
                gameState.status = 'finished';
                io.emit('gameOver', players[socket.id].color);
            }
        }
    });

    socket.on('foundIt', (num) => {
        if (socket.id === gameState.searcher && num == gameState.targetNumber) {
            gameState.foundNumbers[num] = players[socket.id].color;
            const oldWriter = gameState.writer;
            gameState.writer = gameState.searcher;
            gameState.searcher = oldWriter;
            gameState.targetNumber = null;
            io.emit('roleSwapped', { state: gameState, found: num, color: players[socket.id].color });
        }
    });

    socket.on('restartGame', () => {
        if (gameState.status === 'finished') {
            startGame();
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        gameState.status = 'waiting';
        io.emit('playerLeft');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
