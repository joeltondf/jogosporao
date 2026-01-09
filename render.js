import { clamp } from "./utils.js";

/**
 * Desenha partículas de fundo.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} waterParticles
 */
export function drawWaterParticles(ctx, waterParticles) {
  waterParticles.forEach((particle) => {
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80, 190, 255, ${particle.alpha})`;
    ctx.fill();
  });
}

/**
 * Desenha o rastro do dash.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} dashTrail
 * @param {object} state
 */
export function drawDashTrail(ctx, dashTrail, state) {
  dashTrail.forEach((trail) => {
    ctx.beginPath();
    ctx.arc(trail.x - state.cameraX, trail.y - state.cameraY, trail.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(80, 250, 255, ${trail.life * 0.25})`;
    ctx.fill();
  });
}

/**
 * Desenha a célula orgânica com círculos e brilho.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} player
 * @param {object} state
 */
export function drawPlayer(ctx, player, state) {
  const pulse = Math.sin(state.frame * 0.06 + player.wobbleSeed) * 1.2;
  const outerRadius = player.radius + pulse;
  const screenX = player.x - state.cameraX;
  const screenY = player.y - state.cameraY;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.beginPath();
  ctx.arc(screenX, screenY, outerRadius * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = player.colorGlow;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(screenX, screenY, outerRadius, 0, Math.PI * 2);
  ctx.fillStyle = player.colorCore;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(240, 255, 255, 0.6)";
  ctx.stroke();

  for (let i = 0; i < 4; i += 1) {
    const angle = state.frame * 0.01 + i * 1.6;
    const orbRadius = player.radius * 0.32;
    const offset = player.radius * 0.45;
    const orbX = screenX + Math.cos(angle) * offset;
    const orbY = screenY + Math.sin(angle) * offset;
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
      ctx.moveTo(screenX + Math.cos(angle) * inner, screenY + Math.sin(angle) * inner);
      ctx.lineTo(screenX + Math.cos(angle) * outer, screenY + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }
}

/**
 * Desenha as partículas de DNA.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} dnaOrbs
 * @param {object} state
 */
export function drawDnaOrbs(ctx, dnaOrbs, state) {
  dnaOrbs.forEach((orb) => {
    const pulse = Math.sin(orb.pulse) * 1.2;
    ctx.beginPath();
    ctx.arc(orb.x - state.cameraX, orb.y - state.cameraY, orb.radius + pulse * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = orb.color;
    ctx.shadowColor = orb.glow;
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

/**
 * Desenha inimigos com formatos diferentes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} enemy
 * @param {object} state
 */
export function drawEnemy(ctx, enemy, state) {
  const points = enemy.shape === "tri" ? 3 : enemy.shape === "star" ? 8 : 6;
  const spikeFactor = enemy.shape === "star" ? 1.35 : 1;
  ctx.save();
  ctx.translate(enemy.x - state.cameraX, enemy.y - state.cameraY);
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
 * Desenha textos flutuantes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} floatingTexts
 * @param {object} state
 */
export function drawFloatingTexts(ctx, floatingTexts, state) {
  floatingTexts.forEach((text) => {
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.fillStyle = text.color.replace("0.9", text.alpha.toFixed(2));
    ctx.fillText(text.text, text.x - state.cameraX, text.y - state.cameraY);
  });
}

/**
 * Desenha o mini-mapa do mundo.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state
 * @param {object} player
 * @param {Array} enemies
 * @param {Array} dnaOrbs
 * @param {object} config
 */
export function drawMiniMap(ctx, state, player, enemies, dnaOrbs, config) {
  const width = clamp(state.width * config.miniMapScale, 140, 260);
  const height = clamp((width * config.worldHeight) / config.worldWidth, 90, 200);
  const padding = 24;
  const x = state.width - width - padding;
  const y = padding;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "rgba(5, 15, 28, 0.75)";
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(120, 220, 255, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);

  const drawPoint = (px, py, color, radius) => {
    ctx.beginPath();
    ctx.arc(x + px * width, y + py * height, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };

  dnaOrbs.forEach((orb) => {
    drawPoint(orb.x / config.worldWidth, orb.y / config.worldHeight, "rgba(80, 200, 255, 0.6)", 2);
  });

  enemies.forEach((enemy) => {
    drawPoint(enemy.x / config.worldWidth, enemy.y / config.worldHeight, "rgba(255, 120, 140, 0.8)", 2.5);
  });

  drawPoint(
    player.x / config.worldWidth,
    player.y / config.worldHeight,
    "rgba(120, 255, 210, 0.95)",
    3,
  );

  ctx.restore();
}

/**
 * Desenha a cena de introdução inspirada em Spore.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state
 */
export function drawIntroScene(ctx, state) {
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
