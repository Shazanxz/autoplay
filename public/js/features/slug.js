import { state } from '../state.js';
import { $ } from '../utils/dom.js';
import { publicFetch } from '../api.js';
import { t } from '../i18n.js';
import { on, emit } from '../events.js';

const slugInput = $('slug-input');
const slugStatus = $('slug-status');

let status = { key: 'domain.hint', params: {}, variant: '', raw: null };
let debounce = null;
let requestId = 0;

function paint() {
  slugStatus.className = 'slug-status' + (status.variant ? ` ${status.variant}` : '');
  slugStatus.textContent = status.raw ?? t(status.key, status.params);
}

function setStatus(key, variant = '', params = {}) {
  status = { key, params, variant, raw: null };
  paint();
}

function setStatusRaw(text, variant = '') {
  status = { key: '', params: {}, variant, raw: text };
  paint();
}

async function checkAvailability(raw, currentId) {
  try {
    const res = await publicFetch(`/api/check-slug/${encodeURIComponent(raw)}`);
    const data = await res.json();
    if (currentId !== requestId) return;

    if (!res.ok) {
      setStatusRaw(data.error || t('domain.error'), 'taken');
      state.slugAvailable = false;
    } else if (!data.valid) {
      if (data.reason) setStatusRaw(data.reason, 'taken');
      else setStatus('domain.invalid', 'taken');
      state.slugAvailable = false;
    } else if (!data.available) {
      setStatus('domain.taken', 'taken', { slug: data.slug });
      state.slugAvailable = false;
    } else {
      setStatus('domain.available', 'available', { url: `${location.host}/${data.slug}.mp3` });
      state.slugAvailable = true;
      state.slug = data.slug;
    }
  } catch {
    if (currentId !== requestId) return;
    setStatus('domain.error');
    state.slugAvailable = false;
  }
  emit('form:changed');
}

function reset() {
  slugInput.value = '';
  state.slug = '';
  state.slugAvailable = false;
  setStatus('domain.hint');
}

export function initSlug() {
  $('domain-prefix').textContent = `${location.host}/`;

  slugInput.addEventListener('input', () => {
    const raw = slugInput.value;
    clearTimeout(debounce);
    requestId += 1;
    const currentId = requestId;
    state.slugAvailable = false;
    emit('form:changed');

    if (!raw.trim()) return setStatus('domain.hint');

    setStatus('domain.checking');
    debounce = setTimeout(() => checkAvailability(raw, currentId), 400);
  });

  on('form:reset', reset);
  on('lang:change', paint);
}
