import { CONFIG, evolutionStages, dnaTypes, enemyTypes, characters } from "./data.js";
import { clamp, rand } from "./utils.js";
import {
  initWaterParticles,
  updateWaterParticles,
  spawnDnaOrb,
  spawnDnaBurst,
  spawnEnemy,
  updatePlayer,
  updateDashTrail,
  updateDnaOrbs,
  updateEnemies,
  updateFloatingTexts,
  updateCamera,
} from "./world.js";
import {
  drawWaterParticles,
  drawDashTrail,
  drawPlayer,
  drawDnaOrbs,
  drawEnemy,
  drawFloatingTexts,
  drawMiniMap,
  drawIntroScene,
} from "./render.js";
import {
  getUiElements,
  updateHud,
  updateDashHud,
  updateUpgradePanel,
  renderCharacterCards,
  updateCharacterPanel,
  pulseDnaHud,
  pulseCard,
} from "./ui.js";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = getUiElements();
const characterCards = renderCharacterCards(ui.characterGrid, characters);

const state = {
  width: window.innerWidth,
  height: window.innerHeight,
  frame: 0,
  pointerActive: false,
  lastTime: performance.now(),
  phase: "intro",
  menuOpen: false,
  bossSpawned: false,
  dnaSpent: 0,
  evolutionLevel: 1,
  evolutionFlash: 0,
  cameraX: 0,
  cameraY: 0,
  intro: {
    meteorX: -200,
    meteorY: 120,
    meteorSpeed: 5.2,
    splash: 0,
    cellRise: 0,
    cycle: 0,
  },
};

const player = {
  x: CONFIG.worldWidth / 2,
  y: CONFIG.worldHeight / 2,
  targetX: CONFIG.worldWidth / 2,
  targetY: CONFIG.worldHeight / 2,
  radius: 22,
  maxRadius: 90,
  baseMaxRadius: 90,
  colorCore: characters[0].coreColor,
  colorGlow: characters[0].glowColor,
  wobbleSeed: Math.random() * 1000,
  dna: 0,
  hp: 100,
  maxHp: 100,
  baseMaxHp: 100,
  spikes: 0,
  maxSpikes: 4,
  characterId: "primaria",
  speedMultiplier: 1,
  powerMultiplier: 1,
  regenRate: 0,
  dash: {
    active: false,
    lastUse: 0,
    cooldown: 1800,
    duration: 240,
    speedMultiplier: 2.4,
  },
};

const upgrades = {
  vida: { level: 0, baseCost: 30 },
  tamanho: { level: 0, baseCost: 40 },
  espinhos: { level: 0, baseCost: 45 },
  dash: { level: 0, baseCost: 50 },
};

const waterParticles = [];
const dnaOrbs = [];
const enemies = [];
const floatingTexts = [];
const dashTrail = [];

/**
 * Ajusta o tamanho do canvas ao viewport.
 */
function resizeCanvas() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = state.width * window.devicePixelRatio;
  canvas.height = state.height * window.devicePixelRatio;
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  initWaterParticles(state, waterParticles, CONFIG);
  updateCamera(state, player, CONFIG);
}

/**
 * Retorna o personagem atualmente equipado.
 * @returns {object}
 */
function getActiveCharacter() {
  return characters.find((character) => character.id === player.characterId) ?? characters[0];
}

/**
 * Recalcula os atributos máximos do jogador.
 */
function recalcPlayerStats() {
  const bonuses = getActiveCharacter().bonuses;
  player.maxHp = player.baseMaxHp + bonuses.maxHp;
  player.maxRadius = player.baseMaxRadius + bonuses.maxRadius;
  player.maxSpikes = 4 + bonuses.spikeSlots;
  player.speedMultiplier = bonuses.speed;
  player.powerMultiplier = bonuses.power;
  player.regenRate = bonuses.regen;
  player.hp = Math.min(player.hp, player.maxHp);
  player.radius = Math.min(player.radius, player.maxRadius);
  player.spikes = Math.min(player.spikes, player.maxSpikes);
}

/**
 * Aplica as cores e bônus do personagem escolhido.
 * @param {object} character
 */
function applyCharacter(character) {
  player.characterId = character.id;
  player.colorCore = character.coreColor;
  player.colorGlow = character.glowColor;
  recalcPlayerStats();
}

/**
 * Retorna o custo do upgrade baseado no nível atual.
 * @param {string} key
 * @returns {number}
 */
