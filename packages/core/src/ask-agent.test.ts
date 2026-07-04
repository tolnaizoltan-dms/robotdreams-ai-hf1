import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mocks (hoisted so they run before imports) ---
const mockCreate = vi.fn();
const mockListCategories = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function () {
    return { messages: { create: mockCreate } };
  }),
}));

vi.mock('./run-sql.js', () => ({
  runSql: vi.fn(),
  runSqlToolDef: {
    name: 'runSql',
    description: 'mock',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
}));

vi.mock('./list-categories.js', () => ({
  listCategoriesToolDef: {
    name: 'listCategories',
    description: 'mock',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  listCategories: mockListCategories,
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
