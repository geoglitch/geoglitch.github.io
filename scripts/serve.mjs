import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const port = Number(option('--port', process.env.PORT || 5173));
const host = option('--host', '127.0.0.1');
const base = `/${option('--base', '/').split('/').filter(Boolean).join('/')}/`.replace('//', '/');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const url = new URL(request.url, `http://${host}:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    if (base !== '/' && pathname === base.slice(0, -1)) { response.writeHead(302, { Location: base }); response.end(); return; }
    if (!pathname.startsWith(base)) { response.writeHead(404); response.end('Not found'); return; }
    const relative = pathname.slice(base.length);
    if (relative.split('/').some(part => part.startsWith('.') && part !== '.nojekyll')) { response.writeHead(404); response.end('Not found'); return; }
    let path = resolve(root, relative || 'index.html');
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { response.writeHead(404); response.end('Not found'); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const data = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' || error.code === 'ENOTDIR' ? 404 : 500);
    response.end('File not found');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, host, () => console.log(`Geometry Glitch — no build: http://${host}:${port}${base}`));
