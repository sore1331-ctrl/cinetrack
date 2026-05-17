const http = require('http');
const path = require('path');
const fs = require('fs/promises');
const { existsSync } = require('fs');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const port = Number(process.argv[2] || process.env.PORT || 4173);
const apiCache = new Map();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function createApiResponse(res) {
  return {
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(body) {
      if (!res.hasHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(body));
    },
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return undefined;
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return undefined;
  const type = req.headers['content-type'] || '';
  if (type.includes('application/json')) {
    try { return JSON.parse(text); } catch { return undefined; }
  }
  return text;
}

async function loadApiHandler(filePath) {
  const stat = await fs.stat(filePath);
  const cached = apiCache.get(filePath);
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.handler;

  const source = await fs.readFile(filePath, 'utf8');
  const transformed = source
    .replace(/export\s+default\s+async\s+function\s+handler/, 'async function handler')
    .replace(/export\s+default\s+function\s+handler/, 'function handler');
  const script = new vm.Script(`${transformed}\nhandler;`, { filename: filePath });
  const context = vm.createContext({
    console,
    process,
    fetch,
    URL,
    URLSearchParams,
    AbortController,
    setTimeout,
    clearTimeout,
    Buffer,
  });
  const handler = script.runInContext(context);
  apiCache.set(filePath, { mtimeMs: stat.mtimeMs, handler });
  return handler;
}

async function handleApi(req, res, url) {
  const name = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
  if (!/^[a-z0-9-]+$/i.test(name)) {
    return send(res, 404, JSON.stringify({ error: 'Not found' }), { 'Content-Type': mime['.json'] });
  }

  const filePath = path.join(root, 'api', `${name}.js`);
  if (!existsSync(filePath)) {
    return send(res, 404, JSON.stringify({ error: 'Not found' }), { 'Content-Type': mime['.json'] });
  }

  req.query = Object.fromEntries(url.searchParams.entries());
  req.body = await readBody(req);

  try {
    const handler = await loadApiHandler(filePath);
    await handler(req, createApiResponse(res));
    if (!res.writableEnded) res.end();
  } catch (error) {
    if (!res.headersSent) res.setHeader('Content-Type', mime['.json']);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error?.message || String(error) }));
  }
}

async function handleStatic(req, res, url) {
  const decoded = decodeURIComponent(url.pathname);
  const relativePath = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root) || filePath.includes(`${path.sep}.git${path.sep}`)) {
    return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
  } catch {
    send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  if (url.pathname.startsWith('/api/')) return handleApi(req, res, url);
  return handleStatic(req, res, url);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`CineTrack dev server listening on http://127.0.0.1:${port}`);
});
