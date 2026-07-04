import { describe, expect, it } from 'vitest';
import {
  askAgent,
  runSql,
  runSqlToolDef,
  closePool,
  writeLog,
  SYSTEM_PROMPT,
} from './index.js';
import type { AskAgentOpts, AgentResponse, SqlResult, LogEntry } from './index.js';

describe('core', () => {
  it('should export functions', () => {
    expect(typeof askAgent).toBe('function');
    expect(typeof runSql).toBe('function');
    expect(typeof closePool).toBe('function');
    expect(typeof writeLog).toBe('function');
  });

  it('should export runSqlToolDef', () => {
    expect(runSqlToolDef.name).toBe('runSql');
    expect(typeof runSqlToolDef.description).toBe('string');
    expect(runSqlToolDef.input_schema.type).toBe('object');
  });

  it('should export SYSTEM_PROMPT', () => {
    expect(typeof SYSTEM_PROMPT).toBe('string');
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('should have type exports', () => {
    // This is a compile-time check, but we verify the types exist at runtime
    const _opts: AskAgentOpts = {};
    const _response: AgentResponse = {
      answer: '',
      sqlQueries: [],
      inputTokens: 0,
      outputTokens: 0,
    };
    const _result: SqlResult = { rows: [], rowCount: 0 };
    const _entry: LogEntry = {
      timestamp: '',
      question: '',
      sqlQueries: [],
      sqlResults: [],
      answer: '',
      inputTokens: 0,
      outputTokens: 0,
    };
    expect(_opts).toBeDefined();
    expect(_response).toBeDefined();
    expect(_result).toBeDefined();
    expect(_entry).toBeDefined();
  });
});
