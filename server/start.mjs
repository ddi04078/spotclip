import { createServer } from 'node:http';
import { createHandler } from './handler.mjs';
const handler = createHandler();
createServer((req, res) => {
  if (req.url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"status":"ok"}'); }
  if (req.url !== '/api/analyze') { res.writeHead(404); return res.end(); }
  return handler(req, res);
}).listen(Number(process.env.PORT || 8787), '127.0.0.1', () => console.log('SpotClip analysis server ready (local development only).'));
