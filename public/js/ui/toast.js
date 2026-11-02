import { $ } from '../utils/dom.js';
import { icon } from './icons.js';

export function toast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `${icon(type === 'error' ? 'alert' : 'check-circle')}<span></span>`;
  el.querySelector('span').textContent = message;
  $('toasts').appendChild(el);

  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}