function getUpgradeCost(key) {
  const upgrade = upgrades[key];
  return Math.round(upgrade.baseCost * (1 + upgrade.level * 0.6));
}

/**
 * Checa se o upgrade pode ser comprado.
 * @param {string} key
 * @returns {boolean}
 */
function canPurchaseUpgrade(key) {
  const cost = getUpgradeCost(key);
  if (player.dna < cost || state.phase !== "playing") {
    return false;
  }
  if (key === "espinhos" && player.spikes >= player.maxSpikes) {
    return false;
  }
  return true;
}

/**
 * Cria textos flutuantes para feedback de DNA ou dano.
 * @param {string} text
 * @param {string} color
 * @param {number} x
 * @param {number} y
 */
function addFloatingText(text, color, x, y) {
  floatingTexts.push({
    text,
    color,
    x,
    y,
    alpha: 1,
    life: 1,
  });
}

/**
 * Avança para uma nova etapa de evolução.
 */
function levelUpEvolution() {
  state.evolutionLevel += 1;
  state.evolutionFlash = 60;
  addFloatingText("Nova evolução!", "rgba(150, 255, 230, 0.95)", player.x, player.y - 80);

  if (state.evolutionLevel >= evolutionStages.length - 1) {
    state.phase = "ending";
    ui.endingScreen.classList.add("ending--visible");
  }
}

/**
 * Aplica o upgrade selecionado.
 * @param {string} key
 */
function applyUpgrade(key) {
  if (!canPurchaseUpgrade(key)) {
    return false;
  }
  const cost = getUpgradeCost(key);
  player.dna -= cost;
  state.dnaSpent += cost;
  upgrades[key].level += 1;

  if (key === "vida") {
    player.baseMaxHp += 20;
    recalcPlayerStats();
    player.hp = Math.min(player.hp + 20, player.maxHp);
  }

  if (key === "tamanho") {
    player.baseMaxRadius += 8;
    recalcPlayerStats();
    player.radius = Math.min(player.radius + 4, player.maxRadius);
  }

  if (key === "espinhos") {
    player.spikes = Math.min(player.spikes + 1, player.maxSpikes);
  }

  if (key === "dash") {
    player.dash.cooldown = Math.max(player.dash.cooldown - 160, 600);
    player.dash.duration = Math.min(player.dash.duration + 40, 480);
    player.dash.speedMultiplier = Math.min(player.dash.speedMultiplier + 0.2, 3.6);
  }

  if (state.evolutionLevel < evolutionStages.length - 1) {
    const nextTarget = evolutionStages[state.evolutionLevel];
    if (state.dnaSpent >= nextTarget) {
      levelUpEvolution();
    }
  }

  updateHud(ui, player);
  updateUpgradePanel(ui, upgrades, getUpgradeCost, canPurchaseUpgrade);
  updateCharacterPanel(characterCards, characters, player);
  return true;
}

/**
 * Compra um novo personagem se possível.
 * @param {string} characterId
 */
function purchaseCharacter(characterId) {
  const character = characters.find((item) => item.id === characterId);
  if (!character || player.characterId === character.id) {
    return false;
  }
  if (player.dna < character.cost) {
    return false;
  }
  player.dna -= character.cost;
  applyCharacter(character);
  updateHud(ui, player);
  updateUpgradePanel(ui, upgrades, getUpgradeCost, canPurchaseUpgrade);
  updateCharacterPanel(characterCards, characters, player);
  return true;
}

/**
 * Atualiza o estado da introdução cinematográfica.
 */
function updateIntroScene() {
  const intro = state.intro;
  intro.meteorX += intro.meteorSpeed;
  intro.meteorY += intro.meteorSpeed * 0.55;

  if (intro.meteorX > state.width * 0.7) {
    intro.splash = Math.min(intro.splash + 0.02, 1);
    intro.cellRise = Math.min(intro.cellRise + 0.012, 1);
  }

  if (intro.meteorX > state.width + 200) {
    intro.meteorX = -200;
    intro.meteorY = 120;
    intro.splash = 0;
    intro.cellRise = 0;
  }
}

/**
 * Atualiza efeitos passivos do personagem.
 * @param {number} delta
 */
function updateCharacterEffects(delta) {
  if (player.regenRate <= 0 || player.hp >= player.maxHp) {
    return;
  }
  player.hp = Math.min(player.maxHp, player.hp + (player.regenRate * delta) / 1000);
}

/**
 * Loop principal.
 * @param {number} now
 */
