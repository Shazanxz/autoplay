import { SPRITE_URL } from '../config.js';

export function icon(name, extraClass = '') {
  return `<svg class="icon ${extraClass}" aria-hidden="true"><use href="${SPRITE_URL}#i-${name}"/></svg>`;
}
