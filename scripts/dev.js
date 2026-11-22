import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

async function apiRunning() {
  try { const response = await fetch('http://127.0.0.1:3001/api/health'); return response.ok && (await response.json()).app === 'kh-tech'; }
  catch { return false; }
}
function portAvailable(port) {
  return new Promise(resolve => { const probe = createServer(); probe.once('error', () => resolve(false)); probe.listen(port, '127.0.0.1', () => probe.close(() => resolve(true))); });
}
const children = [];
if (!await apiRunning()) children.push(spawn(process.execPath, ['server/index.js'], { stdio: 'inherit' }));
// An existing Vite instance reloads the new proxy config automatically.
if (await portAvailable(5173)) children.push(spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { stdio: 'inherit' }));
else console.log('Port 5173 is already in use. Reusing the existing website; the API runs on port 3001.');
function shutdown() { for (const child of children) child.kill(); }
process.on('SIGINT', () => { shutdown(); process.exit(); });
process.on('SIGTERM', () => { shutdown(); process.exit(); });
for (const child of children) child.on('exit', code => { if (code) { shutdown(); process.exit(code); } });
