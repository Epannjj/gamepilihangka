const socket = io();
let myId, myColor, role, currentTarget, lastClick = 0;

const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const header = document.getElementById('info-header');
const btnAction = document.getElementById('btn-action');
const board = document.getElementById('game-board');
const myGrid = document.getElementById('my-grid');

// Init grid
myGrid.innerHTML = '';
for(let i=0; i<144; i++) myGrid.innerHTML += '<div></div>';

function pick(color) {
    myColor = color;
    socket.emit('pickColor', color);
    document.getElementById('btn-red').disabled = true;
    document.getElementById('btn-blue').disabled = true;
    document.getElementById('setup-msg').innerText = "Warna dipilih: " + color.toUpperCase() + ". Menunggu lawan...";
}

socket.on('colorStatus', (takenColors) => {
    if (takenColors.includes('red')) document.getElementById('btn-red').disabled = true;
    if (takenColors.includes('blue')) document.getElementById('btn-blue').disabled = true;
});

socket.on('gameStart', d => {
    myId = socket.id;
    setupScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    document.getElementById('my-color-text').innerText = myColor.toUpperCase();
    document.getElementById('my-color-text').style.color = myColor;
    
    renderBoard(d.board, d.state.foundNumbers);
    updateState(d.state);
});

socket.on('targetSet', n => {
    currentTarget = n;
    header.innerText = (role === 'searcher') ? `CARI: ${n}` : `LAWAN CARI: ${n}. TULIS!`;
    header.style.background = (role === 'searcher') ? "#2563eb" : "#be185d";
    if(role === 'writer') btnAction.disabled = false;
});

socket.on('roleSwapped', d => {
    const el = document.getElementById(`n-${d.found}`);
    if(el) el.classList.add(`found-${d.color}`);
    updateState(d.state);
});

socket.on('updateScore', p => {
    const ids = Object.keys(p);
    const myData = p[myId];
    const oppId = ids.find(id => id !== myId);
    const oppData = p[oppId];
    
    if(myData) document.getElementById('my-score').innerText = myData.score;
    if(oppData) document.getElementById('opp-score').innerText = oppData.score;
    
    const boxes = myGrid.children;
    for(let i=0; i<144; i++) {
        boxes[i].className = (i < myData.score) ? `fill-${myColor}` : '';
    }
});

socket.on('gameOver', color => {
    header.innerText = `PEMENANG: ${color.toUpperCase()}!`;
    header.style.background = color;
    btnAction.disabled = true;
});

socket.on('playerLeft', () => { location.reload(); });

function updateState(state) {
    role = (state.writer === socket.id) ? 'writer' : 'searcher';
    currentTarget = state.targetNumber;
    btnAction.disabled = (role === 'searcher' || !currentTarget);

    if(role === 'writer') {
        header.innerText = !currentTarget ? "PILIH 1 ANGKA DI PAPAN!" : `LAWAN CARI: ${currentTarget}. TULIS!`;
        header.style.background = !currentTarget ? "#059669" : "#be185d";
    } else {
        header.innerText = !currentTarget ? "MENUNGGU LAWAN PILIH ANGKA..." : `CARI: ${currentTarget}!`;
        header.style.background = !currentTarget ? "#6b7280" : "#2563eb";
    }
}

function renderBoard(nums, found) {
    board.innerHTML = '';
    nums.forEach(item => {
        const d = document.createElement('div');
        d.className = 'num';
        d.id = `n-${item.num}`;
        d.innerText = item.num;
        d.style.top = item.top;
        d.style.left = item.left;
        if(found[item.num]) d.classList.add(`found-${found[item.num]}`);
        
        d.onclick = () => {
            if(role === 'writer' && !currentTarget && !d.classList.contains('found-red') && !d.classList.contains('found-blue')) {
                socket.emit('setTarget', item.num);
            } else if(role === 'searcher' && item.num == currentTarget) {
                socket.emit('foundIt', item.num);
            }
        };
        board.appendChild(d);
    });
}

btnAction.onclick = () => {
    const now = Date.now();
    if(role === 'writer' && currentTarget && now - lastClick >= 1000) {
        lastClick = now;
        socket.emit('fillBox');
        btnAction.disabled = true;
        setTimeout(() => { if(role === 'writer') btnAction.disabled = false; }, 1000);
    }
};

function resetGame() {
    socket.emit('requestReset');
}
