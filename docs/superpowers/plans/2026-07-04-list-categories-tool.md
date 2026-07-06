# listCategories Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `listCategories` tool that runs `SELECT DISTINCT category FROM products ORDER BY category` and register it in `askAgent` alongside `runSql`.

**Architecture:** New file `packages/core/src/list-categories.ts` owns the tool definition and function (calls `runSql` internally — no pool duplication). `ask-agent.ts` is updated to include the new tool in its tools array and dispatch it in the loop. `schema-context.ts` is updated so the LLM knows the tool exists.

**Tech Stack:** TypeScript strict + NodeNext ESM, `@anthropic-ai/sdk`, Vitest, existing `runSql` from `packages/core`.

## Global Constraints

- TypeScript strict, NodeNext ESM — relative imports use `.js` extension
- `listCategories` calls `runSql` internally — no new pg Pool, no duplication
- Tool name string is exactly `'listCategories'` (camelCase, matches the function name)
- SQL query is exactly `'SELECT DISTINCT category FROM products ORDER BY category'`
- `ask-agent.ts` dispatch refactored from `if (block.name !== 'runSql')` to `if/else if/else` chain
- `schema-context.ts` updated: `<tools>` block gains a `listCategories()` entry
- All tests in `packages/core` must still pass after each task

---

## File Map

| File | Change |
|------|--------|
| `packages/core/src/list-categories.ts` | **Create** — `listCategoriesToolDef`, `listCategories()` |
| `packages/core/src/list-categories.test.ts` | **Create** — 2 unit tests |
| `packages/core/src/ask-agent.ts` | **Modify** — add tool to array, refactor dispatch |
| `packages/core/src/ask-agent.test.ts` | **Modify** — add 1 test for listCategories dispatch |
| `packages/core/src/schema-context.ts` | **Modify** — add `listCategories()` to `<tools>` block |
| `packages/core/src/index.ts` | **Modify** — export `listCategoriesToolDef`, `listCategories` |

---

## Task 1: list-categories.ts + tests

**Files:**
- Create: `packages/core/src/list-categories.ts`
- Create: `packages/core/src/list-categories.test.ts`

**Interfaces:**
- Consumes: `runSql(input: unknown): Promise<SqlResult>` from `./run-sql.js`
- Produces:
  - `listCategoriesToolDef` — Anthropic tool definition object
  - `listCategories(): Promise<string[]>` — returns sorted category strings

- [ ] **Step 1: Write the failing tests**

```typescript
// packages/core/src/list-categories.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('./run-sql.js', () => ({
  runSql: vi.fn(),
}));

const { listCategories, listCategoriesToolDef } = await import('./list-categories.js');
import { runSql } from './run-sql.js';

describe('listCategoriesToolDef', () => {
  it('has correct name and schema', () => {
    expect(listCategoriesToolDef.name).toBe('listCategories');
    expect(listCategoriesToolDef.input_schema.type).toBe('object');
    expect(listCategoriesToolDef.input_schema.required).toEqual([]);
  });
});

describe('listCategories', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns sorted category strings from DB', async () => {
    vi.mocked(runSql).mockResolvedValueOnce({
      rows: [{ category: 'kaktusz' }, { category: 'szobanövény' }, { category: 'virágzó' }],
      rowCount: 3,
    });

    const result = await listCategories();

    expect(runSql).toHaveBeenCalledWith({
      query: 'SELECT DISTINCT category FROM products ORDER BY category',
    });
    expect(result).toEqual(['kaktusz', 'szobanövény', 'virágzó']);
  });

  it('returns empty array when no rows', async () => {
    vi.mocked(runSql).mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await listCategories();
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
pnpm --filter @plantbase/core test
```

Expected: FAIL — `Cannot find module './list-categories.js'`

- [ ] **Step 3: Implement list-categories.ts**

```typescript
// packages/core/src/list-categories.ts
import { runSql } from './run-sql.js';
import type { SqlResult } from './types.js';

export const listCategoriesToolDef = {
  name: 'listCategories',
  description:
    'Visszaadja a növény-katalógus összes elérhető kategóriáját. Használd, ha a felhasználó kategóriákra kérdez rá.',
  input_schema: {
    type: 'object' as const,
    properties: {},
    required: [] as string[],
  },
} as const;

export async function listCategories(): Promise<string[]> {
  const result: SqlResult = await runSql({
    query: 'SELECT DISTINCT category FROM products ORDER BY category',
  });
  return result.rows.map((r) => r['category'] as string);
}
```

- [ ] **Step 4: Run tests — all must pass**

```bash
pnpm --filter @plantbase/core test
```

Expected: all previously passing tests + 3 new = total increases by 3.

- [ ] **Step 5: Commit on feat/list-categories branch**

```bash
git checkout -b feat/list-categories
git add packages/core/src/list-categories.ts packages/core/src/list-categories.test.ts
git commit -m "feat(core): add listCategories tool (SELECT DISTINCT category)"
```

---

## Task 2: Wire into ask-agent + schema-context + index

