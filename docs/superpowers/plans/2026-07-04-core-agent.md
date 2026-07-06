# packages/core Agent Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `packages/core` package: types, structured JSONL logger, system prompt context, read-only `runSql` tool, and the `askAgent` tool-use loop using the Anthropic SDK.

**Architecture:** Framework-agnostic core with no CLI or API knowledge. `askAgent` drives a manual tool-use loop (Anthropic SDK `messages.create` in a `for` loop, max 10 turns). Read-only SQL runs through a `pg` pool connected to `DATABASE_URL_READONLY`. Every interaction is appended to a `logs/<timestamp>.jsonl` file.

**Tech Stack:** `@anthropic-ai/sdk@^0.110.0`, `pg@^8.22.0`, `zod@^4.4.3`, `vitest`, TypeScript strict + NodeNext ESM.

## Global Constraints

- TypeScript `strict` mode; NodeNext ESM — relative imports use `.js` extension
- No `console.log` except the intentional `--show-prompt` verbose path (passed via callback)
- `unknown` for external/LLM input; Zod validates at boundaries
- `DATABASE_URL_READONLY` env var for the agent's SQL connection (read-only role)
- Only SELECT queries permitted — validated by Zod refine before execution
- Prompt caching: system prompt uses `cache_control: { type: 'ephemeral' }`
- Conventional commits: `feat:`, `test:`, etc.
- All paths relative to repo root `/Users/tolnaiz/Documents/GitHub/robotdreams-ai-hf1`

---

## File Map

| File | Responsibility |
|------|---------------|
| `packages/core/package.json` | Add `@anthropic-ai/sdk`, `pg`, `zod` deps |
| `packages/core/src/types.ts` | Shared types: `SqlResult`, `AgentResponse`, `LogEntry` |
| `packages/core/src/logger.ts` | `writeLog(entry)` → `logs/<timestamp>.jsonl` |
| `packages/core/src/schema-context.ts` | `SYSTEM_PROMPT` string (XML-tagged, from docs/system-prompt.md) |
| `packages/core/src/run-sql.ts` | `runSqlToolDef`, `runSql(input)`, `closePool()` |
| `packages/core/src/ask-agent.ts` | `askAgent(question, opts)` → `AgentResponse` |
| `packages/core/src/index.ts` | Barrel: re-exports public API |
| `packages/core/src/types.test.ts` | (covered inline in task tests) |
| `packages/core/src/logger.test.ts` | Vitest unit tests for logger |
| `packages/core/src/run-sql.test.ts` | Vitest unit tests for runSql SELECT guard |
| `packages/core/src/ask-agent.test.ts` | Vitest unit tests with mocked SDK |

---

## Task 1: Dependencies + types.ts

**Files:**
- Modify: `packages/core/package.json`
- Create: `packages/core/src/types.ts`

**Interfaces:**
- Produces: `SqlResult`, `AgentResponse`, `LogEntry` — imported by all other tasks

- [ ] **Step 1: Add dependencies to packages/core/package.json**

Replace the current `package.json` with:

```json
{
  "name": "@plantbase/core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "typecheck": "tsc --project tsconfig.json --noEmit",
    "test": "vitest run",
    "lint": "eslint src"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.110.0",
    "pg": "^8.22.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/pg": "^8.11.14"
  }
}
```

- [ ] **Step 2: Install**

```bash
pnpm install
```

Expected: no errors, `@anthropic-ai/sdk`, `pg`, `zod` appear in node_modules.

- [ ] **Step 3: Create types.ts**

```typescript
// packages/core/src/types.ts
export type SqlResult = {
  rows: Record<string, unknown>[];
  rowCount: number;
};

export type AgentResponse = {
  answer: string;
  sqlQueries: string[];
  inputTokens: number;
  outputTokens: number;
};

export type LogEntry = {
  timestamp: string;
  question: string;
  sqlQueries: string[];
  sqlResults: SqlResult[];
  answer: string;
  inputTokens: number;
  outputTokens: number;
};
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @plantbase/core typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/core/package.json packages/core/src/types.ts pnpm-lock.yaml
git commit -m "feat(core): add types and runtime dependencies"
```

