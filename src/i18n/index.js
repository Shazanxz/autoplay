import { config } from '../config/index.js';
import ptBR from './locales/pt-BR.js';
import en from './locales/en.js';

const catalogs = { 'pt-BR': ptBR, en };
export const SUPPORTED_LANGUAGES = Object.keys(catalogs);

function normalize(tag) {
  const value = String(tag || '').trim().toLowerCase();
  if (value.startsWith('pt')) return 'pt-BR';
  if (value.startsWith('en')) return 'en';
  return null;
}

export function resolveLanguage(req) {
  const explicit = normalize(req.get('x-lang'));
  if (explicit) return explicit;

  const accepted = String(req.get('accept-language') || '').split(',');
  for (const part of accepted) {
    const found = normalize(part.split(';')[0]);
    if (found) return found;
  }
  return config.defaultLanguage;
}

export function translate(lang, code, params = {}) {
  const catalog = catalogs[lang] || catalogs[config.defaultLanguage];
  const template = catalog[code] ?? catalogs[config.defaultLanguage][code] ?? code;
  return template.replace(/\{(\w+)\}/g, (_, key) => (params[key] ?? ''));
}
