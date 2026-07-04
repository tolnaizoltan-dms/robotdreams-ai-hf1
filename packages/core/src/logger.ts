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
