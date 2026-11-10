/**
 * TEST DOUBLE of a WooCommerce REST API (documented shapes). NOT a real WooCommerce store.
 * Results obtained with it prove SitePulse's logic, never real-store compatibility.
 */
export function makeFakeStore({ origin = 'https://shop.example.com', ck = 'ck_' + 'a'.repeat(20), cs = 'cs_' + 'b'.repeat(20), perms = 'read_write' } = {}) {
  const st = {
    origin, ck, cs, perms, revoked: false, down: false, flaky: 0, flakyStatus: 503, mangleWrite: false, calls: [],
    products: [], orders: [], pages: [], categories: [{ id: 3, name: 'Clothes', count: 1 }]
  };
  const page = (arr, p) => {
    const u = new URL('https://x' + p);
    const per = Number(u.searchParams.get('per_page') || 10), n = Number(u.searchParams.get('page') || 1);
    return { slice: arr.slice((n - 1) * per, n * per), total: Math.max(1, Math.ceil(arr.length / per)) };
  };
  st.http = async ({ method, origin: o, path: p, headers = {}, body }) => {
    st.calls.push({ method, p, auth: !!headers.Authorization, body });
    if (o !== st.origin) return { ok: false, status: 0, error: 'ENOTFOUND' };
    if (st.down) return { ok: false, status: 0, error: 'Timed out' };
    if (st.flaky > 0) { st.flaky -= 1; return { ok: false, status: st.flakyStatus, json: {} }; }
    if (p === '/wp-json/') return { ok: true, status: 200, json: { name: 'Demo Shop', namespaces: ['wp/v2', 'wc/v3'] } };
    if (p.startsWith('/wp-json/wp/v2/pages')) { const r = page(st.pages, p); return { ok: true, status: 200, headers: { 'x-wp-totalpages': String(r.total) }, json: r.slice }; }
    if (p.startsWith('/wp-json/wc/')) {
      const expected = 'Basic ' + Buffer.from(`${st.ck}:${st.cs}`).toString('base64');
      if (st.revoked || headers.Authorization !== expected) return { ok: false, status: 401, json: {} };
      if (method !== 'GET' && st.perms !== 'read_write') return { ok: false, status: 403, json: {} };
    }
    if (method === 'GET' && p.startsWith('/wp-json/wc/v3/products/categories')) return { ok: true, status: 200, headers: { 'x-wp-totalpages': '1' }, json: st.categories };
    if (method === 'GET' && p.startsWith('/wp-json/wc/v3/products')) { const r = page(st.products, p); return { ok: true, status: 200, headers: { 'x-wp-totalpages': String(r.total) }, json: r.slice }; }
    if (method === 'GET' && p.startsWith('/wp-json/wc/v3/orders')) { const r = page(st.orders, p); return { ok: true, status: 200, headers: { 'x-wp-totalpages': String(r.total) }, json: r.slice }; }
    const pm = /products\/(\d+)$/.exec(p), om = /orders\/(\d+)$/.exec(p);
    if (method === 'PUT' && pm) {
      const prod = st.products.find((x) => String(x.id) === pm[1]); if (!prod) return { ok: false, status: 404, json: {} };
      const applied = { ...body }; if (st.mangleWrite && applied.regular_price) applied.regular_price = '1';
      Object.assign(prod, applied); return { ok: true, status: 200, json: prod };
    }
    if (method === 'PUT' && om) { const o2 = st.orders.find((x) => String(x.id) === om[1]); if (!o2) return { ok: false, status: 404, json: {} }; Object.assign(o2, body); return { ok: true, status: 200, json: o2 }; }
    if (method === 'POST' && /notes$/.test(p)) return { ok: true, status: 201, json: {} };
    return { ok: false, status: 404, json: {} };
  };
  st.addProduct = (o = {}) => { const id = o.id ?? (st.products.length ? Math.max(...st.products.map((x) => x.id)) + 1 : 11); const p = { id, name: `Product ${id}`, sku: `SKU-${id}`, regular_price: '100', price: '100', manage_stock: true, stock_quantity: 10, categories: [{ name: 'Clothes' }], images: [{ src: `https://shop.example.com/i${id}.jpg` }], description: `<p>Description ${id}</p>`, status: 'publish', type: 'simple', ...o }; st.products.push(p); return p; };
  st.addOrder = (o = {}) => { const id = o.id ?? (st.orders.length ? Math.max(...st.orders.map((x) => x.id)) + 1 : 501); const r = { id, status: 'processing', total: '200.00', billing: { first_name: 'Sita', last_name: 'K', email: 'sita@example.com' }, shipping: { address_1: 'Ward 5', city: 'Kathmandu' }, line_items: [{ quantity: 2 }], date_created_gmt: '2026-11-09T01:00:00', date_modified_gmt: '2026-11-09T01:00:00', ...o }; st.orders.push(r); return r; };
  return st;
}
