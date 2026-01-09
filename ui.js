import { pulseClass } from "./utils.js";

/**
 * Seleciona elementos de UI necessários.
 * @returns {object}
 */
export function getUiElements() {
  return {
    dnaLabel: document.getElementById("dnaScore"),
    hpBar: document.getElementById("hpBar"),
    dashBar: document.getElementById("dashBar"),
    menuToggle: document.getElementById("menuToggle"),
    upgradeMenu: document.getElementById("upgradeMenu"),
    introScreen: document.getElementById("introScreen"),
    startButton: document.getElementById("startButton"),
    endingScreen: document.getElementById("endingScreen"),
    restartButton: document.getElementById("restartButton"),
    characterGrid: document.getElementById("characterGrid"),
    upgradeCards: Array.from(document.querySelectorAll(".menu__card[data-upgrade]")),
    upgradeMeta: {
      vida: document.getElementById("vidaMeta"),
      tamanho: document.getElementById("tamanhoMeta"),
      espinhos: document.getElementById("espinhosMeta"),
      dash: document.getElementById("dashMeta"),
    },
  };
}

/**
 * Atualiza o HUD com valores atuais.
 * @param {object} elements
 * @param {object} player
 */
export function updateHud(elements, player) {
  elements.dnaLabel.textContent = player.dna;
  elements.hpBar.style.width = `${(player.hp / player.maxHp) * 100}%`;
}

/**
 * Atualiza o painel de dash.
 * @param {object} elements
 * @param {object} player
 * @param {number} now
 */
export function updateDashHud(elements, player, now) {
  const elapsed = now - player.dash.lastUse;
  const progress = Math.min(elapsed / player.dash.cooldown, 1) * 100;
  elements.dashBar.style.width = `${progress}%`;
}

/**
 * Atualiza o painel de upgrades.
 * @param {object} elements
 * @param {object} upgrades
 * @param {(key: string) => number} getUpgradeCost
 * @param {(key: string) => boolean} canPurchaseUpgrade
 */
export function updateUpgradePanel(elements, upgrades, getUpgradeCost, canPurchaseUpgrade) {
  Object.entries(elements.upgradeMeta).forEach(([key, element]) => {
    const level = upgrades[key].level;
    const cost = getUpgradeCost(key);
    element.textContent = `Nível ${level} · Custo ${cost} DNA`;
  });

  elements.upgradeCards.forEach((button) => {
    const key = button.dataset.upgrade;
    button.disabled = !canPurchaseUpgrade(key);
  });
}

/**
 * Cria os cartões da loja de personagens.
 * @param {HTMLElement} container
 * @param {Array} characters
 * @returns {Map<string, {button: HTMLButtonElement, meta: HTMLElement}>}
 */
export function renderCharacterCards(container, characters) {
  const map = new Map();
  container.innerHTML = "";
  characters.forEach((character) => {
    const button = document.createElement("button");
    button.className = "menu__card";
    button.dataset.character = character.id;

    const icon = document.createElement("span");
    icon.className = "menu__icon";
    icon.textContent = "🧬";

    const title = document.createElement("span");
    title.className = "menu__title";
    title.textContent = character.name;

    const desc = document.createElement("span");
    desc.className = "menu__desc";
    desc.textContent = character.description;

    const meta = document.createElement("span");
    meta.className = "menu__meta";

    button.append(icon, title, desc, meta);
    container.appendChild(button);
    map.set(character.id, { button, meta });
  });

  return map;
}

/**
 * Atualiza os cartões de personagens.
 * @param {Map} characterCards
 * @param {Array} characters
 * @param {object} player
 */
export function updateCharacterPanel(characterCards, characters, player) {
  characters.forEach((character) => {
    const entry = characterCards.get(character.id);
    if (!entry) {
      return;
    }
    const owned = player.characterId === character.id;
    entry.meta.textContent = owned ? "Adquirido" : `Custo ${character.cost} DNA`;
    entry.meta.classList.toggle("menu__meta--owned", owned);
    entry.button.disabled = owned || player.dna < character.cost;
    entry.button.classList.toggle("menu__card--purchased", owned);
  });
}

/**
 * Anima o HUD de DNA quando algo é coletado.
 * @param {object} elements
 */
export function pulseDnaHud(elements) {
  pulseClass(elements.dnaLabel, "hud__value--pulse", 450);
}

/**
 * Anima o cartão de upgrade comprado.
 * @param {HTMLButtonElement} button
 */
export function pulseCard(button) {
  pulseClass(button, "menu__card--pulse", 600);
}
