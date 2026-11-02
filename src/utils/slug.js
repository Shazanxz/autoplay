import { config } from '../config/index.js';

const reserved = new Set(config.reservedSlugs);

export function slugify(raw) {
  return String(raw || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isValidSlug(slug) {
  return /^[a-z0-9][a-z0-9-_]{1,48}[a-z0-9]$/.test(slug) && !reserved.has(slug);
}
