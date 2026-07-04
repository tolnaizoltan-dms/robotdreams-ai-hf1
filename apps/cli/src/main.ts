import 'dotenv/config';
import { Command } from 'commander';
import { closePool } from '@plantbase/core';
import { askCommand } from './ask.js';

async function shutdown(): Promise<void> {
  await closePool();
}

process.on('SIGINT', () => {
  void shutdown().then(() => process.exit(0));
});
process.on('SIGTERM', () => {
  void shutdown().then(() => process.exit(0));
});

const program = new Command();

program
  .name('plantbase')
  .description('Növény-katalógus AI asszisztens')
  .version('0.1.0');

program.addCommand(askCommand);

program.parse();
