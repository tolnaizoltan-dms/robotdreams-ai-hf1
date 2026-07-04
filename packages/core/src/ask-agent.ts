// packages/core/src/ask-agent.ts
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import { SYSTEM_PROMPT } from './schema-context.js';
import { runSql, runSqlToolDef } from './run-sql.js';
import { writeLog } from './logger.js';
import type { AgentResponse, LogEntry, SqlResult } from './types.js';

const MAX_TURNS = 10;

export type AskAgentOpts = {
  onVerbose?: (data: unknown) => void;
};

export async function askAgent(
  question: string,
  opts: AskAgentOpts = {},
): Promise<AgentResponse> {
  const anthropic = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const messages: MessageParam[] = [{ role: 'user', content: question }];
  const sqlQueries: string[] = [];
  const sqlResults: SqlResult[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  if (opts.onVerbose) {
    opts.onVerbose({ systemPrompt: SYSTEM_PROMPT, messages });
  }

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: [runSqlToolDef],
      messages,
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b) => b.type === 'text');
      const answer = textBlock?.type === 'text' ? textBlock.text : '';

      const logEntry: LogEntry = {
        timestamp,
        question,
        sqlQueries,
        sqlResults,
        answer,
        inputTokens,
        outputTokens,
      };
      await writeLog(logEntry);

      return { answer, sqlQueries, inputTokens, outputTokens };
    }

    // Push assistant message only when continuing the loop
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'tool_use') {
      const toolResults: Array<{
        type: 'tool_result';
        tool_use_id: string;
        content: string;
      }> = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        let content: string;
        try {
          const result = await runSql(block.input);
          sqlQueries.push((block.input as { query: string }).query);
          sqlResults.push(result);
          content = JSON.stringify(result.rows);
        } catch (err) {
          content = `Hiba: ${err instanceof Error ? err.message : String(err)}`;
        }

        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content });
      }

      messages.push({ role: 'user', content: toolResults });
    }
  }

  throw new Error(`Az agent elérte a maximális fordulatszámot (${MAX_TURNS}).`);
}
