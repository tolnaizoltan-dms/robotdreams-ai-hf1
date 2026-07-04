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
    })
    .refine((q) => !/;.+\S/s.test(q), {
      message: 'Több utasítás nem engedélyezett.',
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
    required: ['query'] as string[],
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
