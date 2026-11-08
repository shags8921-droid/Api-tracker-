/**
 * TEST-ONLY minimal Express-compatible shim (no node_modules/network in the audit sandbox).
 * It implements just enough of the Express routing/middleware contract used by app.js.
 * Results from this harness prove route/authorisation LOGIC, not real-Express wiring; run `npm test`
 * against real express in CI to cover that gap.
 */
import { EventEmitter } from 'node:events';

export function createShim() {
  function express() {
    const layers = [];
    const settings = {};
    const app = {
      set: (k, v) => { settings[k] = v; },
      disable: () => {},
      use(...args) {
        const prefix = typeof args[0] === 'string' ? args.shift() : '';
        layers.push({ kind: 'use', prefix, fns: args.flat() });
      }
    };
    for (const m of ['get', 'post', 'patch', 'delete']) {
      app[m] = (p, ...fns) => layers.push({ kind: 'route', method: m.toUpperCase(), path: p, fns: fns.flat() });
    }
    app.handle = (reqIn) => new Promise((resolve) => {
      const url = reqIn.url;
      const pathOnly = url.split('?')[0];
      const query = Object.fromEntries(new URLSearchParams(url.split('?')[1] || ''));
      const req = Object.assign(new EventEmitter(), {
        method: reqIn.method || 'GET', url, originalUrl: url, path: pathOnly, query, params: {},
        headers: Object.fromEntries(Object.entries(reqIn.headers || {}).map(([k, v]) => [k.toLowerCase(), v])),
        body: reqIn.body, ip: reqIn.ip || '127.0.0.1', secure: false
      });
      const headers = {};
      const res = Object.assign(new EventEmitter(), {
        statusCode: 200,
        status(c) { this.statusCode = c; return this; },
        setHeader(k, v) { headers[k.toLowerCase()] = v; },
        json(body) { return finish(body); },
        end() { return finish(undefined); },
        sendFile(f) { return finish({ sendFile: f }); }
      });
      let done = false;
      function finish(body) {
        if (done) return res;
        done = true;
        res.emit('finish'); res.emit('close');
        resolve({ status: res.statusCode, headers, body: body === undefined ? null : JSON.parse(JSON.stringify(body)) });
        return res;
      }
      const chain = [];
      for (const l of layers) {
        if (l.kind === 'use') {
          if (!l.prefix || pathOnly === l.prefix || pathOnly.startsWith(l.prefix + '/')) chain.push(...l.fns);
        } else if (l.method === req.method) {
          const names = [];
          const re = new RegExp('^' + l.path.replace(/:([A-Za-z]+)/g, (_, n) => { names.push(n); return '([^/]+)'; }) + '$');
          const m = re.exec(pathOnly);
          if (m) chain.push(...l.fns.map((fn) => (rq, rs, nx) => { names.forEach((n, i) => { rq.params[n] = decodeURIComponent(m[i + 1]); }); return fn(rq, rs, nx); }));
        }
      }
      let i = 0;
      const next = (err) => {
        while (i < chain.length) {
          const fn = chain[i++];
          if (err ? fn.length === 4 : fn.length < 4) {
            try { const r = err ? fn(err, req, res, next) : fn(req, res, next); if (r && r.catch) r.catch(next); } catch (e) { next(e); }
            return;
          }
        }
        if (!done) finish({ error: 'unhandled', detail: err ? String(err) : 'no route' });
      };
      next();
    });
    return app;
  }
  express.json = () => (req, res, next) => next();
  express.static = () => (req, res, next) => next();
  return express;
}
