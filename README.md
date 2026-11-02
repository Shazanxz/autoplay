<div align="center">

<img src="public/favicon.png" alt="Autoplay logo" width="120" height="120">

# Autoplay

**MP3 playlist generator with a direct link for SA-MP audiostream.**<br>
Upload up to 10 songs, pick a link name and get a URL ready to use on your server.

![MIT License](https://img.shields.io/badge/license-MIT-1B5E20?style=flat-square)
![Node 20+](https://img.shields.io/badge/node-%E2%89%A520-2E7D32?style=flat-square)
![SQLite](https://img.shields.io/badge/database-SQLite-4CAF50?style=flat-square)

<a href="https://skillicons.dev">
  <img src="https://skillicons.dev/icons?i=html,css,js,nodejs,express,sqlite" height="28" alt="Technologies used: HTML, CSS, JavaScript, Node.js, Express, SQLite">
</a>

[🇧🇷 Português](README.pt-BR.md) · 🇺🇸 English

[Getting started](#getting-started) · [Configuration](#configuration-env) · [API](#api) · [Structure](#project-structure) · [License](#license)

</div>

---

## What is it?

Autoplay merges several audio tracks into a single `.mp3` file and gives you a link like `http://your-site/name.mp3`, ready to be used with **SA:MP audiostream**.

## Features

- **Merges up to 10 tracks** (MP3, WAV, M4A, OGG, FLAC, AAC, OPUS and WEBM) into one 192 kbps stereo `.mp3`, with no gaps between them
- **Custom link:** you choose the playlist name, and the site checks whether it is available
- **Per-user library:** listen to, copy the link of and delete playlists
- **Limits and protection:** playlist and storage quotas per user, a conversion queue and rate limiting
- **No external services:** SQLite database (`better-sqlite3`) and bundled ffmpeg (`ffmpeg-static`)

## Getting started

<details>
<summary>Show step by step</summary>

<br>

Requires [Node.js](https://nodejs.org) 20 or higher. ffmpeg is bundled, so there is nothing else to install.

```bash
git clone https://github.com/shazanxz/autoplay.git
cd autoplay
npm install
cp .env.example .env
npm run gen-secret
```

Paste the generated value into `JWT_SECRET` in your `.env` and start the server:

```bash
npm start
```

Open `http://localhost:3000`. During development, use `npm run dev` (restarts on save).

> When running locally without a reverse proxy, set `TRUST_PROXY=0` in your `.env`.

</details>

## Configuration (.env)

<details>
<summary>Show environment variables</summary>

<br>

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | In `production`, `JWT_SECRET` becomes required |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Server address |
| `JWT_SECRET` | generated in `data/` (dev only) | JWT secret, at least 32 characters |
| `PASSWORD_PEPPER` | empty | Extra secret mixed into the Argon2 hash. Set it **before** registering users: changing it later invalidates existing passwords |
| `TRUST_PROXY` | `1` | Number of trusted proxies in front of the app (`0` if none) |
| `STREAM_PROTOCOL` | `http` | Protocol of generated links (SA-MP requires `http`) |
| `PUBLIC_HOST` | request host | Fixed domain used in links |
| `MAX_PLAYLISTS_PER_USER` | `20` | Playlist limit per user |
| `USER_QUOTA_MB` | `300` | Storage per user |
| `MAX_CONCURRENT_JOBS` | `2` | Simultaneous audio conversions |
| `ARGON2_MEMORY_KIB` / `ARGON2_TIME_COST` / `ARGON2_PARALLELISM` | `19456` / `2` / `1` | Argon2id cost |
| `ARGON2_MAX_CONCURRENT` | `2` | Simultaneous password hashes |

</details>

## Limits

| Item | Value |
| --- | --- |
| Tracks per playlist | 10 |
| Duration per track | 6 minutes |
| Size per file | 20 MB |
| Playlists per user | 20 (configurable) |
| Storage per user | 300 MB (configurable) |
| Password | 8 to 128 characters |

## Project structure

<details>
<summary>Show folder structure</summary>

<br>

```
autoplay/
├── .github/workflows/ci.yml     Automated tests (Node 20 and 22)
├── src/
│   ├── config/                  Environment variables and JWT secret
│   ├── db/                      SQLite connection, schema, legacy migration and repositories
│   ├── auth/                    Sessions and auth middleware
│   ├── middleware/              Language, security (CSP), rate limit, upload, quota and errors
│   ├── services/                Audio conversion (ffmpeg), job queue and playlist rules
│   ├── routes/                  API routes
│   ├── i18n/                    Server messages (pt-BR and en)
│   └── utils/                   Helpers
├── public/
│   ├── index.html
│   ├── icons/sprite.svg         SVG icons
│   ├── css/
│   └── js/                      ES modules: features/, ui/, utils/ and locales/
├── scripts/                     Utilities (gen-secret)
├── test/                        Integration tests (node:test)
├── .env.example
├── package.json
├── README.md
├── README.pt-BR.md
└── LICENSE
```

</details>

## API

All routes live under `/api`. The language of error messages comes from the `X-Lang` header.

| Route | Auth | Description |
| --- | --- | --- |
| `POST /api/register` | no | Creates an account |
| `POST /api/login` | no | Signs in and returns the token |
| `POST /api/logout` | yes | Ends the session |
| `GET /api/me` | yes | Current user data |
| `GET /api/check-slug/:slug` | no | Checks whether a link name is available |
| `POST /api/create-playlist` | yes | Uploads tracks and generates the playlist |
| `GET /api/playlist/:slug` | no | Playlist data |
| `GET /api/my/playlists` | yes | The user's playlists |
| `DELETE /api/playlist/:slug` | yes | Deletes a playlist |

Generated playlists are served at `/{slug}.mp3`.

## Languages

The front end uses the dictionaries in `public/js/locales/` and the server uses `src/i18n/locales/`. The client sends its language in the `X-Lang` header, and API error messages come back already translated. To add a language, create the file in both folders and register it in `public/js/i18n.js` and `src/i18n/index.js`.

## Migrating from old versions

If `data/users.json` and `data/playlists.json` exist (the JSON-file version), they are imported into SQLite on first run and renamed to `.migrated`. Accounts with legacy (scrypt) passwords keep working and are converted to Argon2id on their next login.

## Deployment

In production, set `NODE_ENV=production` and `JWT_SECRET`, and keep the `data/` and `streams/` folders on persistent disk.

## License

Distributed under the [MIT](LICENSE) license. You may use, copy, modify and distribute it, keeping the copyright notice.