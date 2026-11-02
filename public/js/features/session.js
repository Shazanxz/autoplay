import { state } from '../state.js';
import { INACTIVITY_MS, KEEPALIVE_MS } from '../config.js';
import { apiFetch, markServerTouch, msSinceServerTouch } from '../api.js';
import { on, emit } from '../events.js';
import { t } from '../i18n.js';

let idleTimer = null;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  if (!state.token) return;
  idleTimer = setTimeout(() => emit('session:expired', t('auth.idleExpired')), INACTIVITY_MS);
}

async function keepAlive() {
  if (!state.token || msSinceServerTouch() < KEEPALIVE_MS) return;
  markServerTouch();
  try {
    await apiFetch('/api/me');
  } catch {}
}

export function initSession() {
  on('session:enter', resetIdleTimer);
  on('session:refreshed', resetIdleTimer);
  on('session:leave', () => clearTimeout(idleTimer));

  ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'].forEach((name) => {
    window.addEventListener(name, () => {
      if (!state.token) return;
      resetIdleTimer();
      keepAlive();
    }, { passive: true });
  });
}
