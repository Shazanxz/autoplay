import { state } from '../state.js';
import { MAX_TRACKS, MAX_DURATION_SECONDS, ALLOWED_EXTENSIONS } from '../config.js';
import { $ } from '../utils/dom.js';
import { formatDuration, escapeHtml, genId } from '../utils/format.js';
import { t } from '../i18n.js';
import { on, emit } from '../events.js';
import { icon } from '../ui/icons.js';
import { showError, clearError } from '../ui/banner.js';

const dropzone = $('dropzone');
const fileInput = $('file-input');
const trackList = $('track-list');

function readAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => {
      resolve(0);
      URL.revokeObjectURL(url);
    };
    audio.src = url;
  });
}

export function renderTracks() {
  trackList.innerHTML = '';
  let totalDuration = 0;
  let hasOverLimit = false;
  const last = state.files.length - 1;

  state.files.forEach((entry, index) => {
    totalDuration += entry.duration;
    const over = entry.duration > MAX_DURATION_SECONDS;
    if (over) hasOverLimit = true;

    const li = document.createElement('li');
    li.className = 'track-item';
    li.innerHTML = `
      <span class="track-index">${index + 1}</span>
      <span class="track-icon">${icon('note')}</span>
      <span class="track-info">
        <div class="track-name">${escapeHtml(entry.file.name)}</div>
        <div class="track-duration ${over ? 'over-limit' : ''}">
          ${entry.duration ? formatDuration(entry.duration) : '...'}${over ? t('upload.overLimit', { max: formatDuration(MAX_DURATION_SECONDS) }) : ''}
        </div>
      </span>
      <span class="track-actions">
        <button class="track-btn" data-move="-1" data-id="${entry.id}" title="${t('upload.moveUp')}" aria-label="${t('upload.moveUp')}" type="button" ${index === 0 ? 'disabled' : ''}>${icon('arrow-up')}</button>
        <button class="track-btn" data-move="1" data-id="${entry.id}" title="${t('upload.moveDown')}" aria-label="${t('upload.moveDown')}" type="button" ${index === last ? 'disabled' : ''}>${icon('arrow-down')}</button>
        <button class="track-btn remove" data-id="${entry.id}" title="${t('upload.remove')}" aria-label="${t('upload.remove')}" type="button">${icon('x')}</button>
      </span>
    `;
    trackList.appendChild(li);
  });

  $('track-counter').textContent = `${state.files.length} / ${MAX_TRACKS}`;
  $('progress-fill').style.width = `${Math.min(100, (state.files.length / MAX_TRACKS) * 100)}%`;
  $('progress-label').textContent = t('upload.total', { time: formatDuration(totalDuration) });

  state.hasOverLimit = hasOverLimit;
  emit('form:changed');
}

function moveFile(id, step) {
  const from = state.files.findIndex((file) => file.id === id);
  const to = from + step;
  if (from < 0 || to < 0 || to >= state.files.length) return;
  [state.files[from], state.files[to]] = [state.files[to], state.files[from]];
  renderTracks();
}

function removeFile(id) {
  state.files = state.files.filter((file) => file.id !== id);
  renderTracks();
}

async function addFiles(fileArray) {
  clearError();

  const audioFiles = fileArray.filter((file) => ALLOWED_EXTENSIONS.test(file.name));
  if (audioFiles.length !== fileArray.length) showError(t('upload.errFormats'));

  const room = Math.max(0, MAX_TRACKS - state.files.length);
  if (audioFiles.length > room) showError(t('upload.errLimit', { max: MAX_TRACKS }));

  const accepted = audioFiles.slice(0, room);
  const durations = await Promise.all(accepted.map(readAudioDuration));

  accepted.forEach((file, index) => {
    if (state.files.length >= MAX_TRACKS) return;
    state.files.push({ file, duration: durations[index], id: genId() });
  });

  renderTracks();
}

export function initTracks() {
  trackList.addEventListener('click', (event) => {
    const button = event.target.closest('.track-btn');
    if (!button) return;
    if (button.dataset.move) moveFile(button.dataset.id, Number(button.dataset.move));
    else removeFile(button.dataset.id);
  });

  fileInput.addEventListener('change', (event) => {
    addFiles(Array.from(event.target.files));
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((name) => {
    dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((name) => {
    dropzone.addEventListener(name, (event) => {
      event.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', (event) => addFiles(Array.from(event.dataTransfer.files)));
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  on('form:reset', () => {
    state.files = [];
    renderTracks();
  });
  on('lang:change', renderTracks);
}
