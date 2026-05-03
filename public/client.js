const socket = io();
let myId, myColor, role, currentTarget, lastClick = 0;

const header = document.getElementById('info-header');
const btnAction = document.getElementById('btn-action');
const btnRestart = document.getElementById('btn-restart');
const board = document.getElementById('game-board');
const myGrid = document.getElementById('my-grid');

// Inisialisasi Grid 12x12
for(let i=0; i<144; i++) myGrid.innerHTML += '<div></div>';

socket.on('init', d => {
    myId = d.id;
    myColor = d.color;
    document.getElementById('my-color').innerText = d.color.toUpperCase();
    document.getElementById('my-color').style.color = d.color;
});

socket.on('gameStart', d => {
    btnAction.style.display = 'block';
    btnRestart.style.display = 'none';
    renderBoard(d.board);
    updateState(d.state);
});

socket.on('targetSet', n => {
    currentTarget = n;
    header.innerText = (role === 'searcher') ? `CARI ANGKA: ${n}` : `LAWAN CARI: ${n}. KAMU TULIS!`;
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
    const oppData = p[ids.find(id => id !== myId)];
    
    document.getElementById('my-score').innerText = myData.score;
    document.getElementById('opp-score').innerText = oppData ? oppData.score : 0;
    
    const boxes = myGrid.children;
    for(let i=0; i<144; i++) {
        if(i < myData.score) boxes[i].className = `fill-${myColor}`;
        else boxes[i].className = '';
    }
});

socket.on('gameOver', color => {
    header.innerText = `GAME OVER! ${color.toUpperCase()} MENANG!`;
    header.style.background = color;
    btnAction.style.display = 'none';
    btnRestart.style.display = 'block';
});

socket.on('playerLeft', () => {
    header.innerText = "Lawan keluar. Menunggu...";
    board.innerHTML = '';
});

function updateState(state) {
    role = (state.writer === myId) ? 'writer' : 'searcher';
    if(role === 'writer' && !state.targetNumber) {
        btnAction.disabled = true;
        setTimeout(() => {
            let n = prompt("Sebutkan angka (1-60) untuk dicari lawan:");
            if(n) socket.emit('setTarget', n);
        }, 500);
    } else if (role === 'searcher') {
        btnAction.disabled = true;
        header.innerText = state.targetNumber ? `CARI ANGKA: ${state.targetNumber}` : "Menunggu lawan panggil nomor...";
    }
}

function renderBoard(nums) {
    board.innerHTML = '';
    nums.forEach(item => {
        const d = document.createElement('div');
        d.className = 'num';
        d.id = `n-${item.num}`;
        d.innerText = item.num;
        d.style.top = item.top;
        d.style.left = item.left;
        d.onclick = () => {
            if(role === 'searcher' && item.num == currentTarget) {
                socket.emit('foundIt', item.num);
            }
        };
        board.appendChild(d);
    });
}

btnAction.onclick = () => {
    const now = Date.now();
    if(role === 'writer' && now - lastClick >= 1000) {
        lastClick = now;
        socket.emit('fillBox');
        btnAction.disabled = true;
        setTimeout(() => { if(role === 'writer') btnAction.disabled = false; }, 1000);
    }
};

btnRestart.onclick = () => {
    socket.emit('restartGame');
};
