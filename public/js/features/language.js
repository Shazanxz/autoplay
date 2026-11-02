import { applyTranslations, getLang, setLang } from '../i18n.js';
import { on } from '../events.js';

export function initLanguage() {
  const buttons = document.querySelectorAll('.lang-btn');

  const paint = () => {
    buttons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === getLang()));
    });
  };

  applyTranslations();
  paint();
  buttons.forEach((button) => button.addEventListener('click', () => setLang(button.dataset.lang)));
  on('lang:change', paint);
}
