import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { createServer } from 'node:http';

const port = Number(process.env.PORT || 9000);
const host = process.env.HOST || '0.0.0.0';
const root = resolve(process.env.BOBQUEST_WEB_DIST_DIR || 'apps/web/dist/spa');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function sendFile(res, filePath) {
  const ext = extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader('Content-Type', mimeTypes.get(ext) || 'application/octet-stream');
  if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-store');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  createReadStream(filePath).pipe(res);
}

function resolveAsset(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] || '/');
  const safePath = normalize(decoded).replace(/^([/\\])+/, '');
  const candidate = resolve(join(root, safePath));
  if (!candidate.startsWith(root)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return null;
}

if (!existsSync(join(root, 'index.html'))) {
  console.error(`BobQuest web dist not found at ${root}. Run the web build first.`);
  process.exit(1);
}

createServer((req, res) => {
  try {
    const filePath = resolveAsset(req.url || '/');
    if (filePath) {
      sendFile(res, filePath);
      return;
    }
    sendFile(res, join(root, 'index.html'));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('BobQuest web server error');
  }
}).listen(port, host, () => {
  console.log(`BobQuest web serving ${root} at http://${host}:${port}`);
});
