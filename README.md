# Plantbase

CLI AI agent a növény-katalógus felett: természetes nyelvű kérdés → read-only SQL → magyar válasz. A Robot Dreams AI-ágensfejlesztés kurzus HF1 projektje.

## Előfeltételek

- **Node.js** LTS (22+)
- **pnpm** (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker** (OrbStack macOS-en, vagy Docker Desktop)
- **Anthropic API kulcs** ([console.anthropic.com](https://console.anthropic.com))

## Telepítés

```bash
git clone git@github.com:tolnaizoltan-dms/robotdreams-ai-hf1.git
cd robotdreams-ai-hf1
pnpm install
```

## Környezet

Másold az `.env.example` fájlt `.env` néven, és töltsd ki az API kulcsot:

```bash
cp .env.example .env
```

| Változó | Leírás |
| --- | --- |
| `ANTHROPIC_API_KEY` | Anthropic API kulcs (kötelező) |
| `ANTHROPIC_MODEL` | Modell neve (alapértelmezés: `claude-haiku-4-5`) |
| `DATABASE_URL` | Postgres írási kapcsolat (Prisma migráció, seed) |
| `DATABASE_URL_READONLY` | Postgres read-only kapcsolat (agent `runSql` tool) |

> A `.env` soha ne kerüljön gitbe — a `.gitignore` kizárja.

## Adatbázis

Indítsd a lokális Postgres-t, futtasd a migrációt és a seedet (~30 növény):

```bash
docker compose up -d
pnpm --filter @plantbase/db db:generate
pnpm --filter @plantbase/db db:migrate
pnpm --filter @plantbase/db db:seed
```

A Postgres a **5434**-es porton érhető el (`localhost:5434`).

## Használat

### Egyszeri kérdés

```bash
pnpm cli ask "Milyen kategóriák vannak a katalógusban?"
```

```bash
pnpm cli ask "3 növény 15 000 Ft alatt, kevés fényre, raktáron"
```

### Interaktív mód

Argumentum nélkül indul a readline prompt:

```bash
pnpm cli ask
```

Kilépés: `exit` vagy `quit`.

### Prompt debug

A teljes LLM üzenet-tömb megjelenítése:

```bash
pnpm cli ask "Milyen állatbarát szobanövények vannak?" --show-prompt
```

Az interakciók naplózva: `logs/*.jsonl`.

## Fejlesztés

```bash
pnpm test          # összes teszt (Vitest)
pnpm typecheck     # TypeScript ellenőrzés
pnpm lint          # ESLint
pnpm format        # Prettier
```

Csomagonként:

```bash
pnpm --filter @plantbase/core test
```

## Projektstruktúra

```
apps/cli/           # Commander CLI (ask parancs)
packages/core/      # askAgent, runSql, listCategories, naplózás
packages/db/        # Prisma séma, migráció, seed
docs/               # BRS, architektúra, ROI, system prompt
seed/               # Növény seed adatok
docker-compose.yaml # Lokális Postgres
```

## Dokumentáció

| Fájl | Tartalom |
| --- | --- |
| [`docs/brs-plantbase.md`](docs/brs-plantbase.md) | Üzleti követelmények |
| [`docs/architektura.md`](docs/architektura.md) | Rendszer-architektúra |
| [`docs/system-prompt.md`](docs/system-prompt.md) | Agent system prompt |
| [`docs/roi.md`](docs/roi.md) | ROI-levezetés (5 fős iroda) |
| [`docs/dev-workflow.md`](docs/dev-workflow.md) | Git, hookok, commit konvenciók |
| [`docs/plugins-skills.md`](docs/plugins-skills.md) | Claude Code pluginok és skillek (indoklással) |

## Licenc

Privát kurzusprojekt.
