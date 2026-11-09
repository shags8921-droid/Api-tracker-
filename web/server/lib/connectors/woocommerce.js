/**
 * WooCommerce connector (REST API v3, HTTPS + consumer key/secret over Basic auth).
 *
 * The owner generates the key in WooCommerce > Settings > Advanced > REST API. A read-only key can read but every write
 * will be refused by the store; those refusals are reported as errors, never as success.
 * The remote store is the source of truth: writes go to the store FIRST; the caller updates its local copy only after
 * this module returns ok.
 *
 * `http` is injectable: production uses safeRequest (SSRF-safe); tests pass a contract-test double.
 * NOTE: endpoint paths/fields follow the public WooCommerce REST docs and still need verification against a real store.
 */
export class ConnectorError extends Error {
  constructor(message, { code = 'REMOTE_ERROR', status = 502, remoteStatus = null } = {}) {
    super(message);
    this.code = code; this.status = status; this.remoteStatus = remoteStatus;
  }
}

const MAX_PAGES = 20;
const PER_PAGE = 100;

export const normalizeProduct = (p) => ({
  remoteId: String(p.id), name: String(p.name ?? '').slice(0, 120), sku: String(p.sku || `WC-${p.id}`).slice(0, 64),
  price: Number(p.regular_price || p.price || 0) || 0,
  stock: p.manage_stock && Number.isFinite(Number(p.stock_quantity)) ? Math.max(0, Math.trunc(Number(p.stock_quantity))) : null,
  category: String(p.categories?.[0]?.name || 'General').slice(0, 60),
  imageUrl: typeof p.images?.[0]?.src === 'string' ? p.images[0].src : null,
  status: String(p.status || 'publish')
});

export const normalizeOrder = (o) => ({
  remoteId: String(o.id),
  customer: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || o.billing?.email || 'Customer',
  itemsCount: Array.isArray(o.line_items) ? o.line_items.reduce((s, l) => s + (Number(l.quantity) || 0), 0) : 0,
  totalAmount: Number(o.total) || 0,
  remoteStatus: String(o.status || ''),
  placedAt: o.date_created_gmt ? `${o.date_created_gmt}Z` : null
});

/** WooCommerce order status -> SitePulse workspace status. */
export const mapOrderStatus = (remote) =>
  ({ pending: 'NEW', processing: 'PROCESSING', 'on-hold': 'PROCESSING', completed: 'SHIPPED' }[remote] || 'CANCELLED');

export function createWooConnector({ http }) {
  const basic = (c) => `Basic ${Buffer.from(`${c.consumerKey}:${c.consumerSecret}`).toString('base64')}`;
  const call = async (origin, creds, method, path, body) => {
    const r = await http({ method, origin, path, headers: creds ? { Authorization: basic(creds) } : {}, body });
    if (r.ok) return r;
    if (r.status === 401 || r.status === 403) throw new ConnectorError('The store rejected the credentials or the key lacks permission for this action.', { code: 'AUTH_REJECTED', status: 502, remoteStatus: r.status });
    if (r.status === 404) throw new ConnectorError('The store does not expose this WooCommerce endpoint.', { code: 'NOT_FOUND', remoteStatus: 404 });
    if (r.status === 429) throw new ConnectorError('The store is rate limiting requests. Try again later.', { code: 'RATE_LIMITED', status: 503, remoteStatus: 429 });
    throw new ConnectorError(r.error || `The store returned HTTP ${r.status || 'no response'}.`, { code: 'REMOTE_ERROR', remoteStatus: r.status || null });
  };

  async function paged(origin, creds, path) {
    const out = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const sep = path.includes('?') ? '&' : '?';
      const r = await call(origin, creds, 'GET', `${path}${sep}per_page=${PER_PAGE}&page=${page}`);
      if (!Array.isArray(r.json)) throw new ConnectorError('Unexpected response shape from the store.', { code: 'BAD_RESPONSE' });
      out.push(...r.json);
      const totalPages = Number(r.headers?.['x-wp-totalpages'] || 1);
      if (page >= totalPages) return { items: out, truncated: false };
    }
    return { items: out, truncated: true };
  }

  return {
    id: 'woocommerce',

    /** Unauthenticated: is this a WordPress site with the WooCommerce REST namespace? */
    async detect(origin) {
      const r = await http({ method: 'GET', origin, path: '/wp-json/', headers: {} });
      if (!r.ok || !r.json || typeof r.json !== 'object') return { detected: false, reason: r.error || `HTTP ${r.status || 0}` };
      const ns = Array.isArray(r.json.namespaces) ? r.json.namespaces : [];
      return { detected: ns.some((n) => n === 'wc/v3'), wordpress: true, siteName: typeof r.json.name === 'string' ? r.json.name.slice(0, 120) : null, namespaces: ns.slice(0, 50) };
    },

    /** Authenticated read that proves the key works. Does not prove write permission. */
    async verify(origin, creds) {
      await call(origin, creds, 'GET', '/wp-json/wc/v3/products?per_page=1');
      return { ok: true, writeVerified: false };
    },

    async readCatalog(origin, creds) {
      const [prod, cats] = await Promise.all([
        paged(origin, creds, '/wp-json/wc/v3/products'),
        paged(origin, creds, '/wp-json/wc/v3/products/categories')
      ]);
      const products = prod.items.map(normalizeProduct);
      return { products, categories: cats.items.map((c) => ({ remoteId: String(c.id), name: String(c.name ?? '').slice(0, 60), count: Number(c.count) || 0 })), truncated: prod.truncated || cats.truncated };
    },

    async readOrders(origin, creds) {
      const { items, truncated } = await paged(origin, creds, '/wp-json/wc/v3/orders');
      const orders = items.map(normalizeOrder);
      return { orders, truncated };
    },

    async readPages(origin) {
      const { items, truncated } = await paged(origin, null, '/wp-json/wp/v2/pages');
      return { pages: items.map((p) => ({ remoteId: String(p.id), title: String(p.title?.rendered ?? '').slice(0, 120), link: typeof p.link === 'string' ? p.link : null, status: String(p.status || '') })), truncated };
    },

    async updatePrice(origin, creds, remoteId, price) {
      const r = await call(origin, creds, 'PUT', `/wp-json/wc/v3/products/${encodeURIComponent(remoteId)}`, { regular_price: String(price) });
      return { remotePrice: Number(r.json?.regular_price ?? price) };
    },

    async updateStock(origin, creds, remoteId, stock) {
      const r = await call(origin, creds, 'PUT', `/wp-json/wc/v3/products/${encodeURIComponent(remoteId)}`, { manage_stock: true, stock_quantity: stock });
      return { remoteStock: Number(r.json?.stock_quantity ?? stock) };
    },

    async markOrderCompleted(origin, creds, remoteId, trackingNote) {
      const r = await call(origin, creds, 'PUT', `/wp-json/wc/v3/orders/${encodeURIComponent(remoteId)}`, { status: 'completed' });
      if (trackingNote) {
        // Best effort private note; the status change above is what matters.
        try { await call(origin, creds, 'POST', `/wp-json/wc/v3/orders/${encodeURIComponent(remoteId)}/notes`, { note: trackingNote, customer_note: false }); } catch { /* ignore */ }
      }
      return { remoteStatus: String(r.json?.status || 'completed') };
    }
  };
}
