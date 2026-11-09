import { ConnectorError } from './woocommerce.js';

export const normalizeCustomProduct = (p, idx) => ({
  remoteId: String(p.id ?? p._id ?? p.sku ?? idx),
  name: String(p.name ?? p.title ?? 'Product').slice(0, 120),
  sku: String(p.sku ?? `CUSTOM-${p.id || idx}`).slice(0, 64),
  price: Number(p.price ?? p.regular_price ?? 0) || 0,
  stock: p.stock !== undefined ? Math.max(0, Math.trunc(Number(p.stock))) : null,
  category: String(p.category ?? 'General').slice(0, 60),
  imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl : (typeof p.image === 'string' ? p.image : null),
  status: String(p.status || 'publish')
});

export const normalizeCustomOrder = (o, idx) => ({
  remoteId: String(o.id ?? o._id ?? idx),
  customer: String(o.customer ?? o.customerName ?? o.email ?? 'Customer').slice(0, 80),
  itemsCount: Number(o.itemsCount ?? o.items?.length ?? 1) || 1,
  totalAmount: Number(o.totalAmount ?? o.total ?? 0) || 0,
  remoteStatus: String(o.status ?? 'PROCESSING'),
  placedAt: o.placedAt || o.createdAt || null
});

export function createCustomConnector({ http }) {
  const headers = (creds) => {
    const h = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (creds?.apiKey) h['X-API-Key'] = creds.apiKey;
    if (creds?.bearerToken) h['Authorization'] = `Bearer ${creds.bearerToken}`;
    return h;
  };

  const call = async (origin, creds, method, path, body) => {
    const r = await http({ method, origin, path, headers: headers(creds), body });
    if (r.ok) return r;
    if (r.status === 401 || r.status === 403) {
      throw new ConnectorError('Custom website API rejected the key or token.', { code: 'AUTH_REJECTED', status: 502, remoteStatus: r.status });
    }
    if (r.status === 404) {
      throw new ConnectorError('Custom website API endpoint not found.', { code: 'NOT_FOUND', remoteStatus: 404 });
    }
    throw new ConnectorError(r.error || `Custom API returned HTTP ${r.status || 'unknown'}.`, { code: 'REMOTE_ERROR', remoteStatus: r.status || null });
  };

  return {
    id: 'custom',

    async detect(origin) {
      try {
        const r = await http({ method: 'GET', origin, path: '/api/v1/health', headers: {} });
        if (r.ok) return { detected: true, siteName: 'Custom API Website', custom: true };
      } catch {}
      try {
        const r = await http({ method: 'GET', origin, path: '/api/health', headers: {} });
        if (r.ok) return { detected: true, siteName: 'Custom API Website', custom: true };
      } catch {}
      try {
        const r = await http({ method: 'GET', origin, path: '/openapi.json', headers: {} });
        if (r.ok) return { detected: true, siteName: 'OpenAPI REST Service', custom: true };
      } catch {}
      return { detected: false, reason: 'No standard health or OpenAPI endpoint detected.' };
    },

    async verify(origin, creds) {
      // Test either health or products
      try {
        await call(origin, creds, 'GET', '/api/v1/health');
        return { ok: true, writeVerified: false };
      } catch {
        await call(origin, creds, 'GET', '/api/products');
        return { ok: true, writeVerified: false };
      }
    },

    async readCatalog(origin, creds) {
      let r;
      try {
        r = await call(origin, creds, 'GET', '/api/products');
      } catch {
        r = await call(origin, creds, 'GET', '/api/catalog');
      }
      const raw = Array.isArray(r.json) ? r.json : (Array.isArray(r.json?.products) ? r.json.products : []);
      const products = raw.map(normalizeCustomProduct);
      const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).map((name, i) => ({
        remoteId: String(i + 1),
        name,
        count: products.filter(p => p.category === name).length
      }));
      return { products, categories, truncated: false };
    },

    async readOrders(origin, creds) {
      let r;
      try {
        r = await call(origin, creds, 'GET', '/api/orders');
      } catch {
        return { orders: [], truncated: false };
      }
      const raw = Array.isArray(r.json) ? r.json : (Array.isArray(r.json?.orders) ? r.json.orders : []);
      const orders = raw.map(normalizeCustomOrder);
      return { orders, truncated: false };
    },

    async readPages(origin, creds) {
      try {
        const r = await call(origin, creds, 'GET', '/api/pages');
        const raw = Array.isArray(r.json) ? r.json : [];
        return {
          pages: raw.map((p, idx) => ({
            remoteId: String(p.id ?? idx),
            title: String(p.title ?? 'Page'),
            link: `${origin}/${p.slug || p.path || ''}`,
            status: 'published'
          })),
          truncated: false
        };
      } catch {
        return { pages: [], truncated: false };
      }
    },

    async updatePrice(origin, creds, remoteId, price) {
      const r = await call(origin, creds, 'PUT', `/api/products/${encodeURIComponent(remoteId)}`, { price: Number(price) });
      return { remotePrice: Number(r.json?.price ?? price) };
    },

    async updateStock(origin, creds, remoteId, stock) {
      const r = await call(origin, creds, 'PUT', `/api/products/${encodeURIComponent(remoteId)}/stock`, { stock: Number(stock) });
      return { remoteStock: Number(r.json?.stock ?? stock) };
    },

    async markOrderCompleted(origin, creds, remoteId, trackingNote) {
      const r = await call(origin, creds, 'POST', `/api/orders/${encodeURIComponent(remoteId)}/fulfill`, {
        status: 'SHIPPED',
        trackingNumber: trackingNote
      });
      return { remoteStatus: 'SHIPPED' };
    }
  };
}
