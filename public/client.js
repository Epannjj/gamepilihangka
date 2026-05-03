const socket = io();
let myId, myColor, role, currentTarget, lastClick = 0;
let audioCtx; // Untuk sound effect

const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const header = document.getElementById('info-header');
const btnAction = document.getElementById('btn-action');
const board = document.getElementById('game-board');
const myGrid = document.getElementById('my-grid');

const inputContainer = document.getElementById('input-container');
const numInput = document.getElementById('num-input');
const btnSubmitNum = document.getElementById('btn-submit-num');

// Init grid
myGrid.innerHTML = '';
for(let i=0; i<144; i++) myGrid.innerHTML += '<div></div>';

// --- FUNGSI SOUND EFFECT "DING!" ---
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playSuccessSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}
// -----------------------------------

function pick(color) {
    initAudio(); // Aktifkan audio saat HP disentuh pertama kali
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
    inputContainer.style.display = 'none'; // Sembunyikan kolom ketik jika target sudah ada
    header.innerText = (role === 'searcher') ? `CARI: ${n}` : `LAWAN CARI: ${n}. TULIS!`;
    header.style.background = (role === 'searcher') ? "#2563eb" : "#be185d";
    if(role === 'writer') btnAction.disabled = false;
});

socket.on('roleSwapped', d => {
    playSuccessSound(); // Bunyikan suara Ding!
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
    inputContainer.style.display = 'none';
});

socket.on('playerLeft', () => { location.reload(); });

function updateState(state) {
    role = (state.writer === socket.id) ? 'writer' : 'searcher';
    currentTarget = state.targetNumber;
    btnAction.disabled = (role === 'searcher' || !currentTarget);

    if(role === 'writer') {
        if (!currentTarget) {
            header.innerText = "KETIK 1 ANGKA UNTUK DICARI!";
            header.style.background = "#059669";
            inputContainer.style.display = 'flex'; // Munculkan kolom ketik
        } else {
            header.innerText = `LAWAN CARI: ${currentTarget}. TULIS!`;
            header.style.background = "#be185d";
            inputContainer.style.display = 'none';
        }
    } else {
        inputContainer.style.display = 'none'; // Searcher tidak boleh lihat kolom ketik
        header.innerText = !currentTarget ? "MENUNGGU LAWAN KETIK ANGKA..." : `CARI: ${currentTarget}!`;
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
            // Hanya Searcher yang bisa klik papan sekarang
            if(role === 'searcher' && item.num == currentTarget) {
                socket.emit('foundIt', item.num);
            }
        };
        board.appendChild(d);
    });
}

// Logika tombol Kirim Angka
btnSubmitNum.onclick = () => {
    const val = parseInt(numInput.value);
    if (val >= 1 && val <= 60) {
        const el = document.getElementById(`n-${val}`);
        // Cek apakah angka sudah pernah ditebak
        if (el && !el.classList.contains('found-red') && !el.classList.contains('found-blue')) {
            socket.emit('setTarget', val);
            numInput.value = ''; // Kosongkan input
        } else {
            alert("Angka ini sudah dicoret! Pilih angka lain.");
        }
    } else {
        alert("Masukkan angka dari 1 sampai 60!");
    }
};

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
