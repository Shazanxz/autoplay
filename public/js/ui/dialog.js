import { $ } from '../utils/dom.js';

export function askConfirm({ title, message, okLabel }) {
  const dialog = $('confirm-dialog');
  return new Promise((resolve) => {
    $('confirm-title').textContent = title;
    $('confirm-text').textContent = message;
    dialog.querySelector('#confirm-ok .btn-label').textContent = okLabel;
    dialog.returnValue = '';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.showModal();
  });
}
