import { initLanguage } from './features/language.js';
import { initSplash, hideSplash } from './features/splash.js';
import { initSession } from './features/session.js';
import { initAuth, restoreSession } from './features/auth.js';
import { initTabs } from './features/tabs.js';
import { initTracks, renderTracks } from './features/tracks.js';
import { initSlug } from './features/slug.js';
import { initGenerate } from './features/generate.js';
import { initLibrary } from './features/library.js';

async function boot() {
  initLanguage();
  initSplash();
  initSession();
  initTabs();
  initTracks();
  initSlug();
  initGenerate();
  initLibrary();
  initAuth();

  renderTracks();
  await restoreSession();
  hideSplash();
}

boot();
