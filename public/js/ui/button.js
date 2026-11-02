import { t } from '../i18n.js';

export function flashCopied(button) {
  const label = button.querySelector('.btn-label');
  const original = label.textContent;
  label.textContent = t('result.copied');
  button.classList.add('copied');

  setTimeout(() => {
    label.textContent = original;
    button.classList.remove('copied');
  }, 1600);
}
