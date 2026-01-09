const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const dnaLabel = document.getElementById("dnaScore");
const hpBar = document.getElementById("hpBar");
const hpLabel = document.getElementById("hpLabel");
const dashBar = document.getElementById("dashBar");
const dashLabel = document.getElementById("dashLabel");
const evolutionBar = document.getElementById("evolutionBar");
const evolutionLabel = document.getElementById("evolutionLabel");
const introScreen = document.getElementById("introScreen");
const startButton = document.getElementById("startButton");
const menuToggle = document.getElementById("menuToggle");
const upgradeMenu = document.getElementById("upgradeMenu");
const tutorial = document.getElementById("tutorial");
const endingScreen = document.getElementById("endingScreen");
const restartButton = document.getElementById("restartButton");

const backgroundColor = "rgba(0, 8, 20, 0.25)";
const waterParticleCount = 180;
const dnaOrbCount = 50;
const enemyCount = 10;
const baseLerpFactor = 0.06;

const evolutionStages = [0, 120, 260, 480, 760, 1100];

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
  x: state.width / 2,
  y: state.height / 2,
  radius: 22,
  maxRadius: 90,
  colorCore: "rgba(0, 255, 200, 0.6)",
  colorGlow: "rgba(0, 200, 255, 0.3)",
  targetX: state.width / 2,
  targetY: state.height / 2,
  dna: 0,
  wobbleSeed: Math.random() * 1000,
  hp: 100,
  maxHp: 100,
  spikes: 0,
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

const upgradeMeta = {
  vida: document.getElementById("vidaMeta"),
  tamanho: document.getElementById("tamanhoMeta"),
  espinhos: document.getElementById("espinhosMeta"),
  dash: document.getElementById("dashMeta"),
};

const waterParticles = [];
const dnaOrbs = [];
const enemies = [];
const floatingTexts = [];
const dashTrail = [];

const dnaTypes = [
  {
    name: "comum",
    value: 10,
    radius: [4, 7],
    color: "rgba(45, 140, 255, 0.9)",
    glow: "rgba(45, 140, 255, 0.35)",
    chance: 0.75,
  },
  {
    name: "raro",
    value: 25,
    radius: [6, 9],
    color: "rgba(255, 214, 80, 0.95)",
    glow: "rgba(255, 214, 80, 0.4)",
    chance: 0.2,
  },
  {
    name: "epico",
    value: 60,
    radius: [7, 11],
    color: "rgba(255, 99, 255, 0.95)",
    glow: "rgba(255, 99, 255, 0.45)",
    chance: 0.05,
  },
];

const enemyTypes = [
  { shape: "hex", color: "rgba(255, 90, 115, 0.78)" },
  { shape: "tri", color: "rgba(255, 140, 70, 0.78)" },
  { shape: "star", color: "rgba(255, 60, 160, 0.78)" },
];

const movementPatterns = ["spiral", "wave", "float"];

/**
 * Retorna um valor aleatório em um intervalo.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Retorna um valor limitado dentro do intervalo.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

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
}

/**
 * Inicializa partículas aquáticas de fundo.
 */
function initWaterParticles() {
  waterParticles.length = 0;
  for (let i = 0; i < waterParticleCount; i += 1) {
    waterParticles.push({
      x: rand(0, state.width),
      y: rand(0, state.height),
      radius: rand(1, 3.5),
      speed: rand(0.2, 0.7),
      alpha: rand(0.1, 0.6),
    });
  }
}

/**
 * Atualiza as partículas de fundo para criar a sensação de água viva.
 */
function updateWaterParticles() {
  waterParticles.forEach((particle) => {
    particle.y -= particle.speed;
    particle.x += Math.sin((state.frame + particle.y) * 0.004) * 0.4;
    if (particle.y < -10) {
      particle.y = state.height + 10;
      particle.x = rand(0, state.width);
    }
  });
}

/**
 * Desenha partículas de fundo.
 */