---

## Task 2: logger.ts

**Files:**
- Create: `packages/core/src/logger.ts`
- Create: `packages/core/src/logger.test.ts`

**Interfaces:**
- Consumes: `LogEntry` from `./types.js`
- Produces: `writeLog(entry: LogEntry): Promise<void>`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/core/src/logger.test.ts
import { afterEach, describe, expect, it } from 'vitest';
import { rm, readFile } from 'node:fs/promises';
import { writeLog } from './logger.js';
import type { LogEntry } from './types.js';

const TEST_LOGS_DIR = 'logs-test';

const makeEntry = (timestamp: string): LogEntry => ({
  timestamp,
  question: 'Milyen növény kell árnyékba?',
  sqlQueries: ['SELECT name FROM products WHERE light = \'alacsony\''],
  sqlResults: [{ rows: [{ name: 'Anyósnyelv' }], rowCount: 1 }],
  answer: 'Anyósnyelv.',
  inputTokens: 100,
  outputTokens: 20,
});

describe('writeLog', () => {
  afterEach(async () => {
    await rm(TEST_LOGS_DIR, { recursive: true, force: true });
  });

  it('should create the log file and write valid JSONL', async () => {
    const ts = '2026-07-04T10-00-00-000Z';
    await writeLog(makeEntry(ts), TEST_LOGS_DIR);

    const content = await readFile(`${TEST_LOGS_DIR}/${ts}.jsonl`, 'utf-8');
    const parsed = JSON.parse(content.trim());
    expect(parsed.question).toBe('Milyen növény kell árnyékba?');
    expect(parsed.answer).toBe('Anyósnyelv.');
    expect(parsed.inputTokens).toBe(100);
  });

  it('should append multiple entries to the same file', async () => {
    const ts = '2026-07-04T10-00-01-000Z';
    await writeLog(makeEntry(ts), TEST_LOGS_DIR);
    await writeLog({ ...makeEntry(ts), answer: 'Második.' }, TEST_LOGS_DIR);

    const content = await readFile(`${TEST_LOGS_DIR}/${ts}.jsonl`, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[1]).answer).toBe('Második.');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
pnpm --filter @plantbase/core test
```

Expected: FAIL — `Cannot find module './logger.js'`

- [ ] **Step 3: Implement logger.ts**

```typescript
// packages/core/src/logger.ts
import { mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { LogEntry } from './types.js';

const DEFAULT_LOGS_DIR = 'logs';

export async function writeLog(
  entry: LogEntry,
  logsDir: string = DEFAULT_LOGS_DIR,
): Promise<void> {
  await mkdir(logsDir, { recursive: true });
  const filepath = join(logsDir, `${entry.timestamp}.jsonl`);
  await appendFile(filepath, JSON.stringify(entry) + '\n', 'utf-8');
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
pnpm --filter @plantbase/core test
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/logger.ts packages/core/src/logger.test.ts
git commit -m "feat(core): add writeLog — structured JSONL logger"
```

---

## Task 3: schema-context.ts

**Files:**
- Create: `packages/core/src/schema-context.ts`

**Interfaces:**
- Produces: `SYSTEM_PROMPT: string` — consumed by `ask-agent.ts`

- [ ] **Step 1: Create schema-context.ts**

Copy the XML-tagged system prompt from `docs/system-prompt.md` verbatim:

```typescript
// packages/core/src/schema-context.ts
export const SYSTEM_PROMPT = `<role>
Te a Plantbase asszisztens vagy: egy lakberendezőnek (és otthoni felhasználóknak) segítesz növényt választani és növénycsomagot összeállítani egy webshop katalógusa alapján.
</role>

<task>
A felhasználó természetes nyelvű kérdését fordítsd SQL-re a products tábla felett, futtasd le a runSql toollal, majd a kapott sorokból adj rövid, érthető, magyar nyelvű választ.
</task>

<schema>
products (
  id, name, latin_name,
  category,                              -- szobanövény / kerti / pozsgás / kaktusz / fűszer / fa-cserje / lógó / virágzó
  location,                              -- beltéri / kültéri / mindkettő
  price, sale_price, stock,              -- ár, akciós ár (null ha nincs), raktárkészlet
  light,                                 -- árnyék / alacsony / közepes / erős / direkt nap
  watering,                              -- ritka / közepes / gyakori / állandóan nedves
  difficulty,                            -- kezdő / haladó / profi
  current_height_cm, max_height_cm,      -- aktuális és kifejlett magasság
  current_pot_cm,                        -- aktuális cserépméret
  pet_safe, kid_safe, air_purifying,     -- háziállat-barát, gyerekbiztos, légtisztító
  rating, reviews_count, description
)
</schema>

<rules>
- CSAK SELECT. Soha ne módosíts adatot (INSERT/UPDATE/DELETE/DDL tilos).
- Mindig tegyél LIMIT-et (alapból 20-50).
- Szöveges keresés: ILIKE (kis/nagybetű-független), pl. name ILIKE '%pothos%'.
- Ár: a tényleges ár COALESCE(sale_price, price) (ha van akció, az számít). Büdzsénél ezzel számolj.
- Raktár: ha "raktáron" a kérés, szűrj stock > 0-ra.
- Méret: current_height_cm az aktuális, max_height_cm a kifejlett magasság, current_pot_cm a cserépméret.
- Gondozás: light (fény), watering (öntözés), difficulty (nehézség), pet_safe (háziállat-barát).
</rules>

<behavior>
- Ha a kérdés kétértelmű (hiányzik a büdzsé, a szoba adottsága vagy a darabszám), KÉRDEZZ vissza, mielőtt találgatnál.
- Csomag-összeállításnál vedd figyelembe a büdzsét (összár) és a szoba adottságait (fény, méret).
- A válaszban emeld ki a döntéshez fontos attribútumokat: ár (és akció), raktárkészlet, méret-illeszkedés, fény/öntözés/gondozás.
- Légy tömör: a végén természetes nyelvű összegzés, ne nyers tábla-dump.
- Ne találj ki nem létező oszlopot vagy táblát.
</behavior>

<tools>
- runSql(query): read-only SQL futtatás a katalóguson. A generált SQL-t mindig ezzel futtasd, ne csak kiírd.
</tools>`;
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @plantbase/core typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/schema-context.ts
git commit -m "feat(core): add SYSTEM_PROMPT schema context"
```

---

## Task 4: run-sql.ts

**Files:**
- Create: `packages/core/src/run-sql.ts`
- Create: `packages/core/src/run-sql.test.ts`

**Interfaces:**
- Consumes: `SqlResult` from `./types.js`
- Produces:
  - `runSqlToolDef` — Anthropic tool definition object, consumed by `ask-agent.ts`
  - `runSql(input: unknown): Promise<SqlResult>` — consumed by `ask-agent.ts`
  - `closePool(): Promise<void>` — consumed by CLI teardown

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/core/src/run-sql.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockEnd = vi.fn();

vi.mock('pg', () => ({
  default: {
    Pool: vi.fn(() => ({ query: mockQuery, end: mockEnd })),
  },
}));

// import AFTER mock
const { runSql, closePool } = await import('./run-sql.js');

describe('runSql — SELECT guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects DELETE queries', async () => {
    await expect(runSql({ query: 'DELETE FROM products' })).rejects.toThrow(
      'Csak SELECT',
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects INSERT queries', async () => {
    await expect(
      runSql({ query: 'INSERT INTO products (name) VALUES (\'x\')' }),
    ).rejects.toThrow('Csak SELECT');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects UPDATE queries', async () => {
    await expect(
      runSql({ query: 'UPDATE products SET price = 0' }),
    ).rejects.toThrow('Csak SELECT');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects empty input', async () => {
    await expect(runSql({ query: '' })).rejects.toThrow();
  });

  it('rejects missing query field', async () => {
    await expect(runSql({})).rejects.toThrow();
  });

  it('executes a valid SELECT and returns rows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ name: 'Anyósnyelv' }],
      rowCount: 1,
    });

    const result = await runSql({ query: 'SELECT name FROM products LIMIT 1' });

    expect(mockQuery).toHaveBeenCalledWith('SELECT name FROM products LIMIT 1');
    expect(result.rows).toEqual([{ name: 'Anyósnyelv' }]);
    expect(result.rowCount).toBe(1);
  });

  it('closes the pool via closePool()', async () => {
    await closePool();
    expect(mockEnd).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
pnpm --filter @plantbase/core test
```

Expected: FAIL — `Cannot find module './run-sql.js'`

- [ ] **Step 3: Implement run-sql.ts**

```typescript
// packages/core/src/run-sql.ts
import pg from 'pg';
import { z } from 'zod';
import type { SqlResult } from './types.js';

const { Pool } = pg;

const RunSqlInputSchema = z.object({
  query: z
    .string()
    .min(1)
    .refine((q) => /^\s*SELECT\s/i.test(q), {
      message: 'Csak SELECT lekérdezés engedélyezett (NFR1).',
    }),
});

export const runSqlToolDef = {
  name: 'runSql',
  description:
    'Read-only SQL SELECT lekérdezés futtatása a products növény-katalóguson.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'SQL SELECT lekérdezés a products táblán. Mindig LIMIT-tel.',
      },
    },
    required: ['query'],
  },
} as const;

let pool: InstanceType<typeof Pool> | null = null;

function getPool(): InstanceType<typeof Pool> {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL_READONLY });
  }
  return pool;
}

export async function runSql(input: unknown): Promise<SqlResult> {
  const { query } = RunSqlInputSchema.parse(input);
  const result = await getPool().query(query);
  return {
    rows: result.rows as Record<string, unknown>[],
    rowCount: result.rowCount ?? 0,
  };
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = null;
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
pnpm --filter @plantbase/core test
```

Expected: 8 passed (2 from logger + 6 from run-sql).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/run-sql.ts packages/core/src/run-sql.test.ts
git commit -m "feat(core): add runSql tool with SELECT-only guard (NFR1)"
```

---

## Task 5: ask-agent.ts

**Files:**
- Create: `packages/core/src/ask-agent.ts`
- Create: `packages/core/src/ask-agent.test.ts`

**Interfaces:**
- Consumes:
  - `SYSTEM_PROMPT` from `./schema-context.js`
  - `runSql(input): Promise<SqlResult>`, `runSqlToolDef` from `./run-sql.js`
  - `writeLog(entry, dir?): Promise<void>` from `./logger.js`
  - `AgentResponse`, `LogEntry`, `SqlResult` from `./types.js`
- Produces:
  - `askAgent(question: string, opts?: AskAgentOpts): Promise<AgentResponse>`
  - `AskAgentOpts = { onVerbose?: (data: unknown) => void }`

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/core/src/ask-agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mocks (hoisted so they run before imports) ---
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({ messages: { create: mockCreate } })),
}));

vi.mock('./run-sql.js', () => ({
  runSql: vi.fn(),
  runSqlToolDef: {
    name: 'runSql',
    description: 'mock',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
}));

vi.mock('./logger.js', () => ({
  writeLog: vi.fn().mockResolvedValue(undefined),
}));

const { askAgent } = await import('./ask-agent.js');
const { runSql } = await import('./run-sql.js');
const { writeLog } = await import('./logger.js');

const mockRunSql = vi.mocked(runSql);
const mockWriteLog = vi.mocked(writeLog);

describe('askAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the final text answer when model ends without tool use', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Nincsenek megfelelő növények.' }],
      usage: { input_tokens: 50, output_tokens: 10 },
    });

    const result = await askAgent('Van-e kaktusz?');

    expect(result.answer).toBe('Nincsenek megfelelő növények.');
    expect(result.sqlQueries).toHaveLength(0);
    expect(result.inputTokens).toBe(50);
    expect(result.outputTokens).toBe(10);
    expect(mockWriteLog).toHaveBeenCalledOnce();
  });

  it('executes runSql on tool_use and continues the loop', async () => {
    mockRunSql.mockResolvedValueOnce({
      rows: [{ name: 'Echeveria', price: 1500 }],
      rowCount: 1,
    });

    mockCreate
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          { type: 'text', text: 'Megnézem a kaktuszokat.' },
          {
            type: 'tool_use',
            id: 'tu_1',
            name: 'runSql',
            input: { query: "SELECT name, price FROM products WHERE category = 'kaktusz' LIMIT 10" },
          },
        ],
        usage: { input_tokens: 80, output_tokens: 30 },
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Találtam 1 kaktuszt: Echeveria 1500 Ft.' }],
        usage: { input_tokens: 120, output_tokens: 25 },
      });

    const result = await askAgent('Mutass kaktuszokat!');

    expect(mockRunSql).toHaveBeenCalledWith({
      query: "SELECT name, price FROM products WHERE category = 'kaktusz' LIMIT 10",
    });
    expect(result.sqlQueries).toHaveLength(1);
    expect(result.answer).toBe('Találtam 1 kaktuszt: Echeveria 1500 Ft.');
    expect(result.inputTokens).toBe(200);
    expect(result.outputTokens).toBe(55);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it('calls onVerbose with system prompt when provided', async () => {
    mockCreate.mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'OK.' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    });

    const onVerbose = vi.fn();
    await askAgent('teszt', { onVerbose });

    expect(onVerbose).toHaveBeenCalled();
  });

  it('includes runSql error in tool result and continues', async () => {
    mockRunSql.mockRejectedValueOnce(new Error('Csak SELECT lekérdezés engedélyezett.'));

    mockCreate
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [
          {
            type: 'tool_use',
            id: 'tu_err',
            name: 'runSql',
            input: { query: 'DELETE FROM products' },
          },
        ],
        usage: { input_tokens: 50, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hiba történt.' }],
        usage: { input_tokens: 80, output_tokens: 10 },
      });

    const result = await askAgent('töröld a növényeket');

    expect(result.answer).toBe('Hiba történt.');
    // The error was passed back to the model, not thrown
    const secondCall = mockCreate.mock.calls[1][0];
    const lastUserMsg = secondCall.messages.at(-1);
    expect(lastUserMsg.content[0].content).toContain('Csak SELECT');
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
pnpm --filter @plantbase/core test
```

Expected: FAIL — `Cannot find module './ask-agent.js'`

- [ ] **Step 3: Implement ask-agent.ts**

```typescript
// packages/core/src/ask-agent.ts
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import { SYSTEM_PROMPT } from './schema-context.js';
import { runSql, runSqlToolDef } from './run-sql.js';
import { writeLog } from './logger.js';
import type { AgentResponse, LogEntry, SqlResult } from './types.js';

const MAX_TURNS = 10;

export type AskAgentOpts = {
  onVerbose?: (data: unknown) => void;
};

export async function askAgent(
  question: string,
  opts: AskAgentOpts = {},
): Promise<AgentResponse> {
  const anthropic = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const messages: MessageParam[] = [{ role: 'user', content: question }];
  const sqlQueries: string[] = [];
  const sqlResults: SqlResult[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  if (opts.onVerbose) {
    opts.onVerbose({ systemPrompt: SYSTEM_PROMPT, messages });
  }

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: [runSqlToolDef],
      messages,
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b) => b.type === 'text');
      const answer = textBlock?.type === 'text' ? textBlock.text : '';

      const logEntry: LogEntry = {
        timestamp,
        question,
        sqlQueries,
        sqlResults,
        answer,
        inputTokens,
        outputTokens,
      };
      await writeLog(logEntry);

      return { answer, sqlQueries, inputTokens, outputTokens };
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Array<{
        type: 'tool_result';
        tool_use_id: string;
        content: string;
      }> = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        let content: string;
        try {
          const result = await runSql(block.input);
          sqlQueries.push((block.input as { query: string }).query);
          sqlResults.push(result);
          content = JSON.stringify(result.rows);
        } catch (err) {
          content = `Hiba: ${err instanceof Error ? err.message : String(err)}`;
        }

        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content });
      }

      messages.push({ role: 'user', content: toolResults });
    }
  }

  throw new Error(`Az agent elérte a maximális fordulatszámot (${MAX_TURNS}).`);
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
pnpm --filter @plantbase/core test
```

Expected: 12 passed (2 logger + 6 run-sql + 4 ask-agent).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/ask-agent.ts packages/core/src/ask-agent.test.ts
git commit -m "feat(core): add askAgent tool-use loop with prompt caching"
```

---

## Task 6: index.ts barrel + typecheck

**Files:**
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Produces: public API of `@plantbase/core`

- [ ] **Step 1: Update index.ts**

```typescript
// packages/core/src/index.ts
export { askAgent } from './ask-agent.js';
export { runSql, runSqlToolDef, closePool } from './run-sql.js';
export { writeLog } from './logger.js';
export { SYSTEM_PROMPT } from './schema-context.js';
export type { AgentResponse, SqlResult, LogEntry, AskAgentOpts } from './types.js';
```

Wait — `AskAgentOpts` is defined in `ask-agent.ts`, not `types.ts`. Fix the re-export:

```typescript
// packages/core/src/index.ts
export { askAgent } from './ask-agent.js';
export type { AskAgentOpts } from './ask-agent.js';
export { runSql, runSqlToolDef, closePool } from './run-sql.js';
export { writeLog } from './logger.js';
export { SYSTEM_PROMPT } from './schema-context.js';
export type { AgentResponse, SqlResult, LogEntry } from './types.js';
```

- [ ] **Step 2: Run full test suite + typecheck**

```bash
pnpm --filter @plantbase/core test
pnpm --filter @plantbase/core typecheck
```

Expected: 12 passed, no type errors.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): export public API from index"
```

---

## Self-Review

**Spec coverage:**
- FR2 (NL→SQL, runSql tool): ✓ Task 4 + Task 5
- FR4 (JSONL logging): ✓ Task 2
- FR5 (--show-prompt): ✓ Task 5 `onVerbose` callback
- NFR1 (read-only, SELECT guard): ✓ Task 4 Zod refine
- NFR2 (transparency, logging): ✓ Task 2 + FR5
- NFR3 (konvenciók): ✓ no console.log in core, Zod at boundaries, strict types
- Prompt caching: ✓ Task 5 `cache_control: { type: 'ephemeral' }`

**Gaps:**
- `askAgent` has no built-in test for the `MAX_TURNS` exceeded case — acceptable for now; it would require 10 mock responses
- The `pg` pool is a module-level singleton; tests reset it via `closePool()` — covered in Task 4 test

**Type consistency check:**
- `SqlResult` used in `run-sql.ts` ✓, `ask-agent.ts` ✓, `logger.ts` ✓, `types.ts` ✓
- `LogEntry` used in `logger.ts` ✓, `ask-agent.ts` ✓
- `AgentResponse` produced by `ask-agent.ts` ✓
- `AskAgentOpts` defined in `ask-agent.ts`, re-exported in `index.ts` ✓
- `runSqlToolDef` produced in `run-sql.ts`, consumed in `ask-agent.ts` ✓
- `closePool` produced in `run-sql.ts`, re-exported in `index.ts` ✓
