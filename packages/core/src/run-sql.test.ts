// packages/core/src/run-sql.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockEnd = vi.fn();

vi.mock('pg', () => ({
  default: {
    Pool: vi.fn(function () { return { query: mockQuery, end: mockEnd }; }),
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
