/**
 * Retorna um valor aleatório em um intervalo.
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Retorna um valor limitado dentro do intervalo.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

/**
 * Aplica uma classe temporária para animações visuais.
 * @param {HTMLElement} element
 * @param {string} className
 * @param {number} duration
 */
export function pulseClass(element, className, duration = 500) {
  if (!element) {
    return;
  }
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => {
    element.classList.remove(className);
  }, duration);
}
