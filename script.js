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
            GAME.isCharged = false;
            break;

        case 'worship':
            cost = 10;
            if (GAME.energy < cost) { alert("LOW ENERGY"); return; }
            damage = 0;
            GAME.isCharged = true;
            createFloater("CHARGED!", '#ffff00');
            break;

        case 'beg':
            GAME.energy = Math.min(GAME.maxEnergy, GAME.energy + 40);
            damage = 1;
            createFloater("+STAMINA", '#00ff00');
            break;

        case 'pay':
            cost = 50;
            if (GAME.energy < cost) { alert("NEED 50 EN!"); return; }
            damage = 100 + (GAME.level * 10);
            if (GAME.isCharged) damage *= 3;
            isCrit = true;
            break;
    }

    GAME.energy -= cost;

    if (damage > 0) {
        GAME.currentHP -= damage;
        animateHit(bossContainer, isCrit);
        createFloater(isCrit ? `CRIT ${damage}!` : `${damage}`, isCrit ? '#00ffff' : '#fff');
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
    const enemyDmg = Math.floor(10 + (GAME.level * 1.5));

    GAME.playerHP -= enemyDmg;

    // Visuals on Screen (Shake the whole UI?)
    document.body.style.backgroundColor = '#550000';
    setTimeout(() => document.body.style.backgroundColor = 'var(--dark-bg)', 100);

    createFloater(`TOOK ${enemyDmg} DMG!`, '#ff0000', true); // Red Text

    updateUI();

    if (GAME.playerHP <= 0) {
        alert("YOU DIED! PAY TO REVIVE OR RESTART LEVEL.");
        GAME.playerHP = GAME.playerMaxHP; // Mercy reset for now
    }

    // Back to Player
    GAME.isPlayerTurn = true;
    moveGrid.classList.remove('disabled');
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

/* UI UPDATES */
function updateUI() {
    // Boss HP
    const pct = Math.max(0, (GAME.currentHP / GAME.maxHP) * 100);
    hpBarFill.style.width = pct + '%';
    hpTextCur.innerText = Math.ceil(Math.max(0, GAME.currentHP));

    // Player HP
    const pPct = Math.max(0, (GAME.playerHP / GAME.playerMaxHP) * 100);
    playerHPFill.style.width = pPct + '%';
    playerHPCur.innerText = Math.ceil(Math.max(0, GAME.playerHP));
    playerHPMax.innerText = GAME.playerMaxHP;

    // Energy
    const enPct = Math.max(0, (GAME.energy / GAME.maxEnergy) * 100);
    energyBarFill.style.width = enPct + '%';

    currDisplay.innerText = GAME.money;
}

function updateBossUI() {
    lvlDisplay.innerText = GAME.level;
    hpTextMax.innerText = GAME.maxHP;
    document.getElementById('boss-name').innerText = GAME.bossData.name;

    // TODO: Dynamic Image Source based on Level
    // bossImg.src = `assets/boss_${GAME.level % 10}.jpg`; 

    updateUI();
}

window.onload = init;
