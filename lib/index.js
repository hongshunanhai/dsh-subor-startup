/**
 * dsh-subor-startup — Host half
 *
 * Serves the splash page from ./public and injects a full-screen iframe into
 * the DSH web index. The iframe posts "dsh-subor:done" when the CRT fade
 * finishes; the parent then removes it and reveals the app.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUBLIC_ROOT = path.join(PACKAGE_ROOT, 'public')
const ROUTE_BASE = '/dsh-subor'
const NS = 'dsh-subor-startup'

const name = NS
const inject = ['webServer', 'connection']

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
}

function resolveWebServer(ctx) {
  try {
    const viaGet = typeof ctx.get === 'function' ? ctx.get('webServer') : undefined
    if (viaGet) return viaGet
  } catch (err) { /* ignore */ }
  return ctx.webServer
}

function hasRoutes(server) {
  return !!server && typeof server.register === 'function' && typeof server.tapIndex === 'function'
}

const SNIPPET = `
<style>
html.dsh-subor-lock, html.dsh-subor-lock body { overflow: hidden !important; background: #000 !important; }
#dsh-subor-frame { position: fixed; inset: 0; width: 100vw; height: 100vh; border: 0; z-index: 2147483000; background: #000; transition: opacity .5s ease; }
</style>
<iframe id="dsh-subor-frame" src="${ROUTE_BASE}/splash.html?embed=1" title="小霸王启动画面" allow="autoplay"></iframe>
<script>
(function () {
  var doc = document.documentElement;
  doc.classList.add('dsh-subor-lock');
  function done() {
    var f = document.getElementById('dsh-subor-frame');
    if (!f) return;
    f.style.opacity = '0';
    setTimeout(function () {
      if (f.parentNode) f.parentNode.removeChild(f);
      doc.classList.remove('dsh-subor-lock');
    }, 520);
  }
  window.addEventListener('message', function (e) {
    if (e && e.data === 'dsh-subor:done') done();
  });
  setTimeout(done, 30000);
})();
</script>`

function apply(ctx) {
  const disposers = []
  const webServer = resolveWebServer(ctx)

  if (!hasRoutes(webServer)) {
    try {
      ctx.logger?.warn?.(
        '[' + NS + '] 当前 profile 没有可用的 webServer（Electron 可能用 file:// + IPC 下发前端）；' +
        'Host 半侧跳过注入。'
      )
    } catch (err) { /* ignore */ }
    return
  }

  function rejected(req, res) {
    try {
      const conn = (typeof ctx.get === 'function' ? ctx.get('connection') : undefined) || ctx.connection
      if (!conn || typeof conn.requestRejection !== 'function') return false
      const code = conn.requestRejection(req)
      if (code === undefined || code === null || code === false) return false
      res.statusCode = typeof code === 'number' ? code : 403
      res.end()
      return true
    } catch (err) {
      return false
    }
  }

  function registerRoute(route) {
    const inner = route.handler
    const wrapped = Object.assign({}, route, {
      handler: async (req, res) => {
        if (rejected(req, res)) return
        return inner(req, res)
      }
    })
    return webServer.register(wrapped)
  }

  disposers.push(registerRoute({
    kind: 'prefix',
    path: ROUTE_BASE,
    handler: (req, res) => {
      const url = (req.url || '').split('?')[0].split('#')[0]
      let rel = url.slice(ROUTE_BASE.length)
      try {
        rel = decodeURIComponent(rel)
      } catch (err) {
        res.writeHead(400); res.end(); return
      }
      if (!rel || rel === '/') rel = '/splash.html'
      if (rel.includes('..') || rel.includes('\\0')) {
        res.writeHead(403); res.end(); return
      }

      const file = path.join(PUBLIC_ROOT, path.normalize(rel))
      if (!file.startsWith(PUBLIC_ROOT + path.sep)) {
        res.writeHead(403); res.end(); return
      }

      let bytes
      try {
        bytes = fs.readFileSync(file)
      } catch (err) {
        res.writeHead(404); res.end(); return
      }

      const ext = path.extname(file).toLowerCase()
      const type = MIME[ext] || 'application/octet-stream'
      const cache = ext === '.html' || ext === '.js' || ext === '.css' || ext === '.json'
        ? 'no-store'
        : 'public, max-age=86400'
      res.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': cache,
        'Content-Length': String(bytes.length)
      })
      res.end(bytes)
    }
  }))

  disposers.push(webServer.tapIndex((html) => {
    if (!html || html.includes('id="dsh-subor-frame"')) return html
    if (html.includes('</body>')) return html.replace('</body>', SNIPPET + '</body>')
    return html + SNIPPET
  }))

  ctx.effect(() => () => {
    for (const dispose of disposers) {
      try { dispose() } catch (err) { /* ignore */ }
    }
  })
}

export { apply, inject, name }
