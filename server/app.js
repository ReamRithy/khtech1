import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { ApiError } from './database.js';

export function createApp(store, { staticDirectory = null } = {}) {
  const sessions = new Map();
  const attempts = new Map();
  const maxAge = 60 * 60 * 12;
  const json = (res, status, value, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
    res.end(JSON.stringify(value));
  };
  function newSession(res, customer, oldToken) {
    if (oldToken) sessions.delete(oldToken);
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { customerId: customer.customer_id, expires: Date.now() + maxAge * 1000 });
    res.setHeader('Set-Cookie', `kh_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${process.env.COOKIE_SECURE === '1' ? '; Secure' : ''}`);
  }
  async function body(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw new ApiError(415, 'Send JSON data.');
    let data = ''; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > 32768) throw new ApiError(413, 'Request is too large.'); data += chunk; }
    try { const parsed = JSON.parse(data); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error(); return parsed; }
    catch { throw new ApiError(400, 'Invalid JSON request.'); }
  }
  const cleanup = setInterval(() => {
    for (const [token, session] of sessions) if (session.expires < Date.now()) sessions.delete(token);
    for (const [key, value] of attempts) if (value.expires < Date.now()) attempts.delete(key);
  }, 60000).unref();
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith('/api/')) {
        if (!staticDirectory || req.method !== 'GET') return json(res, 404, { error: 'Not found.' });
        const root = resolve(staticDirectory);
        const file = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
        if (!file.startsWith(root + sep)) return json(res, 404, { error: 'Not found.' });
        const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
        let bytes;
        try { bytes = await readFile(file); } catch { return json(res, 404, { error: 'Not found.' }); }
        res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
        return res.end(bytes);
      }
      if (req.method === 'POST' && req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) throw new ApiError(403, 'Request origin is not allowed.');
      const token = /(?:^|;\s*)kh_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
      const session = sessions.get(token);
      const customerId = session?.expires > Date.now() ? session.customerId : null;
      const requireCustomer = () => { if (!customerId) throw new ApiError(401, 'Your order session has expired. Place a new order to start a new session.'); return customerId; };
      if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { status: 'ok', app: 'kh-tech' });
      if (req.method === 'GET' && url.pathname === '/api/categories') return json(res, 200, store.categories());
      if (req.method === 'GET' && url.pathname === '/api/products') return json(res, 200, store.products());
      if (req.method === 'GET' && url.pathname === '/api/me') return json(res, 200, { customer: customerId ? store.customer(customerId) : null });
      if (req.method === 'POST' && ['/api/register', '/api/login'].includes(url.pathname)) {
        const key = req.socket.remoteAddress;
        const limit = attempts.get(key);
        const count = limit?.expires > Date.now() ? limit.count + 1 : 1;
        attempts.set(key, { count, expires: limit?.expires > Date.now() ? limit.expires : Date.now() + 15 * 60000 });
        if (count > 30) throw new ApiError(429, 'Too many sign-in attempts. Please try again in 15 minutes.');
        const input = await body(req);
        const customer = url.pathname === '/api/register' ? store.register(input) : store.login(input);
        newSession(res, customer, token);
        return json(res, url.pathname === '/api/register' ? 201 : 200, { customer });
      }
      if (req.method === 'POST' && url.pathname === '/api/logout') {
        sessions.delete(token);
        return json(res, 200, { success: true }, { 'Set-Cookie': 'kh_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
      }
      if (req.method === 'GET' && url.pathname === '/api/orders') return json(res, 200, store.orders(requireCustomer()));
      if (req.method === 'GET' && /^\/api\/orders\/\d+$/.test(url.pathname)) return json(res, 200, store.order(Number(url.pathname.split('/').at(-1)), requireCustomer()));
      if (req.method === 'POST' && url.pathname === '/api/checkout') {
        const saved = store.placeOrder(customerId, await body(req), { guest: true });
        newSession(res, saved.customer, token);
        return json(res, 201, saved);
      }
      if (req.method === 'POST' && url.pathname === '/api/orders') {
        const id = requireCustomer();
        return json(res, 201, store.placeOrder(id, await body(req)));
      }
      json(res, 404, { error: 'Not found.' });
    } catch (error) {
      if (!error.status) console.error(error);
      json(res, error.status || 500, { error: error.status ? error.message : 'Something went wrong. Please try again.' });
    }
  });
  server.on('close', () => clearInterval(cleanup));
  return server;
}
