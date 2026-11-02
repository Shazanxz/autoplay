import { state } from '../state.js';
import { PASSWORD_MIN, TOKEN_KEY, NICK_KEY } from '../config.js';
import { $ } from '../utils/dom.js';
import { store, load, drop } from '../utils/storage.js';
import { apiFetch, publicFetch } from '../api.js';
import { t } from '../i18n.js';
import { on, emit } from '../events.js';

const loginCard = $('login-card');
const appArea = $('app-area');
const authTabs = $('auth-tabs');
const authTitle = $('auth-title');
const loginHint = $('login-hint');
const nickInput = $('nick-input');
const passwordInput = $('password-input');
const passwordConfirm = $('password-confirm');
const passwordConfirmField = $('password-confirm-field');
const authSubmit = $('auth-submit');
const authSubmitText = $('auth-submit-text');
const authSpinner = $('auth-spinner');
const authStatus = $('auth-status');
const authStatusText = $('auth-status-text');
const pwStrength = $('pw-strength');
const pwStrengthFill = $('pw-strength-fill');
const pwStrengthLabel = $('pw-strength-label');
const pwMatch = $('pw-match');
const profileBadge = $('profile-badge');

const STRENGTH_COLORS = ['#ff5c7a', '#ff5c7a', '#e0b84c', '#1DB954', '#1ED760'];

let status = { key: 'auth.sessionNote', params: {}, variant: '', raw: null };

function renderStatus() {
  authStatus.className = 'slug-status auth-status' + (status.variant ? ` ${status.variant}` : '');
  authStatusText.textContent = status.raw ?? t(status.key, status.params);
}

function setStatus(key, variant = '', params = {}) {
  status = { key, params, variant, raw: null };
  renderStatus();
}

function setStatusRaw(text, variant = '') {
  status = { key: '', params: {}, variant, raw: text };
  renderStatus();
}

function renderMode() {
  const isRegister = state.authMode === 'register';
  authSubmitText.textContent = t(isRegister ? 'auth.tabRegister' : 'auth.tabLogin');
  authTitle.textContent = t(isRegister ? 'auth.titleRegister' : 'auth.titleLogin');
  loginHint.textContent = t(isRegister ? 'auth.hintRegister' : 'auth.hintLogin', { min: PASSWORD_MIN });

  document.querySelectorAll('.auth-eye').forEach((button) => {
    const pressed = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-label', t(pressed ? 'auth.hidePassword' : 'auth.showPassword'));
  });
}

