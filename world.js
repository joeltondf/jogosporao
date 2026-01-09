import { clamp, rand } from "./utils.js";

const enemyShapes = ["hex", "tri", "star"];

/**
 * Inicializa partículas aquáticas de fundo.
 * @param {object} state
 * @param {Array} waterParticles
 * @param {object} config
 */
export function initWaterParticles(state, waterParticles, config) {
  waterParticles.length = 0;
  for (let i = 0; i < config.waterParticleCount; i += 1) {
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
 * @param {object} state
 * @param {Array} waterParticles
 */
export function updateWaterParticles(state, waterParticles) {
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
 * Escolhe um tipo de DNA baseado em raridade.
 * @param {Array} dnaTypes
 * @returns {object}
 */
export function pickDnaType(dnaTypes) {
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
 * @param {object} state
 * @param {Array} dnaOrbs
 * @param {Array} dnaTypes
 * @param {object} config
 * @param {number} [x]
 * @param {number} [y]
 */
export function spawnDnaOrb(state, dnaOrbs, dnaTypes, config, x, y) {
  const type = pickDnaType(dnaTypes);
  dnaOrbs.push({
    x: x ?? rand(40, config.worldWidth - 40),
    y: y ?? rand(40, config.worldHeight - 40),
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
 * @param {object} state
 * @param {Array} dnaOrbs
 * @param {Array} dnaTypes
 * @param {object} config
 * @param {number} x
 * @param {number} y
 * @param {number} amount
 */
export function spawnDnaBurst(state, dnaOrbs, dnaTypes, config, x, y, amount) {
  for (let i = 0; i < amount; i += 1) {
    spawnDnaOrb(state, dnaOrbs, dnaTypes, config, x + rand(-25, 25), y + rand(-25, 25));
  }
}

/**
 * Gera inimigos em posições aleatórias.
 * @param {object} state
 * @param {Array} enemies
 * @param {Array} enemyTypes
 * @param {object} config
 * @param {boolean} [isBoss]
 */
export function spawnEnemy(state, enemies, enemyTypes, config, isBoss = false) {
  const type = enemyTypes[Math.floor(rand(0, enemyTypes.length))];
  const baseRadius = isBoss
    ? rand(70, 95)
    : rand(type.radiusRange[0], type.radiusRange[1] + state.evolutionLevel * 3);
  const speed = isBoss
    ? 0.55
    : rand(type.speedRange[0], type.speedRange[1]) + state.evolutionLevel * 0.02;
  const moveType = isBoss ? "boss" : type.behavior;
  enemies.push({
    id: type.id,
    x: rand(80, config.worldWidth - 80),
    y: rand(80, config.worldHeight - 80),
    radius: baseRadius,
    color: isBoss ? "rgba(160, 80, 255, 0.85)" : type.color,
    shape: isBoss ? "star" : enemyShapes[Math.floor(rand(0, enemyShapes.length))],
    angle: rand(0, Math.PI * 2),
    speed,
    baseSpeed: speed,
    moveType,
    waveSeed: rand(0, Math.PI * 2),
    damage: baseRadius * 0.55,
    boss: isBoss,
    hp: (isBoss ? 260 : type.baseHp) + baseRadius * 2.2,
    powerMultiplier: isBoss ? 1.35 : type.powerMultiplier,
    rewardRange: type.dnaReward,
    vx: rand(-speed, speed),
  });
}

/**
 * Atualiza a posição do jogador com interpolação suave e dash.
 * @param {object} state
 * @param {object} player
 * @param {number} now
 * @param {object} config
 */
export function updatePlayer(state, player, now, config) {
  const dashActive = player.dash.active && now - player.dash.lastUse <= player.dash.duration;
  player.dash.active = dashActive;

  const speedFactor = dashActive ? player.dash.speedMultiplier : 1;
  const movementFactor = config.baseLerpFactor * speedFactor * player.speedMultiplier;
  player.x += (player.targetX - player.x) * movementFactor;
  player.y += (player.targetY - player.y) * movementFactor;
  player.radius = Math.min(player.radius, player.maxRadius);

  player.x = clamp(player.x, player.radius, config.worldWidth - player.radius);
  player.y = clamp(player.y, player.radius, config.worldHeight - player.radius);
}

/**
 * Atualiza o rastro do dash.
 * @param {Array} dashTrail
 */
export function updateDashTrail(dashTrail) {
  dashTrail.forEach((trail, index) => {
    trail.life -= 0.05;
    trail.radius += 0.4;
    if (trail.life <= 0) {
      dashTrail.splice(index, 1);
    }
  });
}

/**
 * Atualiza partículas de DNA e detecta colisões.
 * @param {object} state
 * @param {object} player
 * @param {Array} dnaOrbs
 * @param {(orb: object) => void} onCollect
 */
export function updateDnaOrbs(state, player, dnaOrbs, onCollect) {
  for (let i = dnaOrbs.length - 1; i >= 0; i -= 1) {
    const orb = dnaOrbs[i];
    orb.pulse += 0.05;
    const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
    if (dist < player.radius + orb.radius) {
      dnaOrbs.splice(i, 1);
      onCollect(orb);
    }
  }
}

/**
 * Atualiza inimigos, movimento e colisões.
 * @param {object} state
 * @param {object} player
 * @param {Array} enemies
 * @param {object} config
 * @param {(enemy: object) => void} onDefeat
 * @param {(damage: number) => void} onPlayerHit
 */
export function updateEnemies(state, player, enemies, config, onDefeat, onPlayerHit) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];

    if (enemy.moveType === "circular") {
      enemy.angle += 0.02;
      enemy.x += Math.cos(enemy.angle) * enemy.speed;
      enemy.y += Math.sin(enemy.angle * 1.2) * enemy.speed;
    } else if (enemy.moveType === "zigzag") {
      enemy.x += enemy.vx;
      enemy.y += Math.sin(state.frame * 0.02 + enemy.waveSeed) * enemy.speed * 1.5;
      enemy.angle += 0.03;
    } else if (enemy.moveType === "stalker") {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      enemy.x += Math.cos(angle) * enemy.speed;
      enemy.y += Math.sin(angle) * enemy.speed;
      enemy.angle += 0.015;
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

    const minX = enemy.radius;
    const maxX = config.worldWidth - enemy.radius;
    const minY = enemy.radius;
    const maxY = config.worldHeight - enemy.radius;

    if (enemy.x < minX || enemy.x > maxX) {
      enemy.vx *= -1;
      enemy.x = clamp(enemy.x, minX, maxX);
      enemy.angle += Math.PI * 0.5;
    }
    if (enemy.y < minY || enemy.y > maxY) {
      enemy.y = clamp(enemy.y, minY, maxY);
      enemy.angle *= -1;
    }

    const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (dist < player.radius + enemy.radius * 0.9) {
      const playerPower = (player.radius + player.spikes * 4) * player.powerMultiplier;
      const enemyPower = enemy.radius * enemy.powerMultiplier;
      const dashBonus = player.dash.active ? 1.2 : 1;

      if (playerPower * dashBonus >= enemyPower) {
        const damage = playerPower * 0.6;
        enemy.hp -= damage;

        if (enemy.hp <= 0) {
          onDefeat(enemy);
          enemies.splice(i, 1);
          continue;
        }
      } else {
        const damage = Math.max(enemyPower - playerPower, enemy.damage * 0.4);
        enemy.hp -= playerPower * 0.25;
        onPlayerHit(damage);
      }

      const recoilAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      enemy.x = clamp(
        enemy.x + Math.cos(recoilAngle) * 40,
        enemy.radius,
        config.worldWidth - enemy.radius,
      );
      enemy.y = clamp(
        enemy.y + Math.sin(recoilAngle) * 40,
        enemy.radius,
        config.worldHeight - enemy.radius,
      );

      if (enemy.hp <= 0) {
        onDefeat(enemy);
        enemies.splice(i, 1);
      }
    }
  }
}

/**
 * Atualiza os textos flutuantes.
 * @param {Array} floatingTexts
 */
export function updateFloatingTexts(floatingTexts) {
  floatingTexts.forEach((text, index) => {
    text.y -= 0.6;
    text.alpha -= 0.015;
    if (text.alpha <= 0) {
      floatingTexts.splice(index, 1);
    }
  });
}

/**
 * Ajusta a câmera para seguir o jogador.
 * @param {object} state
 * @param {object} player
 * @param {object} config
 */
export function updateCamera(state, player, config) {
  const maxX = Math.max(config.worldWidth - state.width, 0);
  const maxY = Math.max(config.worldHeight - state.height, 0);
  state.cameraX = clamp(player.x - state.width / 2, 0, maxX);
  state.cameraY = clamp(player.y - state.height / 2, 0, maxY);
}
