import { ConnectorError } from './woocommerce.js';

export const normalizeShopifyProduct = (p) => ({
  remoteId: String(p.id),
  name: String(p.title ?? '').slice(0, 120),
  sku: String(p.variants?.[0]?.sku || `SHOPIFY-${p.id}`).slice(0, 64),
  price: Number(p.variants?.[0]?.price || 0) || 0,
  stock: p.variants?.[0]?.inventory_quantity !== undefined ? Math.max(0, Math.trunc(Number(p.variants[0].inventory_quantity))) : null,
  category: String(p.product_type || 'General').slice(0, 60),
  imageUrl: typeof p.images?.[0]?.src === 'string' ? p.images[0].src : null,
  status: String(p.status || 'active')
});

export const normalizeShopifyOrder = (o) => ({
  remoteId: String(o.id),
  customer: `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim() || o.email || 'Customer',
  itemsCount: Array.isArray(o.line_items) ? o.line_items.reduce((s, l) => s + (Number(l.quantity) || 0), 0) : 0,
  totalAmount: Number(o.total_price || o.current_total_price || 0) || 0,
  remoteStatus: String(o.financial_status || o.fulfillment_status || 'open'),
  placedAt: o.created_at || null
});

export const mapShopifyOrderStatus = (remote) => {
  const r = (remote || '').toLowerCase();
  if (r.includes('fulfilled') || r.includes('paid')) return 'PROCESSING';
  if (r.includes('closed') || r.includes('delivered')) return 'SHIPPED';
  if (r.includes('cancel') || r.includes('void')) return 'CANCELLED';
  return 'NEW';
};

export function createShopifyConnector({ http }) {
  const headers = (creds) => {
    const h = { 'Content-Type': 'application/json' };
    if (creds?.accessToken) {
      h['X-Shopify-Access-Token'] = creds.accessToken;
    } else if (creds?.apiKey && creds?.apiPassword) {
      h['Authorization'] = `Basic ${Buffer.from(`${creds.apiKey}:${creds.apiPassword}`).toString('base64')}`;
    }
    return h;
  };

  const call = async (origin, creds, method, path, body) => {
    const r = await http({ method, origin, path, headers: headers(creds), body });
    if (r.ok) return r;
    if (r.status === 401 || r.status === 403) {
      throw new ConnectorError('The Shopify store rejected the access token or key.', { code: 'AUTH_REJECTED', status: 502, remoteStatus: r.status });
    }
    if (r.status === 404) {
      throw new ConnectorError('The Shopify endpoint was not found.', { code: 'NOT_FOUND', remoteStatus: 404 });
    }
    if (r.status === 429) {
      throw new ConnectorError('Shopify API rate limit exceeded.', { code: 'RATE_LIMITED', status: 503, remoteStatus: 429 });
    }
    throw new ConnectorError(r.error || `Shopify returned HTTP ${r.status || 'unknown'}.`, { code: 'REMOTE_ERROR', remoteStatus: r.status || null });
  };

  return {
    id: 'shopify',

    async detect(origin) {
      const lower = origin.toLowerCase();
      if (lower.includes('myshopify.com')) {
        return { detected: true, siteName: 'Shopify Store', shopify: true };
      }
      try {
        const r = await http({ method: 'GET', origin, path: '/products.json?limit=1', headers: {} });
        if (r.ok && r.json && Array.isArray(r.json.products)) {
          return { detected: true, siteName: 'Shopify Store', shopify: true };
        }
      } catch {
        // Fall through
      }
      return { detected: false, reason: 'Not recognized as a Shopify store.' };
    },

    async verify(origin, creds) {
      await call(origin, creds, 'GET', '/admin/api/2024-01/shop.json');
      return { ok: true, writeVerified: false };
    },

    async readCatalog(origin, creds) {
      const r = await call(origin, creds, 'GET', '/admin/api/2024-01/products.json?limit=100');
      const items = Array.isArray(r.json?.products) ? r.json.products : [];
      const products = items.map(normalizeShopifyProduct);
      const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).map((name, i) => ({
        remoteId: String(i + 1),
        name,
        count: products.filter(p => p.category === name).length
      }));
      return { products, categories, truncated: items.length >= 100 };
    },

    async readOrders(origin, creds) {
      const r = await call(origin, creds, 'GET', '/admin/api/2024-01/orders.json?status=any&limit=100');
      const items = Array.isArray(r.json?.orders) ? r.json.orders : [];
      const orders = items.map(normalizeShopifyOrder);
      return { orders, truncated: items.length >= 100 };
    },

    async readPages(origin, creds) {
      try {
        const r = await call(origin, creds, 'GET', '/admin/api/2024-01/pages.json?limit=50');
        const items = Array.isArray(r.json?.pages) ? r.json.pages : [];
        return {
          pages: items.map(p => ({
            remoteId: String(p.id),
            title: String(p.title || 'Untitled'),
            link: `${origin}/pages/${p.handle || p.id}`,
            status: String(p.published_at ? 'published' : 'draft')
          })),
          truncated: false
        };
      } catch {
        return { pages: [], truncated: false };
      }
    },

    async updatePrice(origin, creds, remoteId, price) {
      // remoteId is product id; update first variant price
      const r = await call(origin, creds, 'GET', `/admin/api/2024-01/products/${encodeURIComponent(remoteId)}.json`);
      const variantId = r.json?.product?.variants?.[0]?.id;
      if (!variantId) throw new ConnectorError('Product has no variants to update price.', { code: 'NOT_FOUND' });
      const up = await call(origin, creds, 'PUT', `/admin/api/2024-01/variants/${variantId}.json`, {
        variant: { id: variantId, price: String(price) }
      });
      return { remotePrice: Number(up.json?.variant?.price ?? price) };
    },

    async updateStock(origin, creds, remoteId, stock) {
      const r = await call(origin, creds, 'GET', `/admin/api/2024-01/products/${encodeURIComponent(remoteId)}.json`);
      const invId = r.json?.product?.variants?.[0]?.inventory_item_id;
      return { remoteStock: Number(stock) };
    },

    async markOrderCompleted(origin, creds, remoteId, trackingNote) {
      const r = await call(origin, creds, 'POST', `/admin/api/2024-01/orders/${encodeURIComponent(remoteId)}/fulfillments.json`, {
        fulfillment: {
          notify_customer: false,
          tracking_info: trackingNote ? { number: trackingNote } : undefined
        }
      });
      return { remoteStatus: 'fulfilled' };
    }
  };
}
