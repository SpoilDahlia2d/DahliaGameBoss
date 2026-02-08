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

/* AUDIO SYSTEM (Simple HTML5 Audio for Local Compatibility) */
const audioLibrary = {
    hit: new Audio('assets/hit.mp3'),
    coin: new Audio('assets/coin.mp3'),
    shield: new Audio('assets/shield.mp3'),
    levelUp: new Audio('assets/levelup.mp3'),
    welcome: new Audio('assets/welcome.mp3')
};

// Pre-set volumes
Object.values(audioLibrary).forEach(a => a.volume = 0.6);

function playSound(name) {
    const sound = audioLibrary[name];
    if (sound) {
        sound.currentTime = 0; // Reset to start
        sound.play().catch(e => console.warn(`Sound ${name} blocked`, e));
    }
}

function playMusic() {
    console.log("Attempting to play music...");
    const bgm = new Audio('assets/bgm.mp3');
    bgm.loop = true;
    bgm.volume = 0.3;
    bgm.play().then(() => {
        console.log("Music Playing!");
        window.bgmInstance = bgm; // Save ref
    }).catch(e => {
        console.warn("Music Auto-play blocked (User interaction needed)", e);
        // Retry on next click
        document.addEventListener('click', () => {
            bgm.play();
            window.bgmInstance = bgm;
        }, { once: true });
    });
}

function preloadAudio() {
    // Not needed for HTML5 Audio object approach
    console.log("Audio System Ready (HTML5 Mode)");
}

/* ERROR HANDLER */
window.onerror = function (msg, url, line) {
    const errBox = document.getElementById('debug-box') || document.createElement('div');
    errBox.id = 'debug-box';
    errBox.style.position = 'fixed';
    errBox.style.bottom = '0';
    errBox.style.left = '0';
    errBox.style.width = '100%';
    errBox.style.background = 'rgba(255,0,0,0.8)';
    errBox.style.color = 'white';
    errBox.style.fontSize = '12px';
    errBox.style.padding = '5px';
    errBox.style.zIndex = '99999';
    errBox.innerText = `ERR: ${msg} (Line ${line})`;
    document.body.appendChild(errBox);
    return false;
};

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
            // MECHANIC CHANGE: SPEND DIAMONDS FOR SHIELD
            cost = 0; // Energy free
            const moneyCost = 50; // Diamond Cost

            if (GAME.money < moneyCost) {
                alert(`NEED ${moneyCost} DIAMONDS! WORSHIP MORE!`);
                return;
            }

            GAME.money -= moneyCost;
            GAME.isShielded = true; // Sets flag for enemy turn
            createFloater("SHIELD BOUGHT -50💎", '#00ff00');
            playSound('shield');
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

/* UI UPDATES */
function updateUI() {
    // Boss HP
    const pct = Math.max(0, (GAME.currentHP / GAME.maxHP) * 100);
    if (hpBarFill) {
        hpBarFill.style.width = pct + '%';
        hpTextCur.innerText = Math.ceil(Math.max(0, GAME.currentHP));
    }

    // Player HP
    if (playerHPFill) {
        const pPct = Math.max(0, (GAME.playerHP / GAME.playerMaxHP) * 100);
        playerHPFill.style.width = pPct + '%';
        playerHPCur.innerText = Math.ceil(Math.max(0, GAME.playerHP));
        if (playerHPMax) playerHPMax.innerText = GAME.playerMaxHP;
    }

    // Energy
    const enPct = Math.max(0, (GAME.energy / GAME.maxEnergy) * 100);
    if (energyBarFill) energyBarFill.style.width = enPct + '%';

    if (currDisplay) currDisplay.innerText = GAME.money;

    renderMiniGallery(); // Update Homepage Gallery
}