function drawWaterParticles() {
  waterParticles.forEach((particle) => {
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80, 190, 255, ${particle.alpha})`;
    ctx.fill();
  });
}

/**
 * Escolhe um tipo de DNA baseado em raridade.
 * @returns {object}
 */
function pickDnaType() {
  const roll = Math.random();
  let cumulative = 0;
  for (const type of dnaTypes) {
    cumulative += type.chance;
    if (roll <= cumulative) {
      return type;
    }
  }
  return dnaTypes[0];
}

/**
 * Gera uma partícula de DNA em posição aleatória.
 * @param {number} [x]
 * @param {number} [y]
 */
function spawnDnaOrb(x, y) {
  const type = pickDnaType();
  dnaOrbs.push({
    x: x ?? rand(40, state.width - 40),
    y: y ?? rand(40, state.height - 40),
    radius: rand(type.radius[0], type.radius[1]),
    color: type.color,
    glow: type.glow,
    pulse: rand(0, Math.PI * 2),
    value: type.value,
    type: type.name,
  });
}

/**
 * Gera um burst de DNA após derrotar inimigos.
 * @param {number} x
 * @param {number} y
 * @param {number} amount
 */
function spawnDnaBurst(x, y, amount) {
  for (let i = 0; i < amount; i += 1) {
    spawnDnaOrb(x + rand(-25, 25), y + rand(-25, 25));
  }
}

/**
 * Retorna uma velocidade base de inimigo baseada no raio.
 * @param {number} radius
 * @returns {number}
 */
function getEnemySpeed(radius) {
  return clamp(2.2 - radius * 0.03, 0.45, 1.6);
}

/**
 * Gera inimigos em posições aleatórias.
 * @param {boolean} [isBoss]
 */
function spawnEnemy(isBoss = false) {
  const type = enemyTypes[Math.floor(rand(0, enemyTypes.length))];
  const baseRadius = isBoss ? rand(70, 90) : rand(18, 36 + state.evolutionLevel * 5);
  const pattern = isBoss ? "boss" : movementPatterns[Math.floor(rand(0, movementPatterns.length))];
  const speed = isBoss ? 0.6 : getEnemySpeed(baseRadius);
  enemies.push({
    x: rand(80, state.width - 80),
    y: rand(80, state.height - 80),
    radius: baseRadius,
    color: isBoss ? "rgba(160, 80, 255, 0.85)" : type.color,
    shape: isBoss ? "star" : type.shape,
    angle: rand(0, Math.PI * 2),
    speed,
    baseSpeed: speed,
    moveType: pattern,
    waveSeed: rand(0, Math.PI * 2),
    damage: baseRadius * 0.55,
    boss: isBoss,
  });
}

/**
 * Atualiza a posição do jogador com interpolação suave e dash.
 * @param {number} now
 */
function updatePlayer(now) {
  const dashActive = player.dash.active && now - player.dash.lastUse <= player.dash.duration;
  player.dash.active = dashActive;

  const speedFactor = dashActive ? player.dash.speedMultiplier : 1;
  player.x += (player.targetX - player.x) * baseLerpFactor * speedFactor;
  player.y += (player.targetY - player.y) * baseLerpFactor * speedFactor;
  player.radius = Math.min(player.radius, player.maxRadius);

  if (dashActive) {
    dashTrail.push({
      x: player.x,
      y: player.y,
      radius: player.radius * 1.2,
      life: 1,
    });
  }
}

/**
 * Atualiza o rastro do dash.
 */
function updateDashTrail() {
  dashTrail.forEach((trail, index) => {
    trail.life -= 0.05;
    trail.radius += 0.4;
    if (trail.life <= 0) {
      dashTrail.splice(index, 1);
    }
  });
}

/**
 * Desenha o rastro do dash.
 */
function drawDashTrail() {
  dashTrail.forEach((trail) => {
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80, 250, 255, ${trail.life * 0.25})`;
    ctx.fill();
  });
}

/**
 * Desenha a célula orgânica com círculos e brilho.
 */
