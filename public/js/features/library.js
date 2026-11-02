import { state } from '../state.js';
import { $ } from '../utils/dom.js';
import { formatDuration, formatDate, escapeHtml } from '../utils/format.js';
import { copyText } from '../utils/clipboard.js';
import { apiFetch } from '../api.js';
import { getLang, t } from '../i18n.js';
import { on } from '../events.js';
import { icon } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { askConfirm } from '../ui/dialog.js';
import { flashCopied } from '../ui/button.js';

const playlistList = $('playlist-list');
const libraryMessage = $('library-message');

let loaded = false;

function playlistTemplate(playlist) {
  const total = playlist.totalDuration ? formatDuration(playlist.totalDuration) : '--:--';
  const count = playlist.trackCount != null ? playlist.trackCount : (playlist.tracks || []).length;
  const url = escapeHtml(playlist.url);
  const slug = escapeHtml(playlist.slug);

  return `
    <div class="playlist-top">
      <span class="pl-icon">${icon('disc')}</span>
      <div class="playlist-meta">
        <div class="playlist-name">${slug}.mp3</div>
        <div class="playlist-sub">
          <span class="pl-chip">${icon('note')}${t('library.tracks', { n: count })}</span>
          <span class="pl-chip">${icon('clock')}${total}</span>
          <span class="pl-chip">${icon('calendar')}${formatDate(playlist.createdAt, getLang())}</span>
        </div>
      </div>
    </div>
    <div class="playlist-url">${icon('link')}<span>${url}</span></div>
    <div class="playlist-actions">
      <button class="pl-btn listen" data-action="listen" data-url="${url}" type="button">${icon('play')}<span class="btn-label">${t('library.listen')}</span></button>
      <button class="pl-btn copy" data-action="copy" data-url="${url}" type="button">${icon('copy', 'ic-copy')}${icon('check', 'ic-done')}<span class="btn-label">${t('library.copyLink')}</span></button>
      <button class="pl-btn delete" data-action="delete" data-slug="${slug}" type="button">${icon('trash')}<span class="btn-label">${t('library.delete')}</span></button>
    </div>
  `;
}

function renderLibrary() {
  playlistList.innerHTML = '';
  $('library-count').textContent = state.playlists.length;

  if (!state.playlists.length) {
    libraryMessage.hidden = false;
    libraryMessage.innerHTML = `<div class="empty-state">${icon('headphones')}<p><strong>${t('library.emptyTitle')}</strong></p><p>${t('library.emptyHint')}</p></div>`;
    return;
  }

  libraryMessage.hidden = true;
  state.playlists.forEach((playlist) => {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    li.innerHTML = playlistTemplate(playlist);
    playlistList.appendChild(li);
  });
}

async function fetchLibrary() {
  if (!state.token) return;
  libraryMessage.hidden = false;
  libraryMessage.textContent = t('library.loading');

  try {
    const res = await apiFetch('/api/my/playlists');
    const data = await res.json();
    if (res.ok && Array.isArray(data.playlists)) state.playlists = data.playlists;
  } catch {
    if (!state.token) return;
  }

  loaded = true;
  renderLibrary();
}

async function handleDelete(button) {
  const slug = button.dataset.slug;
  const confirmed = await askConfirm({
    title: t('library.confirmTitle'),
    message: t('library.confirmText', { slug }),
    okLabel: t('library.delete'),
  });
  if (!confirmed) return;

  button.disabled = true;
  try {
    const res = await apiFetch(`/api/playlist/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    state.playlists = state.playlists.filter((playlist) => playlist.slug !== slug);
    renderLibrary();
    toast(t('library.deleted'));
  } catch (err) {
    if (state.token) {
      toast(err.message, 'error');
      button.disabled = false;
    }
  }
}

export function initLibrary() {
  $('refresh-btn').addEventListener('click', fetchLibrary);

  playlistList.addEventListener('click', async (event) => {
    const button = event.target.closest('.pl-btn');
    if (!button) return;

    const { action } = button.dataset;
    if (action === 'listen') {
      window.open(button.dataset.url, '_blank', 'noopener');
    } else if (action === 'copy') {
      if (await copyText(button.dataset.url)) flashCopied(button);
      else toast(t('library.copyFailed'), 'error');
    } else if (action === 'delete') {
      await handleDelete(button);
    }
  });

  on('session:enter', fetchLibrary);
  on('tab:library', fetchLibrary);
  on('library:changed', renderLibrary);
  on('lang:change', () => loaded && renderLibrary());
}
