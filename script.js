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

/* INIT */
function init() {
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
window.buyStamina = function () {
    if (GAME.money >= 20) {
        GAME.money -= 20;
        GAME.energy = GAME.maxEnergy;
        alert("STAMINA RECHARGED!");
        updateUI();
        saveGame();
    } else {
        alert("NEED 20 GEMS!");
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
            break;

        case 'beg':
            // MECHANIC CHANGE: SHIELD / DEFENSE
            cost = 15;
            if (GAME.energy < cost) { alert("LOW ENERGY"); return; }

            GAME.isShielded = true; // Sets flag for enemy turn
            createFloater("SHIELD UP!", '#00ff00');
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
        GAME.isShielded = false; // Reset
    }

    GAME.playerHP -= enemyDmg;
    if (GAME.playerHP < 0) GAME.playerHP = 0;

    // Visuals on Screen (Camera Shake + Red Flash)
    document.body.style.backgroundColor = '#550000';
    document.getElementById('game-ui').style.transform = `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`;

    setTimeout(() => {
        document.body.style.backgroundColor = 'var(--dark-bg)';
        document.getElementById('game-ui').style.transform = 'none';
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

    if (GAME.level % 50 === 0) {
        GAME.photosUnlocked++;
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

/* REWARD CONFIGURATION (User Edits This) */
const REWARD_DATA = [
    { level: 1, type: 'image', src: 'assets/reward_1.jpg' },
    { level: 50, type: 'video', src: 'assets/reward_2.mp4' }, // Example Video
    { level: 100, type: 'image', src: 'assets/reward_3.jpg' },
    // Add more here...
];

function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = "";

    const TOTAL_SLOTS = 10;

    for (let i = 1; i <= TOTAL_SLOTS; i++) {
        const item = document.createElement('div');

        // Find specific reward for this slot (mapped 1-10 to levels 50-500 usually, but simplified here)
        // For now, let's say Slot 1 = Reward 1, etc.
        const reward = REWARD_DATA[i - 1] || { type: 'image', src: `assets/reward_${i}.jpg` };

        if (i <= GAME.photosUnlocked) {
            // UNLOCKED
            item.className = 'gallery-item unlocked';

            if (reward.type === 'video') {
                item.innerHTML = `
                    <video src="${reward.src}" controls style="width:100%; height:100%; object-fit:cover;"></video>
                    <span style="font-size:0.8rem; position:absolute; bottom:5px; left:5px; background:#000;">VIDEO ${i}</span>
                `;
            } else {
                item.innerHTML = `
                    <img src="${reward.src}" style="width:100%; height:100%; object-fit:cover;">
                    <span style="font-size:0.8rem; position:absolute; bottom:5px; left:5px; background:#000;">PHOTO ${i}</span>
                `;
            }

            // Zoom click
            item.onclick = (e) => {
                if (e.target.tagName !== 'VIDEO') alert(`Viewing Reward ${i}`);
            };
        } else {
            // LOCKED
            item.className = 'gallery-item locked';
            item.innerHTML = `🔒<br><span style="font-size:0.5rem">LVL ${i * 50}</span>`;
        }
        grid.appendChild(item);
    }
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

/* UI UPDATES */
function updateUI() {
    // Boss HP
    const pct = Math.max(0, (GAME.currentHP / GAME.maxHP) * 100);
    hpBarFill.style.width = pct + '%';
    hpTextCur.innerText = Math.ceil(Math.max(0, GAME.currentHP));

    // Player HP
    // Check if element exists to avoid crash
    if (playerHPFill) {
        const pPct = Math.max(0, (GAME.playerHP / GAME.playerMaxHP) * 100);
        playerHPFill.style.width = pPct + '%';
        playerHPCur.innerText = Math.ceil(Math.max(0, GAME.playerHP));
        playerHPMax.innerText = GAME.playerMaxHP;
    }

    // Energy
    const enPct = Math.max(0, (GAME.energy / GAME.maxEnergy) * 100);
    energyBarFill.style.width = enPct + '%';

    currDisplay.innerText = GAME.money;

    renderMiniGallery(); // Update Homepage Gallery
}

function updateBossUI() {
    lvlDisplay.innerText = GAME.level;
    hpTextMax.innerText = GAME.maxHP;
    document.getElementById('boss-name').innerText = GAME.bossData.name;

    // DYNAMIC BOSS IMAGE
    // Naming convention: boss_1.jpg, boss_2.jpg, etc.
    // Uses modulo 10 to cycle through 10 boss images indefinitely
    const bossIndex = (GAME.level % 10) || 10;
    // bossImg.src = `assets/boss_${bossIndex}.jpg`; // UNCOMMENT THIS LINE WHEN FILES ARE READY

    // For now, keep placeholder but log it
    // console.log("Would load:", `assets/boss_${bossIndex}.jpg`);

    updateUI();
}

/* START GAME LOGIC */
window.startGame = function () {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
}

function renderStartGallery() {
    const grid = document.getElementById('start-gallery-grid');
    if (!grid) return;
    grid.innerHTML = "";

    // Using same logic but for Start Screen
    for (let i = 1; i <= 10; i++) {
        const item = document.createElement('div');
        if (i <= GAME.photosUnlocked) {
            item.className = 'gallery-item unlocked';
            item.innerHTML = `<span style="font-size:1rem">PHOTO ${i}</span>`;
        } else {
            // BLURRED & GRAYSCALE EFFECT
            item.className = 'gallery-item locked';
            item.style.filter = "grayscale(1) blur(2px)";
            item.innerHTML = `🔒`;
        }
        grid.appendChild(item);
    }
}

/* REDEMPTION LOGIC */
window.redeemCode = function () {
    const input = document.getElementById('throne-code-input');
    const code = input.value.toUpperCase().trim();
    const validCodes = ["HEALME", "QUEEN", "DAHLIA", "PIGGY", "THANKYOU"];

    if (validCodes.includes(code)) {
        GAME.playerHP = GAME.playerMaxHP; // Full Heal
        GAME.money += 500; // Bonus Money

        alert("OFFERING ACCEPTED. LIFE RESTORED.");
        closeModals();
        updateUI();
        saveGame();
        input.value = ""; // Clear input
    } else {
        alert("INVALID CODE. PAY FIRST.");
    }
}

window.closeModals = function () {
    document.getElementById('gallery-modal').classList.add('hidden');
    document.getElementById('throne-modal').classList.add('hidden');
}

window.onload = function () {
    init();
    renderStartGallery();

    // Add interaction listener to unlock AudioContext
    document.addEventListener('click', function () {
        if (AudioSys.ctx && AudioSys.ctx.state === 'suspended') {
            AudioSys.ctx.resume();
        }
    }, { once: true });
};

window.onload = init;