function drawPlayer() {
  const pulse = Math.sin(state.frame * 0.06 + player.wobbleSeed) * 1.2;
  const outerRadius = player.radius + pulse;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.arc(player.x, player.y, outerRadius * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = player.colorGlow;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(player.x, player.y, outerRadius, 0, Math.PI * 2);
  ctx.fillStyle = player.colorCore;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(240, 255, 255, 0.6)";
  ctx.stroke();

  for (let i = 0; i < 4; i += 1) {
    const angle = state.frame * 0.01 + i * 1.6;
    const orbRadius = player.radius * 0.32;
    const offset = player.radius * 0.45;
    const orbX = player.x + Math.cos(angle) * offset;
    const orbY = player.y + Math.sin(angle) * offset;
    ctx.beginPath();
    ctx.arc(orbX, orbY, orbRadius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 140, 200, 0.35)";
    ctx.fill();
  }

  if (player.spikes > 0) {
    const spikes = 10 + player.spikes * 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < spikes; i += 1) {
      const angle = (Math.PI * 2 * i) / spikes;
      const inner = outerRadius * 0.9;
      const outer = outerRadius * (1 + player.spikes * 0.05);
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(angle) * inner, player.y + Math.sin(angle) * inner);
      ctx.lineTo(player.x + Math.cos(angle) * outer, player.y + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }
}

/**
 * Atualiza partículas de DNA e detecta colisões.
 */
function updateDnaOrbs() {
  dnaOrbs.forEach((orb, index) => {
    orb.pulse += 0.05;
    const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
    if (dist < player.radius + orb.radius) {
      dnaOrbs.splice(index, 1);
      player.dna += orb.value;
      player.radius += 0.4;
      spawnDnaOrb();
      addFloatingText(`+${orb.value}`, orb.color, player.x, player.y - 12);
      updateHud();
      updateUpgradePanel();
    }
  });
}

/**
 * Desenha as partículas de DNA.
 */
function drawDnaOrbs() {
  dnaOrbs.forEach((orb) => {
    const pulse = Math.sin(orb.pulse) * 1.2;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius + pulse * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = orb.color;
    ctx.shadowColor = orb.glow;
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

/**
 * Desenha inimigos com formatos diferentes.
 * @param {object} enemy
 */
function drawEnemy(enemy) {
  const points = enemy.shape === "tri" ? 3 : enemy.shape === "star" ? 8 : 6;
  const spikeFactor = enemy.shape === "star" ? 1.35 : 1;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.angle);
  ctx.beginPath();
  for (let i = 0; i <= points; i += 1) {
    const angle = (Math.PI * 2 * i) / points;
    const radius = enemy.radius * (i % 2 === 0 ? spikeFactor : 0.85);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fillStyle = enemy.color;
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/**
 * Atualiza inimigos, movimento e colisões.
 * @param {number} now
 */
function updateEnemies(now) {
  enemies.forEach((enemy, index) => {
    if (enemy.moveType === "spiral") {
      enemy.angle += 0.02;
      enemy.x += Math.cos(enemy.angle) * enemy.speed;
      enemy.y += Math.sin(enemy.angle * 1.2) * enemy.speed;
    } else if (enemy.moveType === "wave") {
      enemy.x += Math.cos(state.frame * 0.02 + enemy.waveSeed) * enemy.speed;
      enemy.y += Math.sin(state.frame * 0.018 + enemy.waveSeed) * enemy.speed * 1.1;
      enemy.angle += 0.01;
    } else if (enemy.moveType === "boss") {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      enemy.x += Math.cos(angle) * enemy.speed;
      enemy.y += Math.sin(angle) * enemy.speed;
      enemy.angle += 0.01;
    } else {
      enemy.angle += 0.01;
      enemy.x += Math.cos(enemy.angle) * enemy.speed;
      enemy.y += Math.sin(enemy.angle * 0.8) * enemy.speed;
    }

    if (enemy.x < 40 || enemy.x > state.width - 40) {
      enemy.speed *= -1;
    }
    if (enemy.y < 40 || enemy.y > state.height - 40) {
      enemy.angle = -enemy.angle;
    }

    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (dist < player.radius + enemy.radius * 0.9) {
      const playerPower = player.radius + player.spikes * 4;
      const enemyPower = enemy.radius * 1.1;
      const dashBonus = player.dash.active ? 1.2 : 1;
      if (playerPower * dashBonus >= enemyPower) {
        const reward = Math.round(enemy.radius * 1.2);
        player.dna += reward;
        player.radius = Math.min(player.radius + 1.2, player.maxRadius);
        spawnDnaBurst(enemy.x, enemy.y, Math.ceil(enemy.radius / 12));
        addFloatingText(`+${reward}`, "rgba(120, 255, 200, 0.9)", enemy.x, enemy.y);
        enemies.splice(index, 1);
        if (!enemy.boss) {
          spawnEnemy();
        }
        updateHud();
        updateUpgradePanel();
      } else {
        player.hp = Math.max(player.hp - enemy.damage, 0);
        enemy.x = rand(80, state.width - 80);
        enemy.y = rand(80, state.height - 80);
        addFloatingText("-HP", "rgba(255, 90, 120, 0.9)", player.x, player.y - 18);
        updateHud();
      }
    }
  });

  if (!state.bossSpawned && state.evolutionLevel >= 4) {
    spawnEnemy(true);
    state.bossSpawned = true;
    addFloatingText("Um predador surge...", "rgba(200, 160, 255, 0.9)", state.width / 2, 80);
  }

  if (state.bossSpawned && enemies.every((enemy) => !enemy.boss)) {
    state.bossSpawned = false;
  }
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
 * Atualiza os textos flutuantes.
 */
function updateFloatingTexts() {
  floatingTexts.forEach((text, index) => {
    text.y -= 0.6;
    text.alpha -= 0.015;
    if (text.alpha <= 0) {
      floatingTexts.splice(index, 1);
    }
  });
}

/**
 * Desenha textos flutuantes.
 */
function drawFloatingTexts() {
  floatingTexts.forEach((text) => {
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.fillStyle = text.color.replace("0.9", text.alpha.toFixed(2));
    ctx.fillText(text.text, text.x, text.y);
  });
}

/**
 * Atualiza o HUD com valores atuais.
 */
function updateHud() {
  dnaLabel.textContent = player.dna;
  hpLabel.textContent = `${Math.round(player.hp)} / ${player.maxHp}`;
  hpBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
}

/**
 * Atualiza o painel de dash.
 * @param {number} now
 */
function updateDashHud(now) {
  const elapsed = now - player.dash.lastUse;
  const ready = elapsed >= player.dash.cooldown;
  const progress = Math.min(elapsed / player.dash.cooldown, 1) * 100;
  dashBar.style.width = `${progress}%`;
  dashLabel.textContent = ready ? "Pronto" : "Recarregando";
}

/**
 * Atualiza a barra de evolução.
 */
function updateEvolutionHud() {
  const currentTarget = evolutionStages[state.evolutionLevel - 1];
  const nextTarget = evolutionStages[state.evolutionLevel] ?? evolutionStages[evolutionStages.length - 1];
  const range = Math.max(nextTarget - currentTarget, 1);
  const progress = clamp((state.dnaSpent - currentTarget) / range, 0, 1);
  evolutionBar.style.width = `${progress * 100}%`;
  evolutionLabel.textContent = `Fase ${state.evolutionLevel}`;
}

/**
 * Avança para uma nova etapa de evolução.
 */
function levelUpEvolution() {
  state.evolutionLevel += 1;
  state.evolutionFlash = 60;
  player.colorCore = `rgba(${40 + state.evolutionLevel * 30}, 255, 200, 0.65)`;
  player.colorGlow = `rgba(0, 190, ${200 + state.evolutionLevel * 8}, 0.3)`;
  addFloatingText("Nova evolução!", "rgba(150, 255, 230, 0.95)", state.width / 2 - 60, 120);
  updateEvolutionHud();

  if (state.evolutionLevel >= evolutionStages.length - 1) {
    state.phase = "ending";
    endingScreen.classList.add("ending--visible");
  }
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
 * Atualiza o painel de upgrades.
 */
function updateUpgradePanel() {
  Object.entries(upgradeMeta).forEach(([key, element]) => {
    const level = upgrades[key].level;
    const cost = getUpgradeCost(key);
    element.textContent = `Nível ${level} · Custo ${cost} DNA`;
  });

  document.querySelectorAll(".menu__card").forEach((button) => {
    const key = button.dataset.upgrade;
    const cost = getUpgradeCost(key);
    button.disabled = player.dna < cost;
  });
}

/**
 * Aplica o upgrade selecionado.
 * @param {string} key
 */
function applyUpgrade(key) {
  const cost = getUpgradeCost(key);
  if (player.dna < cost || state.phase !== "playing") {
    return;
  }
  player.dna -= cost;
  state.dnaSpent += cost;
  upgrades[key].level += 1;

  if (key === "vida") {
    player.maxHp += 20;
    player.hp = Math.min(player.hp + 20, player.maxHp);
  }

  if (key === "tamanho") {
    player.maxRadius += 8;
    player.radius = Math.min(player.radius + 4, player.maxRadius);
  }

  if (key === "espinhos") {
    player.spikes += 1;
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

  updateHud();
  updateUpgradePanel();
  updateEvolutionHud();
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
 * Desenha a cena de introdução inspirada em Spore.
 */
function drawIntroScene() {
  ctx.fillStyle = "rgba(0, 4, 12, 0.85)";
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.beginPath();
  ctx.arc(state.width * 0.5, state.height * 0.8, state.width, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 60, 100, 0.35)";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(state.intro.meteorX, state.intro.meteorY);
  ctx.lineTo(state.intro.meteorX - 120, state.intro.meteorY - 80);
  ctx.strokeStyle = "rgba(255, 140, 80, 0.7)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(state.intro.meteorX, state.intro.meteorY, 12, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 200, 120, 0.9)";
  ctx.fill();

  if (state.intro.splash > 0) {
    const splashRadius = 40 + state.intro.splash * 80;
    ctx.beginPath();
    ctx.arc(state.width * 0.7, state.height * 0.7, splashRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 200, 255, ${0.4 - state.intro.splash * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (state.intro.cellRise > 0) {
    const cellY = state.height * 0.72 - state.intro.cellRise * 60;
    ctx.beginPath();
    ctx.arc(state.width * 0.7, cellY, 18 + state.intro.cellRise * 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 240, 210, 0.6)";
    ctx.fill();
  }
}

/**
 * Loop principal.
 * @param {number} now
 */
function loop(now) {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, state.width, state.height);

  if (state.phase === "intro") {
    updateIntroScene();
    drawIntroScene();
    updateWaterParticles();
    drawWaterParticles();
    window.requestAnimationFrame(loop);
    return;
  }

  updateWaterParticles();
  drawWaterParticles();

  if (state.evolutionFlash > 0) {
    ctx.fillStyle = `rgba(80, 255, 230, ${state.evolutionFlash / 200})`;
    ctx.fillRect(0, 0, state.width, state.height);
    state.evolutionFlash -= 1;
  }

  if (state.phase === "playing") {
    updatePlayer(now);
    updateDashTrail();

    if (!state.menuOpen) {
      updateDnaOrbs();
      updateEnemies(now);
    }
  }

  drawDashTrail();
  drawDnaOrbs();
  enemies.forEach(drawEnemy);
  drawPlayer();
  drawFloatingTexts();
  updateFloatingTexts();
  updateDashHud(now);

  state.frame += 1;
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
  player.targetX = event.clientX;
  player.targetY = event.clientY;
  state.pointerActive = true;
}

/**
 * Centraliza o jogador quando o ponteiro sai.
 */
function handlePointerLeave() {
  if (!state.pointerActive) {
    return;
  }
  player.targetX = state.width / 2;
  player.targetY = state.height / 2;
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
  upgradeMenu.classList.toggle("menu--open", state.menuOpen);
}

/**
 * Exibe o tutorial inicial.
 */
function showTutorial() {
  tutorial.classList.add("tutorial--visible");
  setTimeout(() => {
    tutorial.classList.remove("tutorial--visible");
  }, 5200);
}

/**
 * Prepara o jogo para iniciar.
 */
function startGame() {
  state.phase = "playing";
  introScreen.classList.remove("intro--visible");
  showTutorial();
  state.dnaSpent = 0;
  state.evolutionLevel = 1;
  state.bossSpawned = false;
  updateEvolutionHud();
}

/**
 * Reinicia o ciclo evolutivo.
 */
function resetGame() {
  Object.keys(upgrades).forEach((key) => {
    upgrades[key].level = 0;
  });

  player.x = state.width / 2;
  player.y = state.height / 2;
  player.radius = 22;
  player.maxRadius = 90;
  player.dna = 0;
  player.hp = 100;
  player.maxHp = 100;
  player.spikes = 0;
  player.dash.cooldown = 1800;
  player.dash.duration = 240;
  player.dash.speedMultiplier = 2.4;
  player.colorCore = "rgba(0, 255, 200, 0.6)";
  player.colorGlow = "rgba(0, 200, 255, 0.3)";

  dnaOrbs.length = 0;
  enemies.length = 0;
  floatingTexts.length = 0;
  dashTrail.length = 0;

  for (let i = 0; i < dnaOrbCount; i += 1) {
    spawnDnaOrb();
  }
  for (let i = 0; i < enemyCount; i += 1) {
    spawnEnemy();
  }

  updateHud();
  updateUpgradePanel();
  updateEvolutionHud();

  endingScreen.classList.remove("ending--visible");
  state.phase = "intro";
  introScreen.classList.add("intro--visible");
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerdown", handlePointerMove);
window.addEventListener("pointerleave", handlePointerLeave);
window.addEventListener("keydown", handleKeyDown);

Array.from(document.querySelectorAll(".menu__card")).forEach((button) => {
  button.addEventListener("click", () => applyUpgrade(button.dataset.upgrade));
});

menuToggle.addEventListener("click", toggleMenu);
startButton.addEventListener("click", () => {
  startGame();
});
restartButton.addEventListener("click", () => {
  resetGame();
});

resizeCanvas();
initWaterParticles();
for (let i = 0; i < dnaOrbCount; i += 1) {
  spawnDnaOrb();
}
for (let i = 0; i < enemyCount; i += 1) {
  spawnEnemy();
}
updateHud();
updateUpgradePanel();
updateEvolutionHud();
introScreen.classList.add("intro--visible");
window.requestAnimationFrame(loop);