function setAuthMode(mode) {
  state.authMode = mode;
  authTabs.dataset.mode = mode;
  authTabs.querySelectorAll('.auth-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });
  passwordConfirmField.hidden = mode !== 'register';
  pwStrength.hidden = mode !== 'register';
  passwordInput.setAttribute('autocomplete', mode === 'register' ? 'new-password' : 'current-password');
  renderMode();
  setStatus('auth.sessionNote');
  updatePasswordMatch();
}

function scorePassword(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= PASSWORD_MIN) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

function updatePasswordStrength() {
  if (state.authMode !== 'register') return;
  const score = scorePassword(passwordInput.value);
  const percent = passwordInput.value ? Math.max(12, (score / 4) * 100) : 0;
  pwStrengthFill.style.width = `${percent}%`;
  pwStrengthFill.style.background = STRENGTH_COLORS[score];
  pwStrengthLabel.textContent = t('auth.strength')[passwordInput.value ? score : 0];
}

function updatePasswordMatch() {
  const wrap = passwordConfirm.closest('.auth-input-wrap');
  if (state.authMode !== 'register' || !passwordConfirm.value) {
    pwMatch.hidden = true;
    wrap.classList.remove('input-error');
    return;
  }
  const matches = passwordConfirm.value === passwordInput.value;
  pwMatch.hidden = false;
  pwMatch.className = matches ? 'pw-match match-ok' : 'pw-match match-bad';
  pwMatch.textContent = t(matches ? 'auth.matchOk' : 'auth.matchBad');
  wrap.classList.toggle('input-error', !matches);
}

function togglePasswordVisibility(button) {
  const input = $(button.dataset.target);
  const reveal = input.type === 'password';
  input.type = reveal ? 'text' : 'password';
  button.querySelector('.eye-open').hidden = reveal;
  button.querySelector('.eye-closed').hidden = !reveal;
  button.setAttribute('aria-pressed', String(reveal));
  button.setAttribute('aria-label', t(reveal ? 'auth.hidePassword' : 'auth.showPassword'));
}

function setSession(nick, token) {
  state.nick = nick;
  state.token = token;
  store(TOKEN_KEY, token);
  store(NICK_KEY, nick);
}

function clearSession() {
  emit('session:leave');
  state.nick = '';
  state.token = '';
  state.playlists = [];
  drop(TOKEN_KEY);
  drop(NICK_KEY);
}

function showLogin(mode = 'login') {
  setAuthMode(mode);
  loginCard.hidden = false;
  appArea.hidden = true;
  profileBadge.hidden = true;
  passwordInput.value = '';
  passwordConfirm.value = '';
  updatePasswordStrength();
  updatePasswordMatch();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function enterApp(nick) {
  $('profile-nick').textContent = nick;
  $('profile-avatar').textContent = nick.charAt(0).toUpperCase();
  profileBadge.hidden = false;
  loginCard.hidden = true;
  appArea.hidden = false;
  emit('session:enter', nick);
  emit('form:changed');
}

async function submitAuth() {
  const nick = nickInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  const isRegister = state.authMode === 'register';

  if (!nick || !password) return setStatus('auth.fillAll', 'taken');
  if (isRegister && password !== passwordConfirm.value) return setStatus('auth.mismatch', 'taken');

  authSubmit.disabled = true;
  authSpinner.hidden = false;
  setStatus(isRegister ? 'auth.creating' : 'auth.signingIn');

  try {
    const res = await publicFetch(isRegister ? '/api/register' : '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nick, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t('auth.failed'));

    setSession(data.nick, data.token);
    setStatus('auth.welcome', 'available', { nick: data.nick });
    enterApp(data.nick);
  } catch (err) {
    setStatusRaw(err.message, 'taken');
  } finally {
    authSubmit.disabled = false;
    authSpinner.hidden = true;
  }
}

export async function restoreSession() {
  const savedToken = load(TOKEN_KEY);
  if (!savedToken) return showLogin('login');

  state.token = savedToken;
  state.nick = load(NICK_KEY);

  try {
    const res = await apiFetch('/api/me');
    const data = await res.json();
    if (!res.ok) throw new Error();
    state.nick = data.nick;
    store(NICK_KEY, data.nick);
    enterApp(data.nick);
  } catch {
    if (state.token) {
      clearSession();
      showLogin('login');
    }
  }
}

export function initAuth() {
  authTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.auth-tab');
    if (tab) setAuthMode(tab.dataset.mode);
  });

  document.querySelectorAll('.auth-eye').forEach((button) => {
    button.addEventListener('click', () => togglePasswordVisibility(button));
  });

  passwordInput.addEventListener('input', () => {
    updatePasswordStrength();
    updatePasswordMatch();
  });
  passwordConfirm.addEventListener('input', updatePasswordMatch);

  authSubmit.addEventListener('click', submitAuth);
  [nickInput, passwordInput, passwordConfirm].forEach((field) => {
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submitAuth();
    });
  });

  $('logout-btn').addEventListener('click', async () => {
    try {
      await apiFetch('/api/logout', { method: 'POST' });
    } catch {}
    clearSession();
    showLogin('login');
    setStatus('auth.signedOut');
  });

  on('session:expired', (message) => {
    clearSession();
    showLogin('login');
    if (message) setStatusRaw(message, 'taken');
    else setStatus('auth.expired', 'taken');
  });

  on('lang:change', () => {
    renderMode();
    renderStatus();
    updatePasswordStrength();
    updatePasswordMatch();
  });

  setAuthMode('login');
}
