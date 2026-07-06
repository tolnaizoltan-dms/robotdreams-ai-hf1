# Plantbase — pluginok és skillek

> A HF1 agentic dev környezet dokumentációja: mit telepítettünk, és miért illik a Plantbase stackhez.  
> Konfiguráció: [`.claude/settings.json`](../.claude/settings.json) (pluginok), [`skills-lock.json`](../skills-lock.json) (skillek).

---

## Összefoglaló

A projektet **Claude Code-dal vezéreltük** (nem kézi kódolással). A pluginok és skillek azt a célt szolgálják, hogy az agent a Plantbase technológiai stackjéhez (Nx monorepo, Prisma/Postgres, Vitest, Anthropic SDK) illeszkedő, naprakész kontextussal dolgozzon.

| Típus | Darab | Hol |
| --- | --- | --- |
| Claude Code plugin | 8 | `.claude/settings.json` |
| Projekt skill | 4 | `.claude/skills/`, `.agents/skills/` |

A kurzus **minimum 3 releváns plugin/skill** követelménye teljesül; alább a főbbek indoklása.

---

## Claude Code pluginok

### Kurzus-kötelező (HF1 A szekció)

| Plugin | Indoklás |
| --- | --- |
| **superpowers** | Plan mode, TDD workflow (`writing-plans`, `test-driven-development`), subagent-driven fejlesztés. A `runSql` tool és a `listCategories` bekötése TDD-vel, lépésenkénti plan fájlokkal készült (`docs/superpowers/plans/`). |
| **commit-commands** | Kis, fókuszált Conventional Commits — a beadási kritérium szerint a commit history is értékelt. Automatizálja a `feat:`, `fix:`, `chore:` commitokat lépésenként. |
| **skill-creator** | Saját skill-ek létrehozása és karbantartása a projekthez (pl. későbbi `ddd-audit`). A kurzus L1 bővítések alapja. |
| **github** (MCP) | Repo, branch, PR kezelés agentből — a HF1 beadás GitHub link; a feature branchek (`feat/list-categories`, `feat/docs-roi-analysis`) és PR-ek ezen keresztül készültek. |

### Projekt-specifikus kiegészítők

| Plugin | Indoklás |
| --- | --- |
| **context7** (MCP) | Naprakész library dokumentáció (Anthropic SDK, Commander, pg) anélkül, hogy a modell training adatára hagyatkozna. Hasznos az `askAgent` tool-use loop és a CLI implementáció során. |
| **prisma** | Prisma séma, migráció, seed — a `packages/db` és a `products` tábla közvetlenül ezzel épült. |
| **agent-sdk-dev** | Anthropic Agent SDK minták és best practice — illeszkedik a saját `askAgent` implementációhoz (tool definitions, message loop). |
| **typescript-lsp** | TypeScript strict + NodeNext ESM a monorepóban; az LSP segít az agentnek helyes importokat (`.js` extension) és típusokat tartani. |

---

## Projekt skillek (piacról)

A skillek a repóba commitolva vannak (`.claude/skills/`, `.agents/skills/`), hogy bármely agent ugyanazt a kontextust kapja.

| Skill | Forrás | Indoklás |
| --- | --- | --- |
| **nx-monorepo** | `giuseppe-trisciuoglio/developer-kit` | A Plantbase Nx + pnpm monorepo (`packages/core`, `packages/db`, `apps/cli`). Generátorok, `nx run-many`, affected parancsok — az agent ezeket követi a build során. |
| **vitest** | `antfu/skills` | Minden core modul Vitest-tel tesztelt (`runSql` SELECT guard, `askAgent` dispatch, `listCategories`). A skill a mocking, `vi.fn()`, és a `related` tesztfuttatás konvencióit adja. |
| **prisma-client-api** | `prisma/skills` | Typed Prisma query-k a seedhez és az app-réteghez; filter operátorok, `findMany`, raw query szabályok — a `products` séma CRUD és seed script írásához. |
| **prisma-postgres** | `prisma/skills` | Lokális Postgres docker-compose (OrbStack), `DATABASE_URL` / read-only role, migráció — a két DB-kapcsolat (`rw` vs `ro`) beállításához. |

---

## Miért pont ezek?

A Plantbase stack ([`stack.md`](./stack.md)):

- **Nx + pnpm** monorepo → `nx-monorepo` skill
- **Prisma + Postgres** → `prisma` plugin + `prisma-client-api` + `prisma-postgres` skill
- **Vitest** TDD → `vitest` skill + `superpowers` TDD workflow
- **Anthropic SDK** tool loop → `agent-sdk-dev` + `context7`
- **Agentic git workflow** → `commit-commands` + `github` MCP

A négy skill és a nyolc plugin lefedik a teljes fejlesztési láncot: monorepo scaffold → DB séma/seed → core agent toolok → CLI → tesztek → commit/PR.

---

## Telepítés / reprodukálás

**Pluginok** — Claude Code-ban:

```
/plugin install superpowers@claude-plugins-official
/plugin install commit-commands@claude-plugins-official
/plugin install skill-creator@claude-plugins-official
/plugin install github@claude-plugins-official
```

A teljes lista: [`.claude/settings.json`](../.claude/settings.json).

**Skillek** — a repó klónozásakor már benne vannak. Friss telepítéshez a `skills-lock.json` forrásait kell használni (pl. `npx skills add` vagy a kurzus marketplace parancsa).
