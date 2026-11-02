import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'autoplay-test-'));
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = path.join(workDir, 'data');
process.env.STREAMS_DIR = path.join(workDir, 'streams');
process.env.TMP_DIR = path.join(workDir, 'tmp');
process.env.JWT_SECRET = 'x'.repeat(48);
process.env.ARGON2_MEMORY_KIB = '4096';

const { createApp } = await import('../src/app.js');
const { db, closeDb } = await import('../src/db/index.js');
const { default: ffmpegPath } = await import('ffmpeg-static');

let server;
let base;
let sample;

const post = (url, body, headers = {}) =>
  fetch(base + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function signUp(nick, password = 'Senha-forte-123') {
  const res = await post('/api/register', { nick, password });
  assert.equal(res.status, 200);
  return (await res.json()).token;
}

function playlistForm(slug) {
  const form = new FormData();
  form.append('slug', slug);
  form.append('tracks', new Blob([sample]), 'a.mp3');
  form.append('tracks', new Blob([sample]), 'b.mp3');
  return form;
}

before(async () => {
  const file = path.join(workDir, 'sample.mp3');
  spawnSync(ffmpegPath, ['-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-y', file]);
  sample = fs.readFileSync(file);
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDb();
  fs.rmSync(workDir, { recursive: true, force: true });
});

test('cadastro grava a senha com Argon2id e o login funciona', async () => {
  await signUp('alice');
  const row = db.prepare('SELECT password_hash AS hash FROM users WHERE nick = ?').get('alice');
  assert.ok(row.hash.startsWith('$argon2id$'));

  const ok = await post('/api/login', { nick: 'alice', password: 'Senha-forte-123' });
  assert.equal(ok.status, 200);
  const bad = await post('/api/login', { nick: 'alice', password: 'errada-errada' });
  assert.equal(bad.status, 401);
});

test('hash antigo (scrypt) é aceito e atualizado para Argon2id no login', async () => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync('senha-antiga-1', salt, 64).toString('hex');
  db.prepare('INSERT INTO users (nick, salt, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run('veterano', salt, hash, new Date().toISOString());

  const res = await post('/api/login', { nick: 'veterano', password: 'senha-antiga-1' });
  assert.equal(res.status, 200);
  const row = db.prepare('SELECT password_hash AS hash FROM users WHERE nick = ?').get('veterano');
  assert.ok(row.hash.startsWith('$argon2id$'));
});

test('senhas fracas são recusadas e a mensagem respeita o idioma', async () => {
  const pt = await post('/api/register', { nick: 'fraco', password: 'senha123' });
  assert.equal(pt.status, 400);
  assert.match((await pt.json()).error, /comum/);

  const en = await post('/api/register', { nick: 'fraco', password: 'senha123' }, { 'X-Lang': 'en' });
  assert.match((await en.json()).error, /too common/);
});

test('nick "constructor" não derruba o servidor', async () => {
  const res = await post('/api/login', { nick: 'constructor', password: 'qualquer-coisa-1' });
  assert.equal(res.status, 401);
});

test('token inválido ou sem token retorna 401', async () => {
  assert.equal((await fetch(base + '/api/my/playlists')).status, 401);
  assert.equal((await fetch(base + '/api/my/playlists', { headers: auth('abc.def.ghi') })).status, 401);
});

test('criações simultâneas não se sobrescrevem e o mesmo slug só vale uma vez', async () => {
  const alice = await (await post('/api/login', { nick: 'alice', password: 'Senha-forte-123' })).json();
  const bob = await signUp('bob');

  const [a, b] = await Promise.all([
    fetch(base + '/api/create-playlist', { method: 'POST', headers: auth(alice.token), body: playlistForm('lista-alice') }),
    fetch(base + '/api/create-playlist', { method: 'POST', headers: auth(bob), body: playlistForm('lista-bob') }),
  ]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);

  const mine = await (await fetch(base + '/api/my/playlists', { headers: auth(alice.token) })).json();
  assert.deepEqual(mine.playlists.map((p) => p.slug), ['lista-alice']);

  const race = await Promise.all([
    fetch(base + '/api/create-playlist', { method: 'POST', headers: auth(alice.token), body: playlistForm('disputa') }),
    fetch(base + '/api/create-playlist', { method: 'POST', headers: auth(bob), body: playlistForm('disputa') }),
  ]);
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
  assert.ok(fs.existsSync(path.join(workDir, 'streams', 'disputa.mp3')));
});

test('só o dono apaga a playlist', async () => {
  const bob = await (await post('/api/login', { nick: 'bob', password: 'Senha-forte-123' })).json();
  const alice = await (await post('/api/login', { nick: 'alice', password: 'Senha-forte-123' })).json();

  const forbidden = await fetch(base + '/api/playlist/lista-alice', { method: 'DELETE', headers: auth(bob.token) });
  assert.equal(forbidden.status, 403);

  const deleted = await fetch(base + '/api/playlist/lista-alice', { method: 'DELETE', headers: auth(alice.token) });
  assert.equal(deleted.status, 200);
  assert.equal((await fetch(base + '/lista-alice.mp3')).status, 404);
});
