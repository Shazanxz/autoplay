import { $ } from '../utils/dom.js';
import { t } from '../i18n.js';

const MIN_VISIBLE_MS = 2200;
const FALLBACK_HIDE_MS = 6000;
const ARC_LENGTH = 2 * Math.PI * 64;

const splash = $('splash');
const arc = $('splash-arc');
const fill = $('splash-bar-fill');
const percent = $('splash-percent');
const status = $('splash-status');
const stage = $('splash-stage');
const vinyl = $('splash-vinyl');
const ripple = $('splash-ripple');

const startedAt = Date.now();

let progress = 0;
let target = 0;
let done = false;
let frame = null;
let messageTimer = null;
let messageIndex = 0;

function paint(value) {
  const v = Math.max(0, Math.min(100, value));
  if (fill) fill.style.width = `${v}%`;
  if (percent) percent.textContent = `${Math.round(v)}%`;
  if (arc) arc.style.strokeDashoffset = String(ARC_LENGTH * (1 - v / 100));
}

function tick() {
  const ceiling = done ? 100 : 90;
  target = Math.min(ceiling, target + (done ? 6 : Math.random() * 2.2));
  progress += (target - progress) * 0.12;
  paint(progress);

  if (done && progress > 99.4) {
    paint(100);
    cancelAnimationFrame(frame);
    return;
  }
  frame = requestAnimationFrame(tick);
}

function rotateMessage() {
  if (!status) return;
  const messages = t('splash.messages');
  status.classList.add('swap');
  setTimeout(() => {
    messageIndex = (messageIndex + 1) % messages.length;
    status.textContent = messages[messageIndex];
    status.classList.remove('swap');
  }, 300);
}

function bindVinylInteraction() {
  if (!stage || !vinyl) return;

  const tilt = (clientX, clientY) => {
    const rect = stage.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width - 0.5;
    const py = (clientY - rect.top) / rect.height - 0.5;
    vinyl.style.transform = `rotateX(${(-py * 26).toFixed(2)}deg) rotateY(${(px * 26).toFixed(2)}deg) scale(1.06)`;
  };
  const resetTilt = () => {
    vinyl.style.transform = '';
  };

  stage.addEventListener('mousemove', (event) => tilt(event.clientX, event.clientY));
  stage.addEventListener('touchmove', (event) => {
    const touch = event.touches[0];
    if (touch) tilt(touch.clientX, touch.clientY);
  }, { passive: true });
  stage.addEventListener('mouseleave', resetTilt);
  stage.addEventListener('touchend', resetTilt);

  stage.addEventListener('click', () => {
    if (ripple) {
      ripple.classList.remove('go');
      void ripple.offsetWidth;
      ripple.classList.add('go');
    }
    target = Math.min(done ? 100 : 92, target + 9);
  });
}

export function hideSplash() {
  if (!splash || !splash.isConnected || done) return;
  done = true;

  const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - startedAt));

  setTimeout(() => {
    clearInterval(messageTimer);
    target = 100;
    paint(100);
    if (status) status.textContent = t('splash.ready');

    setTimeout(() => {
      document.body.classList.remove('loading');
      document.body.classList.add('ready');
      splash.classList.add('hide');
      setTimeout(() => {
        cancelAnimationFrame(frame);
        splash.remove();
      }, 800);
    }, 380);
  }, wait);
}

export function initSplash() {
  document.body.classList.add('loading');

  if (arc) {
    arc.style.strokeDasharray = String(ARC_LENGTH);
    arc.style.strokeDashoffset = String(ARC_LENGTH);
  }
  paint(0);

  if (status) status.textContent = t('splash.messages')[0];
  if (splash) {
    frame = requestAnimationFrame(tick);
    messageTimer = setInterval(rotateMessage, 1100);
  }

  bindVinylInteraction();
  setTimeout(hideSplash, FALLBACK_HIDE_MS);
}