**Files:**
- Modify: `packages/core/src/ask-agent.ts`
- Modify: `packages/core/src/ask-agent.test.ts`
- Modify: `packages/core/src/schema-context.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes:
  - `listCategoriesToolDef` from `./list-categories.js`
  - `listCategories(): Promise<string[]>` from `./list-categories.js`
- Produces: `askAgent` now handles `listCategories` tool calls

- [ ] **Step 1: Write the failing test**

Add one test to `packages/core/src/ask-agent.test.ts`.

First, add `mockListCategories` to the existing mock setup at the top of the file. Find the existing `vi.mock('./run-sql.js', ...)` block and add a new mock below it:

```typescript
// Add after the existing vi.mock('./run-sql.js', ...) block:
vi.mock('./list-categories.js', () => ({
  listCategoriesToolDef: {
    name: 'listCategories',
    description: 'mock',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  listCategories: mockListCategories,
}));
```

And add `mockListCategories` to the hoisted block at the top (alongside `mockCreate`). Find the existing hoisted mocks pattern and add `mockListCategories: vi.fn()`.

Then add this test inside `describe('askAgent', ...)`:

```typescript
it('dispatches listCategories tool and returns result', async () => {
  mockListCategories.mockResolvedValueOnce(['kaktusz', 'pozsgás', 'szobanövény']);

  mockCreate
    .mockResolvedValueOnce({
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tu_cat',
          name: 'listCategories',
          input: {},
        },
      ],
      usage: { input_tokens: 30, output_tokens: 10 },
    })
    .mockResolvedValueOnce({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'A kategóriák: kaktusz, pozsgás, szobanövény.' }],
      usage: { input_tokens: 60, output_tokens: 15 },
    });

  const result = await askAgent('Milyen kategóriák vannak?');

  expect(mockListCategories).toHaveBeenCalledOnce();
  expect(result.answer).toBe('A kategóriák: kaktusz, pozsgás, szobanövény.');
  expect(result.inputTokens).toBe(90);
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
pnpm --filter @plantbase/core test
```

Expected: FAIL — new test fails because `listCategories` is not in the tools array or dispatch.

- [ ] **Step 3: Update ask-agent.ts**

**3a — Add import** at the top (after the existing `run-sql.js` import):

```typescript
import { listCategories, listCategoriesToolDef } from './list-categories.js';
```

**3b — Add to tools array** (line ~40, inside `messages.create`):

```typescript
tools: [runSqlToolDef, listCategoriesToolDef],
```

**3c — Refactor the dispatch block** (replace the existing `for (const block of response.content)` loop body with):

```typescript
for (const block of response.content) {
  if (block.type !== 'tool_use') continue;

  let content: string;

  if (block.name === 'runSql') {
    try {
      const result = await runSql(block.input);
      const query = (block.input as { query: string }).query;
      sqlQueries.push(query);
      sqlResults.push(result);
      content = JSON.stringify(result.rows);
    } catch (err) {
      content = `Hiba: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else if (block.name === 'listCategories') {
    try {
      const categories = await listCategories();
      content = JSON.stringify(categories);
    } catch (err) {
      content = `Hiba: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else {
    content = `Ismeretlen eszköz: ${block.name}`;
  }

  toolResults.push({ type: 'tool_result', tool_use_id: block.id, content });
}
```

- [ ] **Step 4: Update schema-context.ts**

In `packages/core/src/schema-context.ts`, find the `<tools>` section (currently ends with `</tools>`). Replace the `<tools>` block with:

```typescript
// find:
`<tools>
- runSql(query): read-only SQL futtatás a katalóguson. A generált SQL-t mindig ezzel futtasd, ne csak kiírd.
</tools>`

// replace with:
`<tools>
- runSql(query): read-only SQL futtatás a katalóguson. A generált SQL-t mindig ezzel futtasd, ne csak kiírd.
- listCategories(): visszaadja az összes elérhető termékkategóriát. Használd, ha a felhasználó kategóriákra kérdez rá, mielőtt SQL-t generálnál.
</tools>`
```

- [ ] **Step 5: Update index.ts**

In `packages/core/src/index.ts`, add one export line after the `run-sql.js` exports:

```typescript
export { listCategories, listCategoriesToolDef } from './list-categories.js';
```

- [ ] **Step 6: Run all tests**

```bash
pnpm --filter @plantbase/core test
```

Expected: all tests pass (previous count + 4 new = 23 total or current+4).

- [ ] **Step 7: Typecheck**

```bash
pnpm --filter @plantbase/core typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/ask-agent.ts packages/core/src/ask-agent.test.ts packages/core/src/schema-context.ts packages/core/src/index.ts
git commit -m "feat(core): wire listCategories into askAgent + update schema context"
```

---

## Self-Review

**Spec coverage:**
- `listCategoriesToolDef` with correct name/schema: ✅ Task 1
- `listCategories()` runs `SELECT DISTINCT category FROM products ORDER BY category`: ✅ Task 1
- Calls `runSql` internally (no new pool): ✅ Task 1 implementation
- Registered in `askAgent` tools array: ✅ Task 2 step 3b
- Dispatched in `askAgent` tool loop: ✅ Task 2 step 3c
- LLM told about the tool in system prompt: ✅ Task 2 step 4
- Exported from `index.ts`: ✅ Task 2 step 5

**Placeholder scan:** None found.

**Type consistency:**
- `listCategories(): Promise<string[]>` defined in Task 1, called in Task 2 dispatch ✅
- `listCategoriesToolDef.name === 'listCategories'` matches `block.name === 'listCategories'` in dispatch ✅
- `runSql` signature `(input: unknown): Promise<SqlResult>` used correctly in Task 1 ✅
