import { createWooConnector } from './woocommerce.js';
/** Platform registry. Shopify and custom REST/GraphQL connectors do not exist yet and are intentionally absent. */
export function createConnectors({ http }) {
  return { woocommerce: createWooConnector({ http }) };
}
export const SUPPORTED_PLATFORMS = ['woocommerce'];
