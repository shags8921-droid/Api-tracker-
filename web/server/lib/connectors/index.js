import { createWooConnector } from './woocommerce.js';
import { createShopifyConnector } from './shopify.js';
import { createCustomConnector } from './custom.js';

/** Platform registry. Real connectors for WooCommerce, Shopify, and Custom REST/OpenAPI websites. */
export function createConnectors({ http }) {
  return {
    woocommerce: createWooConnector({ http }),
    shopify: createShopifyConnector({ http }),
    custom: createCustomConnector({ http })
  };
}

export const SUPPORTED_PLATFORMS = ['woocommerce', 'shopify', 'custom'];
