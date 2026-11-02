import ptBR from './locales/pt-BR.js';
import en from './locales/en.js';
import { LANG_KEY } from './config.js';
import { load, store } from './utils/storage.js';
import { emit } from './events.js';

const catalogs = { 'pt-BR': ptBR, en };
const FALLBACK = 'pt-BR';

function detectLanguage() {
  const saved = load(LANG_KEY);
  if (catalogs[saved]) return saved;
  const browser = String(navigator.language || '').toLowerCase();
  if (browser.startsWith('en')) return 'en';
  return FALLBACK;
}

let current = detectLanguage();

export const getLang = () => current;

export function t(key, params = {}) {
  const value = catalogs[current][key] ?? catalogs[FALLBACK][key] ?? key;
  if (typeof value === 'function') return value(params);
  if (Array.isArray(value)) return value;
  return String(value).replace(/\{(\w+)\}/g, (_, name) => (params[name] ?? ''));
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  ['placeholder', 'title', 'aria-label'].forEach((attr) => {
    root.querySelectorAll(`[data-i18n-${attr}]`).forEach((el) => {
      el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`)));
    });
  });
  document.documentElement.lang = current;
}

export function setLang(lang) {
  if (!catalogs[lang] || lang === current) return;
  current = lang;
  store(LANG_KEY, lang);
  applyTranslations();
  emit('lang:change', lang);
}
