/**
 * Granular manager permissions. Owners always have every permission inside their own organisation.
 * Only operations that actually exist in this server are listed: nothing here is a placeholder.
 * Owner-only actions (connect/disconnect websites, credentials, users and access, webhooks, backups, billing, export)
 * are deliberately NOT delegable and therefore have no permission id.
 */
export const WORKSPACE = 'workspace'; // virtual "website": records that belong to the organisation but to no connected store

export const PERMISSIONS = Object.freeze([
  { id: 'website.view', group: 'Websites', label: 'See assigned websites, their status and capabilities' },
  { id: 'website.sync', group: 'Websites', label: 'Start a synchronisation of an assigned website' },
  { id: 'orders.view', group: 'Orders', label: 'See orders of assigned websites' },
  { id: 'customers.view', group: 'Orders', label: 'See customer names and delivery details on orders' },
  { id: 'orders.fulfill', group: 'Orders', label: 'Mark orders as fulfilled / shipped' },
  { id: 'products.view', group: 'Products', label: 'See products of assigned websites' },
  { id: 'products.create', group: 'Products', label: 'Create products in the SitePulse workspace (local only)' },
  { id: 'products.price.edit', group: 'Products', label: 'Change product prices' },
  { id: 'inventory.view', group: 'Inventory', label: 'See stock levels' },
  { id: 'inventory.update', group: 'Inventory', label: 'Change stock quantities' }
]);

export const PERMISSION_IDS = new Set(PERMISSIONS.map((p) => p.id));

/** What every manager could do before granular permissions existed (price editing was owner-only). Used ONLY by the one-time migration. */
export const LEGACY_MANAGER_GRANTS = Object.freeze([
  'website.view', 'website.sync', 'orders.view', 'customers.view', 'orders.fulfill',
  'products.view', 'products.create', 'inventory.view', 'inventory.update'
]);

/** Returns a de-duplicated list of valid ids, or null if the input is not an array of known permission ids. */
export function parsePermissionList(input) {
  if (!Array.isArray(input) || input.length > PERMISSIONS.length) return null;
  if (!input.every((p) => typeof p === 'string' && PERMISSION_IDS.has(p))) return null;
  return [...new Set(input)];
}
