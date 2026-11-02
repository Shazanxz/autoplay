import { $ } from '../utils/dom.js';
import { emit } from '../events.js';

export function initTabs() {
  const tabs = $('tabs');

  tabs.addEventListener('click', (event) => {
    const button = event.target.closest('.tab');
    if (!button) return;

    tabs.querySelectorAll('.tab').forEach((tab) => tab.classList.remove('active'));
    button.classList.add('active');

    const target = button.dataset.tab;
    $('panel-create').hidden = target !== 'create';
    $('panel-library').hidden = target !== 'library';
    if (target === 'library') emit('tab:library');
  });
}
