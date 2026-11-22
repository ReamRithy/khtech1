import { resolve } from 'node:path';
import { openStore } from './database.js';
import { createApp } from './app.js';

const store = openStore(process.env.DB_PATH || resolve('data/store.sqlite'));
const server = createApp(store, { staticDirectory: resolve('dist') });
const port = Number(process.env.PORT || 3001);
server.listen(port, '127.0.0.1', () => console.log(`KH Tech API and production site: http://127.0.0.1:${port}`));
function shutdown() { server.close(() => { store.close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