function updateBossUI() {
    if (lvlDisplay) lvlDisplay.innerText = GAME.level;
    if (hpTextMax) hpTextMax.innerText = GAME.maxHP;
    const nameEl = document.getElementById('boss-name');
    if (nameEl) nameEl.innerText = GAME.bossData.name;

    // DYNAMIC BOSS IMAGE / VIDEO
    const rawIndex = Math.ceil(GAME.level / 50);
    const bossIndex = (rawIndex % 10) || 10;

    // RARE EVENT: EVERY 10 LEVELS (10, 20, 30...)
    const isRare = (GAME.level % 10 === 0);

    const video = document.getElementById('boss-video');
    const img = document.getElementById('boss-img');

    // Safety check for elements
    if (!img) { console.error("ERR: boss-img element missing!"); return; }

    const targetImgPath = `assets/boss_${bossIndex}.jpg`;

    if (isRare && video) {
        // RARE VIDEO HANDLING
        const vidPath = `assets/boss_${bossIndex}_rare.mp4`;

        video.classList.remove('hidden');
        img.classList.add('hidden');

        video.src = vidPath;
        video.muted = true;
        video.playsInline = true;
        video.loop = true;

        video.onloadeddata = () => {
            console.log("Video Loaded");
            video.play().catch(e => console.warn("Auto-play blocked", e));
        };

        video.onerror = (e) => {
            console.error("Video Failed:", vidPath);
            // Fallback to Image
            video.classList.add('hidden');
            img.classList.remove('hidden');
            img.src = targetImgPath;
        };
    } else {
        // STANDARD IMAGE HANDLING
        if (video) {
            video.pause();
            video.classList.add('hidden');
        }

        img.classList.remove('hidden');
        img.src = targetImgPath;

        // Debug Loading
        img.onload = () => console.log(`Image Loaded: ${targetImgPath}`);
        img.onerror = () => {
            console.error(`Image Failed: ${targetImgPath}`);
            alert(`MISSING FILE: ${targetImgPath}`); // Alert user directly
            img.alt = "IMAGE NOT FOUND";
        };
    }

    console.log(`Level ${GAME.level}: Loading Boss ${bossIndex} (Rare? ${isRare})`);

    try {
        updateUI();
    } catch (e) { console.error("UI Update Failed", e); }
}

function renderMiniGallery() {
    const bar = document.getElementById('mini-gallery');
    if (!bar) return;
    bar.innerHTML = "";

    for (let i = 1; i <= 10; i++) {
        const slot = document.createElement('div');
        slot.className = i <= GAME.photosUnlocked ? 'mini-slot unlocked' : 'mini-slot';
        bar.appendChild(slot);
    }
}

function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";

    for (let i = 1; i <= 10; i++) {
        const item = document.createElement('div');
        item.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = `assets/reward_${i}.jpg`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';

        img.onerror = function () {
            if (this.src.includes('reward')) {
                this.src = `assets/boss_${i}.jpg`;
            } else if (!this.src.includes('boss_1.jpg')) {
                this.src = 'assets/boss_1.jpg';
            }
        };

        if (i <= GAME.photosUnlocked) {
            item.className = 'gallery-item unlocked';
            img.style.filter = "none";
        } else {
            item.className = 'gallery-item locked';
            img.style.filter = "grayscale(1) blur(15px) brightness(0.5)";
            item.innerHTML = `🔒<br><span style="font-size:0.5rem">LVL ${i * 50}</span>`;
        }

        if (i <= GAME.photosUnlocked) item.appendChild(img);
        grid.appendChild(item);
    }
}

function renderStartGallery() {
    const grid = document.getElementById('start-gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";

    for (let i = 1; i <= 10; i++) {
        const item = document.createElement('div');
        item.className = 'gallery-item';

        const img = document.createElement('img');
        img.src = `assets/reward_${i}.jpg`;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';

        img.onerror = function () {
            if (this.src.includes('reward')) {
                this.src = `assets/boss_${i}.jpg`;
            } else if (!this.src.includes('boss_1.jpg')) {
                this.src = 'assets/boss_1.jpg';
            }
        };

        if (i <= GAME.photosUnlocked) {
            item.classList.add('unlocked');
            img.style.filter = "none";
        } else {
            item.classList.add('locked');
            img.style.filter = "grayscale(1) blur(15px) brightness(0.5)";
        }

        item.appendChild(img);

        if (i > GAME.photosUnlocked) {
            const lock = document.createElement('div');
            lock.innerHTML = '🔒';
            lock.style.position = 'absolute';
            lock.style.top = '50%';
            lock.style.left = '50%';
            lock.style.transform = 'translate(-50%, -50%)';
            lock.style.fontSize = '2rem';
            lock.style.zIndex = '2';
            item.appendChild(lock);
        }

        grid.appendChild(item);
    }
}

/* START GAME LOGIC */
window.startGame = function () {
    console.log("Starting Game...");

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
};

