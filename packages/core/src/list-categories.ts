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
