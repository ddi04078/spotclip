// Serves the existing Expo web export locally. No uploads, backend, API keys or npm install required.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root = fileURLToPath(new URL('../dist-web/', import.meta.url));
const port = Number(process.env.SPOTCLIP_PREVIEW_PORT || 8082);
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, `.${pathname}`);
    if (file !== path.resolve(root) && !file.startsWith(root)) { res.writeHead(403).end(); return; }
    try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); }
    catch { if (path.extname(pathname)) { res.writeHead(404).end(); return; } file = path.join(root, 'index.html'); }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  } catch { res.writeHead(500).end('Preview files missing. Run npm run build:web first.'); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Port is already in use. Close the previous SpotClip window or terminal first.' : error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}`;
  console.log(`SpotClip PC preview: ${url}\nKeep this terminal open. Press Ctrl+C to stop.`);
  if (process.env.SPOTCLIP_NO_BROWSER === '1') return;
  const [command, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(command, args, { stdio: 'ignore' }).on('error', () => console.log('Open the local address above in your browser.'));
});
