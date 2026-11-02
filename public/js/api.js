import { state } from './state.js';
import { TOKEN_KEY } from './config.js';
import { store } from './utils/storage.js';
import { getLang, t } from './i18n.js';
import { emit } from './events.js';

let lastServerTouch = Date.now();

export const markServerTouch = () => {
  lastServerTouch = Date.now();
};
export const msSinceServerTouch = () => Date.now() - lastServerTouch;

export function publicFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('X-Lang', getLang());
  return fetch(url, { ...options, headers });
}

export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.token) headers.set('Authorization', `Bearer ${state.token}`);

  const res = await publicFetch(url, { ...options, headers });
  markServerTouch();

  const refreshed = res.headers.get('X-Session-Token');
  if (refreshed) {
    state.token = refreshed;
    store(TOKEN_KEY, refreshed);
    emit('session:refreshed');
  }

  if (res.status === 401) {
    let payload = {};
    try {
      payload = await res.clone().json();
    } catch {}
    emit('session:expired', payload.error);
    throw new Error(payload.error || t('auth.expired'));
  }

  return res;
}
