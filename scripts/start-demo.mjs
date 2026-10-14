#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
const database = path.resolve('data/demo.sqlite');
if (!existsSync(database)) throw new Error('Run node scripts/setup-demo.mjs first.');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '3010', '--hostname', '127.0.0.1'], {
  stdio: 'inherit',
  env: { ...process.env, LTB_DATABASE_PATH: database, LTB_APP_URL:'http://localhost:3010', APP_BASE_URL:'http://localhost:3010', ANTHROPIC_API_KEY:'', N8N_WEBHOOK_SAZETAK:'', N8N_WEBHOOK_DETALJNA:'', N8N_DOC_WEBHOOK_URL:'', N8N_SHARED_SECRET:'' },
});
child.on('exit', code => { process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
