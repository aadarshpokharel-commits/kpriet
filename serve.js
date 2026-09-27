/**
 * Local Static Dev Server for KPR Institute of Engineering and Technology (KPRIET)
 * Serves RBAC Portal / Login Page and Smart Board locally.
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.ogg':  'video/ogg',
  '.mov':  'video/quicktime',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf'
};

const server = http.createServer((req, res) => {
  // Proxy /api requests to backend REST server (port 5000)
  if (req.url.startsWith('/api/')) {
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: '127.0.0.1:5000' }
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ success: false, error: 'Backend server starting or offline on port 5000: ' + err.message }));
    });
    req.pipe(proxyReq);
    return;
  }

  let reqPath = decodeURI(req.url.split('?')[0]);

  // Route defaults & SPA HTML5 routing
  if (reqPath === '/board' || reqPath === '/smartboard') {
    reqPath = '/smartboard/index.html';
  } else if (!path.extname(reqPath) && !reqPath.startsWith('/smartboard') && !reqPath.startsWith('/board')) {
    const distIndex = path.join(ROOT, 'dashboard', 'frontend', 'dist', 'index.html');
    reqPath = fs.existsSync(distIndex) ? '/dashboard/frontend/dist/index.html' : '/dashboard/frontend/index.html';
  }

  let filePath = path.join(ROOT, reqPath);

  // Security check — prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const clean = reqPath.replace(/^\//, '').replace(/^src\//, '');
      const candidates = [
        path.join(ROOT, clean),
        path.join(ROOT, 'dashboard', 'frontend', 'dist', clean),
        path.join(ROOT, 'dashboard', 'frontend', clean),
        path.join(ROOT, 'smart-board-my-version', 'src', clean),
        path.join(ROOT, 'smart-board-my-version', 'src', 'assets', clean),
        path.join(ROOT, 'dashboard', 'frontend', 'assets', clean)
      ];
      let found = null;
      for (const cand of candidates) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          found = cand;
          break;
        }
      }
      if (found) {
        filePath = found;
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${reqPath}`);
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`  KPR Institute of Engineering and Technology (KPRIET)`);
  console.log(`  Academic Platform & Smart Board Dev Server`);
  console.log(`  ----------------------------------------------------`);
  console.log(`  ➜ Home / Login: http://localhost:${PORT}`);
  console.log(`  ➜ Dashboard:    http://localhost:${PORT}/dashboard`);
  console.log(`  ➜ Smart Board:  http://localhost:${PORT}/smartboard`);
  console.log(`======================================================\n`);
});
