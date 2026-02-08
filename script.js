/* GAME CONFIG */
const GAME = {
    level: 1,
    money: 0,
    photosUnlocked: 0,

    // Stats
    currentHP: 100, maxHP: 100,
    playerHP: 100, playerMaxHP: 100,
    energy: 100, maxEnergy: 100,

    isCharged: false,
    isShielded: false, // Defense mechanic
    isPlayerTurn: true, // Turn Logic

    bossData: { name: "INITIATE", hp: 100 }
};

/* ELEMENTS - Get these AFTER window load */
let bossContainer, bossImg, hpBarFill, hpTextCur, hpTextMax;
let playerHPFill, playerHPCur, playerHPMax;
let lvlDisplay, currDisplay, energyBarFill, particleLayer, floaterLayer, moveGrid;

/* AUDIO SYSTEM (Hybrid: Files + Synth Fallback) */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const SOUNDS_CONFIG = {
    hit: { file: 'assets/hit.mp3', synth: { type: 'sawtooth', freq: 100, dur: 0.1, vol: 0.5, slide: -50 } },
    coin: { file: 'assets/coin.mp3', synth: { type: 'sine', freq: 1200, dur: 0.3, vol: 0.3, slide: 0 } },
    shield: { file: 'assets/shield.mp3', synth: { type: 'square', freq: 200, dur: 0.4, vol: 0.2, slide: -100 } },
    levelUp: { file: 'assets/levelup.mp3', synth: { type: 'sine', freq: 400, dur: 0.5, vol: 0.4, slide: 800 } },
    welcome: { file: 'assets/welcome.mp3', synth: { type: 'sine', freq: 600, dur: 1.0, vol: 0.3, slide: -200 } } // New Welcome Sound
};

const audioCache = {};

function playSound(name) {
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Try to play file if loaded
    if (audioCache[name]) {
        const source = audioCtx.createBufferSource();
        source.buffer = audioCache[name];
        source.connect(audioCtx.destination);
        source.start(0);
        return;
    }

    // Fallback to Synth
    playSynth(name);
}

function playSynth(name) {
    const s = SOUNDS_CONFIG[name].synth;
    if (!s) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = s.type;
    osc.frequency.setValueAtTime(s.freq, audioCtx.currentTime);
    if (s.slide !== 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, s.freq + s.slide), audioCtx.currentTime + s.dur);
    }

    gain.gain.setValueAtTime(s.vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + s.dur);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + s.dur);
}

function preloadAudio() {
    Object.keys(SOUNDS_CONFIG).forEach(key => {
        const url = SOUNDS_CONFIG[key].file;
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error("No file");
                return response.arrayBuffer();
            })
            .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                audioCache[key] = audioBuffer;
                console.log(`Audio Loaded: ${key}`);
            })
            .catch(() => console.log(`Using Synth for: ${key}`));
    });
}

/* INIT */
function init() {
    preloadAudio();

    // Bind Elements
    bossContainer = document.getElementById('boss-container');
    bossImg = document.getElementById('boss-img');
    hpBarFill = document.getElementById('hp-bar-fill');
    hpTextCur = document.getElementById('hp-current');
    hpTextMax = document.getElementById('hp-max');

    playerHPFill = document.getElementById('player-hp-fill');
    playerHPCur = document.getElementById('player-hp-cur');
    playerHPMax = document.getElementById('player-hp-max');

    lvlDisplay = document.getElementById('level-display');
    currDisplay = document.getElementById('currency-amount');
    energyBarFill = document.getElementById('energy-bar-fill');
    particleLayer = document.getElementById('particle-layer');
    floaterLayer = document.getElementById('floater-layer');
    moveGrid = document.querySelector('.move-grid');

    if (!playerHPFill) console.error("PLAYER HP UI MISSING!");

    loadGame();
    updateBossUI();
}

/* SAVE SYSTEM */
function saveGame() {
    localStorage.setItem('dahlia_rpg_save', JSON.stringify({
        level: GAME.level,
        money: GAME.money,
        photosUnlocked: GAME.photosUnlocked
    }));
}

function loadGame() {
    const saved = localStorage.getItem('dahlia_rpg_save');
    if (saved) {
        const data = JSON.parse(saved);
        GAME.level = data.level || 1;
        GAME.money = data.money || 0;
        GAME.photosUnlocked = data.photosUnlocked || 0;
    }
    scaleBoss();
    GAME.playerMaxHP = 100 + (GAME.level * 10);
    GAME.playerHP = GAME.playerMaxHP;
}

