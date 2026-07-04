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