function loop(now) {
  const delta = now - state.lastTime;
  state.lastTime = now;

  ctx.fillStyle = CONFIG.backgroundColor;
  ctx.fillRect(0, 0, state.width, state.height);

  if (state.phase === "intro") {
    updateIntroScene();
    drawIntroScene(ctx, state);
    updateWaterParticles(state, waterParticles);
    drawWaterParticles(ctx, waterParticles);
    window.requestAnimationFrame(loop);
    return;
  }

  updateWaterParticles(state, waterParticles);
  drawWaterParticles(ctx, waterParticles);

  if (state.evolutionFlash > 0) {
    ctx.fillStyle = `rgba(80, 255, 230, ${state.evolutionFlash / 200})`;
    ctx.fillRect(0, 0, state.width, state.height);
    state.evolutionFlash -= 1;
  }

  if (state.phase === "playing") {
    updatePlayer(state, player, now, CONFIG);
    updateCharacterEffects(delta);

    if (player.dash.active) {
      dashTrail.push({
        x: player.x,
        y: player.y,
        radius: player.radius * 1.2,
        life: 1,
      });
    }

    updateDashTrail(dashTrail);
    updateCamera(state, player, CONFIG);

    if (!state.menuOpen) {
      updateDnaOrbs(state, player, dnaOrbs, (orb) => {
        player.dna += orb.value;
        spawnDnaOrb(state, dnaOrbs, dnaTypes, CONFIG);
        addFloatingText(`+${orb.value}`, orb.color, player.x, player.y - 12);
        updateHud(ui, player);
        pulseDnaHud(ui);
        updateUpgradePanel(ui, upgrades, getUpgradeCost, canPurchaseUpgrade);
        updateCharacterPanel(characterCards, characters, player);
      });

      updateEnemies(state, player, enemies, CONFIG, (enemy) => {
        const reward = Math.round(rand(enemy.rewardRange[0], enemy.rewardRange[1]) + enemy.radius * 0.4);
        player.dna += reward;
        spawnDnaBurst(state, dnaOrbs, dnaTypes, CONFIG, enemy.x, enemy.y, Math.ceil(enemy.radius / 12));
        addFloatingText(`+${reward}`, "rgba(120, 255, 200, 0.9)", enemy.x, enemy.y);
        if (!enemy.boss) {
          spawnEnemy(state, enemies, enemyTypes, CONFIG);
        }
        updateHud(ui, player);
        pulseDnaHud(ui);
        updateUpgradePanel(ui, upgrades, getUpgradeCost, canPurchaseUpgrade);
        updateCharacterPanel(characterCards, characters, player);
      }, (damage) => {
        player.hp = Math.max(player.hp - damage, 0);
        addFloatingText("-HP", "rgba(255, 90, 120, 0.9)", player.x, player.y - 18);
        updateHud(ui, player);
      });
    }
  }

  drawDashTrail(ctx, dashTrail, state);
  drawDnaOrbs(ctx, dnaOrbs, state);
  enemies.forEach((enemy) => drawEnemy(ctx, enemy, state));
  drawPlayer(ctx, player, state);
  drawFloatingTexts(ctx, floatingTexts, state);
  updateFloatingTexts(floatingTexts);
  drawMiniMap(ctx, state, player, enemies, dnaOrbs, CONFIG);
  updateDashHud(ui, player, now);

  state.frame += 1;

  if (!state.bossSpawned && state.evolutionLevel >= 4) {
    spawnEnemy(state, enemies, enemyTypes, CONFIG, true);
    state.bossSpawned = true;
    addFloatingText("Um predador surge...", "rgba(200, 160, 255, 0.9)", player.x, player.y - 120);
  }

  if (state.bossSpawned && enemies.every((enemy) => !enemy.boss)) {
    state.bossSpawned = false;
  }

  window.requestAnimationFrame(loop);
}

/**
 * Movimenta o alvo do jogador via ponteiro.
 * @param {PointerEvent} event
 */
function handlePointerMove(event) {
  if (state.phase !== "playing") {
    return;
  }
  player.targetX = clamp(state.cameraX + event.clientX, 0, CONFIG.worldWidth);
  player.targetY = clamp(state.cameraY + event.clientY, 0, CONFIG.worldHeight);
  state.pointerActive = true;
}

/**
 * Centraliza o jogador quando o ponteiro sai.
 */
function handlePointerLeave() {
  if (!state.pointerActive) {
    return;
  }
  player.targetX = player.x;
  player.targetY = player.y;
  state.pointerActive = false;
}