function scaleBoss() {
    const scale = Math.pow(1.15, GAME.level - 1);
    GAME.maxHP = Math.floor(100 * scale);
    GAME.currentHP = GAME.maxHP;

    const titles = ["INITIATE", "SERVANT", "PET", "DEVOTEE", "SLAVE", "WORSHIPPER", "ADDICT"];
    const rank = titles[Math.min(titles.length - 1, Math.floor(GAME.level / 10))];
    GAME.bossData.name = `SUCCUBUS ${rank} (LVL ${GAME.level})`;
}

/* SHOP LOGIC */
/* SHOP LOGIC */
window.buyStamina = function () {
    // TRAP: Instead of buying, force data entry
    const modal = document.getElementById('punishment-modal');
    modal.classList.remove('hidden');

    // Reset Input
    const input = document.getElementById('punishment-input');
    input.value = "";
    document.getElementById('punishment-feedback').innerText = "";
    input.focus();
}

window.checkPunishment = function () {
    const input = document.getElementById('punishment-input');
    const feedback = document.getElementById('punishment-feedback');
    const target = "I am weak and I need you";

    const val = input.value;

    // Check for mistakes instantly
    if (!target.startsWith(val)) {
        feedback.innerText = "WRONG. RESTART.";
        feedback.style.color = "red";
        playSound('hit'); // Wrong sound
        input.value = ""; // Cruel reset
        triggerGlitch(); // Punish visually
        return;
    }

    if (val === target) {
        // Success
        GAME.energy = GAME.maxEnergy;
        playSound('levelUp'); // Success sound
        alert("GOOD PUPPY. ENERGY RESTORED.");
        closeModals();
        updateUI();
        saveGame();
    }
}

/* BATTLE MECHANICS - PLAYER TURN */
window.useMove = function (moveType) {
    if (!GAME.isPlayerTurn || GAME.playerHP <= 0) return;

    let damage = 0;
    let cost = 0;
    let isCrit = false;

    switch (moveType) {
        case 'lick':
            cost = 5;
            if (GAME.energy < cost) { alert("LOW ENERGY"); return; }
            damage = 10 + (GAME.level * 2);
            break;

        case 'worship':
            // MECHANIC CHANGE: EARN MONEY
            cost = 10;
            if (GAME.energy < cost) { alert("LOW ENERGY"); return; }

            const earned = 10 + (GAME.level * 5);
            GAME.money += earned;
            createFloater(`+${earned} 💎`, '#ffd700');
            playSound('coin'); // NEW SOUND
            break;

        case 'beg':
            // MECHANIC CHANGE: SHIELD / DEFENSE
            cost = 15;
            if (GAME.energy < cost) { alert("LOW ENERGY"); return; }

            GAME.isShielded = true; // Sets flag for enemy turn
            createFloater("SHIELD UP!", '#00ff00');
            playSound('shield'); // NEW SOUND
            break;

        case 'pay':
            // MECHANIC CHANGE: LINK + NO ATTACK
            // 1. Open Throne
            const link = document.getElementById('throne-btn-link').href;
            window.open(link, '_blank');

            // 2. Open Modal for Code
            document.getElementById('throne-modal').classList.remove('hidden');
            return;
    }

    GAME.energy -= cost;

    if (damage > 0) {
        GAME.currentHP -= damage;
        animateHit(bossContainer, isCrit);
        createFloater(isCrit ? `CRIT ${damage}!` : `${damage}`, isCrit ? '#00ffff' : '#fff');
        playSound('hit'); // NEW SOUND

        // Visuals
        const btn = document.querySelector(`#btn-${moveType}`);
        if (btn) {
            const rect = btn.getBoundingClientRect();
            spawnParticles(rect.left + rect.width / 2, rect.top);
        }
    }

    updateUI();

    if (GAME.currentHP <= 0) {
        handleVictory();
    } else {
        endPlayerTurn();
    }
}

/* BATTLE MECHANICS - ENEMY TURN */
function endPlayerTurn() {
    GAME.isPlayerTurn = false;
    moveGrid.classList.add('disabled');

    // Enemy thinks...
    setTimeout(() => {
        enemyAttack();
    }, 1000);
}

