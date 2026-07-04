// apps/cli/src/ask.ts
import { Command } from 'commander';
import readline from 'node:readline';
import { askAgent, closePool } from '@plantbase/core';
import type { AskAgentOpts } from '@plantbase/core';

export type RunAskOpts = {
  showPrompt: boolean;
};

export async function runAsk(question: string, opts: RunAskOpts): Promise<void> {
  const agentOpts: AskAgentOpts = {};
  if (opts.showPrompt) {
    agentOpts.onVerbose = (data) => {
      console.log('\n--- PROMPT DEBUG ---');
      console.log(JSON.stringify(data, null, 2));
      console.log('---\n');
    };
  }

  const result = await askAgent(question, agentOpts);
  console.log('\n' + result.answer + '\n');
}

export async function runInteractive(opts: RunAskOpts): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'plantbase> ',
  });

  console.log('Plantbase interaktív mód. Írj "exit" a kilépéshez.\n');
  rl.prompt();

  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed === 'exit' || trimmed === 'quit') break;
    if (!trimmed) {
      rl.prompt();
      continue;
    }
    try {
      await runAsk(trimmed, opts);
    } catch (err) {
      console.error(`Hiba: ${err instanceof Error ? err.message : String(err)}`);
    }
    rl.prompt();
  }

  rl.close();
}

export const askCommand = new Command('ask')
  .description('Kérdezz a növény-katalógusról (interaktív mód, ha nincs argument)')
  .argument('[question]', 'Kérdés magyarul')
  .option('--show-prompt', 'Mutassa a teljes LLM prompt-ot')
  .action(async (question: string | undefined, opts: { showPrompt?: boolean }) => {
    const runOpts: RunAskOpts = { showPrompt: opts.showPrompt ?? false };
    if (question) {
      await runAsk(question, runOpts);
      await closePool();
    } else {
      await runInteractive(runOpts);
      await closePool();
    }
  });