/**
 * Ativa o dash se estiver pronto.
 * @param {KeyboardEvent} event
 */
function handleKeyDown(event) {
  if (event.code === "KeyM") {
    toggleMenu();
    return;
  }

  if (event.code === "Escape" && state.menuOpen) {
    toggleMenu();
    return;
  }

  if (event.code !== "Space" || state.phase !== "playing" || state.menuOpen) {
    return;
  }
  const now = performance.now();
  if (now - player.dash.lastUse >= player.dash.cooldown) {
    player.dash.lastUse = now;
    player.dash.active = true;
  }
}

/**
 * Alterna a abertura do menu de upgrades.
 */
function toggleMenu() {
  if (state.phase !== "playing") {
    return;
  }
  state.menuOpen = !state.menuOpen;
  ui.upgradeMenu.classList.toggle("menu--open", state.menuOpen);
  if (state.menuOpen) {
    updateUpgradePanel(ui, upgrades, getUpgradeCost, canPurchaseUpgrade);
    updateCharacterPanel(characterCards, characters, player);
  }
}

/**
 * Prepara o jogo para iniciar.
 */
function startGame() {
  state.phase = "playing";
  ui.introScreen.classList.remove("intro--visible");
  state.dnaSpent = 0;
  state.evolutionLevel = 1;
  state.bossSpawned = false;
  state.menuOpen = false;
  ui.upgradeMenu.classList.remove("menu--open");
}

/**
 * Reinicia o ciclo evolutivo.
 */
function resetGame() {
  Object.keys(upgrades).forEach((key) => {
    upgrades[key].level = 0;
  });

  player.x = CONFIG.worldWidth / 2;
  player.y = CONFIG.worldHeight / 2;
  player.targetX = player.x;
  player.targetY = player.y;
  player.radius = 22;
  player.baseMaxRadius = 90;
  player.baseMaxHp = 100;
  player.dna = 0;
  player.hp = 100;
  player.spikes = 0;
  player.dash.cooldown = 1800;
  player.dash.duration = 240;
  player.dash.speedMultiplier = 2.4;
  applyCharacter(characters[0]);
  state.menuOpen = false;
  ui.upgradeMenu.classList.remove("menu--open");

  dnaOrbs.length = 0;
  enemies.length = 0;
  floatingTexts.length = 0;
  dashTrail.length = 0;

  for (let i = 0; i < CONFIG.dnaOrbCount; i += 1) {
    spawnDnaOrb(state, dnaOrbs, dnaTypes, CONFIG);
  }
  for (let i = 0; i < CONFIG.enemyCount; i += 1) {
    spawnEnemy(state, enemies, enemyTypes, CONFIG);
  }

  updateHud(ui, player);
  updateUpgradePanel(ui, upgrades, getUpgradeCost, canPurchaseUpgrade);
  updateCharacterPanel(characterCards, characters, player);

  ui.endingScreen.classList.remove("ending--visible");
  state.phase = "intro";
  ui.introScreen.classList.add("intro--visible");
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerdown", handlePointerMove);
window.addEventListener("pointerleave", handlePointerLeave);
window.addEventListener("keydown", handleKeyDown);

ui.upgradeCards.forEach((button) => {
  button.addEventListener("click", () => {
    if (applyUpgrade(button.dataset.upgrade)) {
      pulseCard(button);
    }
  });
});

ui.characterGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-character]");
  if (!button) {
    return;
  }
  if (purchaseCharacter(button.dataset.character)) {
    pulseCard(button);
  }
});

ui.menuToggle.addEventListener("click", toggleMenu);
ui.startButton.addEventListener("click", () => {
  startGame();
});
ui.restartButton.addEventListener("click", () => {
  resetGame();
});

resizeCanvas();
initWaterParticles(state, waterParticles, CONFIG);
for (let i = 0; i < CONFIG.dnaOrbCount; i += 1) {
  spawnDnaOrb(state, dnaOrbs, dnaTypes, CONFIG);
}
for (let i = 0; i < CONFIG.enemyCount; i += 1) {
  spawnEnemy(state, enemies, enemyTypes, CONFIG);
}
recalcPlayerStats();
updateHud(ui, player);
updateUpgradePanel(ui, upgrades, getUpgradeCost, canPurchaseUpgrade);
updateCharacterPanel(characterCards, characters, player);
ui.introScreen.classList.add("intro--visible");
window.requestAnimationFrame(loop);