function enemyAttack() {
    // Enemy Dmg Scaling
    let enemyDmg = Math.floor(10 + (GAME.level * 1.5));

    // CHECK SHIELD
    if (GAME.isShielded) {
        enemyDmg = Math.floor(enemyDmg / 4); // Reduces damage by 75%
        createFloater("BLOCKED!", "#00ff00", true);
        playSound('shield'); // NEW SOUND
        GAME.isShielded = false; // Reset
    }

    GAME.playerHP -= enemyDmg;
    if (GAME.playerHP < 0) GAME.playerHP = 0;

    // Visuals on Screen (Glitch + Red Flash)
    document.body.style.backgroundColor = '#550000'; // Flash Red

    if (enemyDmg > 0) {
        playSound('hit');
        triggerGlitch(); // NEW: Trigger CSS Glitch
    }

    setTimeout(() => {
        document.body.style.backgroundColor = 'var(--dark-bg)';
    }, 100);

    createFloater(`-${enemyDmg} HP`, '#ff0000', true);

    updateUI();

    if (GAME.playerHP <= 0) {
        // Player Died
        setTimeout(() => {
            alert("YOU DIED! \n(Mercy Revive... for now)");
            GAME.playerHP = GAME.playerMaxHP;
            updateUI();
            GAME.isPlayerTurn = true;
            moveGrid.classList.remove('disabled');
        }, 500);
    } else {
        // Continue
        GAME.isPlayerTurn = true;
        moveGrid.classList.remove('disabled');
    }
}

function handleVictory() {
    GAME.level++;
    GAME.money += 50; // Earn currency
    playSound('coin'); // NEW SOUND

    if (GAME.level % 50 === 0) {
        GAME.photosUnlocked++;
        playSound('levelUp'); // NEW SOUND
        alert(`LVL ${GAME.level}! NEW PHOTO UNLOCKED!`);
    } else {
        createFloater("LEVEL UP!", "#ff00ff");
    }

    saveGame();
    scaleBoss();
    GAME.playerHP = GAME.playerMaxHP; // Heal on level up

    setTimeout(() => {
        updateBossUI();
    }, 800);
}

/* VISUAL HELPERS */
function triggerGlitch() {
    const ui = document.getElementById('game-ui');
    ui.classList.add('glitch-active');
    ui.classList.add('shake-screen');

    setTimeout(() => {
        ui.classList.remove('glitch-active');
        ui.classList.remove('shake-screen');
    }, 300); // Effect duration
}

function spawnParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = x + 'px';
        p.style.top = y + 'px';

        // Random direction
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 50;
        const mx = Math.cos(angle) * dist + 'px';
        const my = Math.sin(angle) * dist + 'px';

        p.style.setProperty('--mx', mx);
        p.style.setProperty('--my', my);

        particleLayer.appendChild(p);
        setTimeout(() => p.remove(), 600);
    }
}

function showTaunt() {
    const taunts = [
        "WEAK!", "PATHETIC!", "MORE!", "IS THAT IT?", "TRY HARDER!",
        "MY NAIL IS HARDER", "GOOD BOY", "BEG FOR ME", "USELESS"
    ];
    const text = taunts[Math.floor(Math.random() * taunts.length)];

    const bubble = document.createElement('div');
    bubble.className = 'boss-dialogue';
    bubble.innerText = text;
    bossContainer.appendChild(bubble);

    setTimeout(() => bubble.remove(), 2000);
}

function animateHit(el, isCrit) {
    el.classList.remove('hit-shake');
    void el.offsetWidth;
    el.classList.add('hit-shake');
}

function createFloater(text, color, isPlayerHit = false) {
    const el = document.createElement('div');
    el.className = 'floating-number';
    el.innerText = text;
    el.style.color = color;
    el.style.left = '50%';
    el.style.top = isPlayerHit ? '70%' : '40%';
    floaterLayer.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

/* GALLERY LOGIC */
window.toggleGallery = function () {
    const modal = document.getElementById('gallery-modal');
    modal.classList.remove('hidden');
    renderGallery();
}

/* REWARD CONFIGURATION */
// Simplified to just images based on user request
const REWARD_DATA = [];

window.closeModals = function () {
    document.getElementById('gallery-modal').classList.add('hidden');
    document.getElementById('throne-modal').classList.add('hidden');
    document.getElementById('punishment-modal').classList.add('hidden'); // Added this
}

/* START GAME LOGIC */
window.startGame = function () {
    console.log("Starting Game...");

    // DYNAMIC BOSS IMAGE / VIDEO
    const rawIndex = Math.ceil(GAME.level / 50);
    const bossIndex = (rawIndex % 10) || 10;

    // RARE EVENT: EVERY 10 LEVELS (10, 20, 30...)
    // This allows you to show a special video periodically.
    const isRare = (GAME.level % 10 === 0);

    const video = document.getElementById('boss-video');

    // UI Toggle
    const start = document.getElementById('start-screen');
    const game = document.getElementById('game-ui');

    if (start) start.classList.add('hidden');
    if (game) game.classList.remove('hidden');

    // Audio - Wrapped in Try/Catch so it doesn't block game start
    try {
        playSound('welcome');
        playMusic();
    } catch (e) {
        console.warn("Audio failed to start:", e);
    }
}

window.onload = function () {
    init();
    renderStartGallery();

    // Add interaction listener to unlock AudioContext
    document.addEventListener('click', function () {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }, { once: true });
};
