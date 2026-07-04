// apps/cli/src/ask.test.ts
import { vi, describe, it, expect, beforeEach } from 'vitest';
import readline from 'node:readline';

const { mockAskAgent, mockClosePool } = vi.hoisted(() => ({
  mockAskAgent: vi.fn(),
  mockClosePool: vi.fn(),
}));

vi.mock('@plantbase/core', () => ({
  askAgent: mockAskAgent,
  closePool: mockClosePool,
}));

vi.mock('node:readline', () => ({
  default: {
    createInterface: vi.fn(),
  },
}));

const { runAsk, runInteractive } = await import('./ask.js');

describe('runAsk', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls askAgent with the question and prints the answer', async () => {
    mockAskAgent.mockResolvedValueOnce({
      answer: 'Anyósnyelv a legjobb.',
      sqlQueries: ['SELECT name FROM products WHERE light = \'alacsony\' LIMIT 10'],
      inputTokens: 10,
      outputTokens: 5,
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runAsk('Mi a legjobb árnyéktűrő?', { showPrompt: false });

    expect(mockAskAgent).toHaveBeenCalledWith('Mi a legjobb árnyéktűrő?', {});
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Anyósnyelv'));
    consoleSpy.mockRestore();
  });

  it('passes onVerbose callback when showPrompt is true', async () => {
    mockAskAgent.mockResolvedValueOnce({
      answer: 'OK.',
      sqlQueries: [],
      inputTokens: 5,
      outputTokens: 2,
    });

    await runAsk('teszt', { showPrompt: true });

    const opts = mockAskAgent.mock.calls[0][1] as { onVerbose?: unknown };
    expect(opts.onVerbose).toBeTypeOf('function');
  });
});

describe('runInteractive', () => {
  beforeEach(() => vi.clearAllMocks());

  it('processes one question then exits on "exit"', async () => {
    mockAskAgent.mockResolvedValueOnce({
      answer: 'Echeveria.',
      sqlQueries: [],
      inputTokens: 5,
      outputTokens: 2,
    });

    const mockPrompt = vi.fn();
    const mockClose = vi.fn();
    const mockRl = {
      prompt: mockPrompt,
      close: mockClose,
      [Symbol.asyncIterator]: async function* () {
        yield 'Mutass pozsgásokat';
        yield 'exit';
      },
    };
    vi.mocked(readline.createInterface).mockReturnValueOnce(mockRl as unknown as readline.Interface);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runInteractive({ showPrompt: false });

    expect(mockAskAgent).toHaveBeenCalledTimes(1);
    expect(mockAskAgent).toHaveBeenCalledWith('Mutass pozsgásokat', {});
    expect(mockClose).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('skips blank lines without calling askAgent', async () => {
    const mockRl = {
      prompt: vi.fn(),
      close: vi.fn(),
      [Symbol.asyncIterator]: async function* () {
        yield '';
        yield '   ';
        yield 'quit';
      },
    };
    vi.mocked(readline.createInterface).mockReturnValueOnce(mockRl as unknown as readline.Interface);

    await runInteractive({ showPrompt: false });
    expect(mockAskAgent).not.toHaveBeenCalled();
  });

  it('prints error and continues when askAgent throws', async () => {
    mockAskAgent.mockRejectedValueOnce(new Error('API hiba'));
    mockAskAgent.mockResolvedValueOnce({
      answer: 'Rendben.',
      sqlQueries: [],
      inputTokens: 5,
      outputTokens: 2,
    });

    const mockRl = {
      prompt: vi.fn(),
      close: vi.fn(),
      [Symbol.asyncIterator]: async function* () {
        yield 'első kérdés';
        yield 'második kérdés';
        yield 'exit';
      },
    };
    vi.mocked(readline.createInterface).mockReturnValueOnce(mockRl as unknown as readline.Interface);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runInteractive({ showPrompt: false });

    expect(mockAskAgent).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('API hiba'));
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });
});
