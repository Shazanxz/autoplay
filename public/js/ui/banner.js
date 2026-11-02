import { $ } from '../utils/dom.js';

export function clearError() {
  const existing = $('active-error');
  if (existing) existing.remove();
}

export function showError(message) {
  clearError();
  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.id = 'active-error';
  banner.textContent = message;
  $('upload-card').appendChild(banner);
}
