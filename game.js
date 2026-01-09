const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const dnaLabel = document.getElementById("dnaScore");
const hpBar = document.getElementById("hpBar");
const hpLabel = document.getElementById("hpLabel");
const dashBar = document.getElementById("dashBar");
const dashLabel = document.getElementById("dashLabel");

const backgroundColor = "rgba(0, 8, 20, 0.25)";
const waterParticleCount = 160;
const dnaOrbCount = 45;
const enemyCount = 12;
const baseLerpFactor = 0.06;

const state = {
  width: window.innerWidth,
  height: window.innerHeight,
  frame: 0,
  pointerActive: false,
  lastTime: performance.now(),
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
  { shape: "hex", color: "rgba(255, 90, 115, 0.75)" },
  { shape: "tri", color: "rgba(255, 140, 70, 0.75)" },
  { shape: "star", color: "rgba(255, 60, 160, 0.75)" },
];

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
 */
function spawnDnaOrb() {
  const type = pickDnaType();
  dnaOrbs.push({
    x: rand(40, state.width - 40),
    y: rand(40, state.height - 40),
    radius: rand(type.radius[0], type.radius[1]),
    color: type.color,
    glow: type.glow,
    pulse: rand(0, Math.PI * 2),
    value: type.value,
  });
}

/**
 * Gera inimigos em posições aleatórias.
 */
function spawnEnemy() {
  const type = enemyTypes[Math.floor(rand(0, enemyTypes.length))];
  const radius = rand(18, 40);
  enemies.push({
    x: rand(60, state.width - 60),
    y: rand(60, state.height - 60),
    radius,
    color: type.color,
    shape: type.shape,
    angle: rand(0, Math.PI * 2),
    speed: rand(0.4, 1.1),
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
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < spikes; i += 1) {
      const angle = (Math.PI * 2 * i) / spikes;
      const inner = outerRadius * 0.9;
      const outer = outerRadius * (1 + player.spikes * 0.03);
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
      updateHud();
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
 */
function updateEnemies() {
  enemies.forEach((enemy, index) => {
    enemy.angle += 0.01;
    enemy.x += Math.cos(enemy.angle) * enemy.speed;
    enemy.y += Math.sin(enemy.angle * 1.2) * enemy.speed;

    if (enemy.x < 40 || enemy.x > state.width - 40) {
      enemy.angle = Math.PI - enemy.angle;
    }
    if (enemy.y < 40 || enemy.y > state.height - 40) {
      enemy.angle = -enemy.angle;
    }

    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (dist < player.radius + enemy.radius * 0.9) {
      const playerPower = player.radius + player.spikes * 4;
      const enemyPower = enemy.radius * 1.1;
      if (playerPower >= enemyPower) {
        player.dna += Math.round(enemy.radius * 0.8);
        player.radius = Math.min(player.radius + 1.2, player.maxRadius);
        enemies.splice(index, 1);
        spawnEnemy();
      } else {
        player.hp = Math.max(player.hp - enemy.radius * 0.6, 0);
        enemy.x = rand(60, state.width - 60);
        enemy.y = rand(60, state.height - 60);
      }
      updateHud();
    }
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
  if (player.dna < cost) {
    return;
  }
  player.dna -= cost;
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

  updateHud();
  updateUpgradePanel();
}

/**
 * Loop principal.
 * @param {number} now
 */
function loop(now) {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, state.width, state.height);

  updateWaterParticles();
  drawWaterParticles();
  updatePlayer(now);
  updateDnaOrbs();
  updateEnemies();
  drawDnaOrbs();
  enemies.forEach(drawEnemy);
  drawPlayer();

  updateDashHud(now);

  state.frame += 1;
  window.requestAnimationFrame(loop);
}

/**
 * Movimenta o alvo do jogador via ponteiro.
 * @param {PointerEvent} event
 */
function handlePointerMove(event) {
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
  if (event.code !== "Space") {
    return;
  }
  const now = performance.now();
  if (now - player.dash.lastUse >= player.dash.cooldown) {
    player.dash.lastUse = now;
    player.dash.active = true;
  }
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerdown", handlePointerMove);
window.addEventListener("pointerleave", handlePointerLeave);
window.addEventListener("keydown", handleKeyDown);

Array.from(document.querySelectorAll(".menu__card")).forEach((button) => {
  button.addEventListener("click", () => applyUpgrade(button.dataset.upgrade));
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
window.requestAnimationFrame(loop);
