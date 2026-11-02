import { state } from '../state.js';
import { MAX_TRACKS } from '../config.js';
import { $ } from '../utils/dom.js';
import { escapeHtml } from '../utils/format.js';
import { copyText } from '../utils/clipboard.js';
import { apiFetch } from '../api.js';
import { t } from '../i18n.js';
import { on, emit } from '../events.js';
import { toast } from '../ui/toast.js';
import { flashCopied } from '../ui/button.js';
import { showError, clearError } from '../ui/banner.js';

const generateBtn = $('generate-btn');
const generateBtnText = $('generate-btn-text');
const generateSpinner = $('generate-spinner');
const resultCard = $('result-card');
const uploadCard = $('upload-card');
const domainCard = $('domain-card');
const resultUrl = $('result-url');
const copyBtn = $('copy-btn');
const resultHint = $('result-owner').parentElement;

function updateGenerateState() {
  generateBtn.disabled = !(
    state.files.length > 0 &&
    state.files.length <= MAX_TRACKS &&
    !state.hasOverLimit &&
    state.slugAvailable &&
    state.token
  );
}

function renderResultHint() {
  if (!state.nick) return;
  resultHint.innerHTML = t('result.hint', { nick: escapeHtml(state.nick) });
}

function showResult(data) {
  state.playlists.unshift({
    slug: data.slug,
    url: data.url,
    tracks: data.tracks,
    trackCount: (data.tracks || []).length,
    totalDuration: data.totalDuration,
    createdAt: data.createdAt || new Date().toISOString(),
  });
  emit('library:changed');

  resultUrl.value = data.url;
  renderResultHint();
  resultCard.hidden = false;
  uploadCard.hidden = true;
  domainCard.hidden = true;
  generateBtn.hidden = true;
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function generate() {
  clearError();
  generateBtn.disabled = true;
  generateBtnText.textContent = t('generate.busy');
  generateSpinner.hidden = false;

  try {
    const formData = new FormData();
    formData.append('slug', $('slug-input').value);
    state.files.forEach((entry) => formData.append('tracks', entry.file));

    const res = await apiFetch('/api/create-playlist', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showResult(data);
  } catch (err) {
    if (state.token) {
      showError(err.message);
      generateBtn.disabled = false;
    }
  } finally {
    generateBtnText.textContent = t('generate.button');
    generateSpinner.hidden = true;
  }
}

function startOver() {
  emit('form:reset');
  resultCard.hidden = true;
  uploadCard.hidden = false;
  domainCard.hidden = false;
  generateBtn.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function initGenerate() {
  generateBtn.addEventListener('click', generate);
  $('reset-btn').addEventListener('click', startOver);

  copyBtn.addEventListener('click', async () => {
    if (await copyText(resultUrl.value)) {
      flashCopied(copyBtn);
    } else {
      resultUrl.select();
      toast(t('result.copyManual'), 'error');
    }
  });

  on('form:changed', updateGenerateState);
  on('session:enter', updateGenerateState);
  on('lang:change', () => {
    renderResultHint();
    if (!generateSpinner.hidden) generateBtnText.textContent = t('generate.busy');
  });
}
