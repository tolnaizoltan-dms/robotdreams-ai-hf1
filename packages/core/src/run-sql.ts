// packages/core/src/run-sql.ts
import pg from 'pg';
import { z } from 'zod';
import type { SqlResult } from './types.js';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: InstanceType<typeof pg.Pool> | null = null;

function getPool(): InstanceType<typeof pg.Pool> {
  if (!pool) {
    const config = { connectionString: process.env.DATABASE_URL_READONLY };
    // Use Reflect.construct so both real pg.Pool (class) and vi.fn mocks work.
    // For vi.fn mocks with arrow function implementations, fall back to a direct call.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const PoolCtor = pg.Pool as any;
    try {
      pool = new PoolCtor(config);
    } catch (e) {
      if (e instanceof TypeError && String(e.message).includes('is not a constructor')) {
        pool = PoolCtor(config);
      } else {
        throw e;
      }
    }
  }
  return pool!;
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
