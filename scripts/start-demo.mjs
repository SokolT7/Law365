#!/usr/bin/env node
// Local demo: isolated demo database, one-click role sign-in, no external AI or n8n calls.
// Usage: npm run dev            (http://localhost:3000)
//        node scripts/start-demo.mjs --port 3010
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const arg = process.argv.find((a) => a.startsWith('--port'));
const port = Number(arg?.includes('=') ? arg.split('=')[1] : arg ? process.argv[process.argv.indexOf(arg) + 1] : process.env.PORT) || 3000;
const database = path.resolve('data/demo.sqlite');
if (!existsSync(database)) {
  console.log('Preparing the demo database (one time)…');
  const setup = spawnSync(process.execPath, ['scripts/setup-demo.mjs'], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (setup.status !== 0) throw new Error('Demo setup failed.');
}
if (!existsSync(path.resolve('data/legal.sqlite'))) {
  console.warn('\n  Legal sources are not built yet: research will only search firm documents.\n  Run "npm run ingest:legal" (about 4 minutes) to load statutes, EU law and case law.\n');
}
const url = `http://localhost:${port}`;
console.log(`\n  LTB Law demo → ${url}  (choose "Uđi kao ured" or "Uđi kao administrator")\n`);
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', String(port)], {
  stdio: 'inherit',
  env: { ...process.env, LTB_DEMO_MODE: '1', LTB_DATABASE_PATH: database, LTB_APP_URL: url, APP_BASE_URL: url, ANTHROPIC_API_KEY: process.env.LTB_DEMO_AI === '1' ? process.env.ANTHROPIC_API_KEY ?? '' : '', N8N_WEBHOOK_SAZETAK: '', N8N_WEBHOOK_DETALJNA: '', N8N_DOC_WEBHOOK_URL: '', N8N_SHARED_SECRET: '' },
});
child.on('exit', (code) => { process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
