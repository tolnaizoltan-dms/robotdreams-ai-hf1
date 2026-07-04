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
