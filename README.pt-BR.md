<div align="center">

<img src="public/favicon.png" alt="Logo do Autoplay" width="120" height="120">

# Autoplay

**Gerador de playlists MP3 com link direto para o audiostream do SA-MP.**<br>
Envie até 10 músicas, escolha o nome do link e receba uma URL pronta para usar no servidor.

![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-1B5E20?style=flat-square)
![Node 20+](https://img.shields.io/badge/node-%E2%89%A520-2E7D32?style=flat-square)
![SQLite](https://img.shields.io/badge/banco%20de%20dados-SQLite-4CAF50?style=flat-square)

<a href="https://skillicons.dev">
  <img src="https://skillicons.dev/icons?i=html,css,js,nodejs,express,sqlite" height="28" alt="Tecnologias usadas: HTML, CSS, JavaScript, Node.js, Express, SQLite">
</a>

🇧🇷 Português · [🇺🇸 English](README.en.md)

[Como rodar](#como-rodar) · [Configuração](#configuração-env) · [API](#api) · [Estrutura](#estrutura-do-projeto) · [Licença](#licença)

</div>

---

## O que é?

O Autoplay junta várias faixas de áudio em um único arquivo `.mp3` e entrega um link no formato `http://seu-site/nome.mp3`, pronto para ser usado no **audiostream do SA:MP**.

## Funcionalidades

- **Junta até 10 faixas** (MP3, WAV, M4A, OGG, FLAC, AAC, OPUS e WEBM) em um único `.mp3` estéreo de 192 kbps, sem pausas entre elas
- **Link personalizado:** você escolhe o nome da playlist, e o site confere se ele está livre
- **Biblioteca por usuário:** ouvir, copiar o link e apagar playlists
- **Limites e proteção:** cota de playlists e de espaço por usuário, fila de conversão e rate limit
- **Sem serviços externos:** banco SQLite (`better-sqlite3`) e ffmpeg embutido (`ffmpeg-static`)

## Como rodar

<details>
<summary>Ver passo a passo</summary>

<br>

Requer [Node.js](https://nodejs.org) 20 ou superior. O ffmpeg já vem embutido, não precisa instalar.

```bash
git clone https://github.com/shazanxz/autoplay.git
cd autoplay
npm install
cp .env.example .env
npm run gen-secret
```

Cole o valor gerado em `JWT_SECRET` dentro do `.env` e inicie:

```bash
npm start
```

Abra `http://localhost:3000`. Em desenvolvimento, use `npm run dev` (reinicia ao salvar).

> Rodando localmente, sem proxy reverso, defina `TRUST_PROXY=0` no `.env`.

</details>

## Configuração (.env)

<details>
<summary>Ver variáveis de ambiente</summary>

<br>

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `NODE_ENV` | `development` | Em `production`, `JWT_SECRET` passa a ser obrigatório |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Endereço do servidor |
| `JWT_SECRET` | gerado em `data/` (só em dev) | Segredo do JWT, mínimo de 32 caracteres |
| `PASSWORD_PEPPER` | vazio | Segredo extra misturado ao hash Argon2. Defina **antes** de cadastrar usuários: trocar depois invalida as senhas existentes |
| `TRUST_PROXY` | `1` | Número de proxies confiáveis à frente do app (`0` se não houver) |
| `STREAM_PROTOCOL` | `http` | Protocolo dos links gerados (o SA-MP exige `http`) |
| `PUBLIC_HOST` | host da requisição | Domínio fixo usado nos links |
| `MAX_PLAYLISTS_PER_USER` | `20` | Limite de playlists por usuário |
| `USER_QUOTA_MB` | `300` | Espaço por usuário |
| `MAX_CONCURRENT_JOBS` | `2` | Conversões de áudio simultâneas |
| `ARGON2_MEMORY_KIB` / `ARGON2_TIME_COST` / `ARGON2_PARALLELISM` | `19456` / `2` / `1` | Custo do Argon2id |
| `ARGON2_MAX_CONCURRENT` | `2` | Hashes de senha simultâneos |

</details>

## Limites

| Item | Valor |
| --- | --- |
| Faixas por playlist | 10 |
| Duração por faixa | 6 minutos |
| Tamanho por arquivo | 20 MB |
| Playlists por usuário | 20 (configurável) |
| Espaço por usuário | 300 MB (configurável) |
| Senha | 8 a 128 caracteres |

## Estrutura do projeto

<details>
<summary>Ver estrutura de pastas</summary>

<br>

```
autoplay/
├── .github/workflows/ci.yml     Testes automáticos (Node 20 e 22)
├── src/
│   ├── config/                  Variáveis de ambiente e segredo do JWT
│   ├── db/                      Conexão SQLite, schema, migração do formato antigo e repositórios
│   ├── auth/                    sessões e middleware de autenticação
│   ├── middleware/              Idioma, segurança (CSP), rate limit, upload, cota e erros
│   ├── services/                Conversão de áudio (ffmpeg), fila de jobs e regras de playlist
│   ├── routes/                  Rotas da API
│   ├── i18n/                    Mensagens do servidor (pt-BR e en)
│   └── utils/                   Funções auxiliares
├── public/
│   ├── index.html
│   ├── icons/sprite.svg         Icons SVG
│   ├── css/                    
│   └── js/                      Módulos ES: features/, ui/, utils/ e locales/
├── scripts/                     Utilitários (gen-secret)
├── test/                        Testes de integração (node:test)
├── .env.example
├── package.json
├── README.md
├── README.pt-BR.md
└── LICENSE
```

</details>

## API

Todas as rotas ficam sob `/api`. O idioma das mensagens de erro vem do cabeçalho `X-Lang`.

| Rota | Auth | Descrição |
| --- | --- | --- |
| `POST /api/register` | não | Cria uma conta |
| `POST /api/login` | não | Entra e recebe o token |
| `POST /api/logout` | sim | Encerra a sessão |
| `GET /api/me` | sim | Dados do usuário logado |
| `GET /api/check-slug/:slug` | não | Confere se o nome do link está livre |
| `POST /api/create-playlist` | sim | Envia as faixas e gera a playlist |
| `GET /api/playlist/:slug` | não | Dados de uma playlist |
| `GET /api/my/playlists` | sim | Playlists do usuário |
| `DELETE /api/playlist/:slug` | sim | Apaga uma playlist |

As playlists geradas ficam disponíveis em `/{slug}.mp3`.

## Idiomas

O front usa os dicionários em `public/js/locales/` e o servidor usa `src/i18n/locales/`. O cliente envia o idioma no cabeçalho `X-Lang` e as mensagens de erro da API já voltam traduzidas. Para adicionar um idioma, crie o arquivo nas duas pastas e registre-o em `public/js/i18n.js` e `src/i18n/index.js`.

## Migração de versões antigas

Se existirem `data/users.json` e `data/playlists.json` (versão com arquivos JSON), eles são importados para o SQLite na primeira execução e renomeados para `.migrated`. Contas com senha antiga (scrypt) continuam funcionando e são convertidas para Argon2id no próximo login.

## Deploy

Em produção, defina `NODE_ENV=production` e `JWT_SECRET`, e mantenha as pastas `data/` e `streams/` em disco persistente.

## Licença

Distribuído sob a licença [MIT](LICENSE). Você pode usar, copiar, modificar e distribuir, mantendo o aviso de copyright.
