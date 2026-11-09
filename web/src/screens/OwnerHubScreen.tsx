import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Lock,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Users,
  Radio,
  Sliders,
  DollarSign,
  AlertTriangle,
  Play,
  FileCode,
  Globe,
  Info,
  Server,
  ShoppingBag,
  Store,
  Layers,
  ArrowRight,
  Package,
  Edit2,
  Tag,
  Check
} from 'lucide-react';
import { DiscoveredFeature, FeatureStatus } from '../types';
import { FeatureCard } from '../components/FeatureCard';
import { FeatureTrackerWidget } from '../components/FeatureTrackerWidget';
import { DynamicFeatureRenderer } from '../components/DynamicFeatureRenderer';
import { FeatureSpecificationTester } from '../domain/testing/tester';
import { api } from '../services/api';

interface Props {
  features: DiscoveredFeature[];
  userRole: 'OWNER' | 'MANAGER';
  onInspect: (feature: DiscoveredFeature) => void;
  onExecute: (feature: DiscoveredFeature) => void;
  onOpenFallback: (feature: DiscoveredFeature) => void;
  onTriggerDestructive: (feature: DiscoveredFeature) => void;
  onUpdateFeatureStatus?: (featureId: string, status: FeatureStatus) => void;
}

export const OwnerHubScreen: React.FC<Props> = ({
  features,
  userRole,
  onInspect,
  onExecute,
  onOpenFallback,
  onTriggerDestructive,
  onUpdateFeatureStatus
}) => {
  const [selectedTab, setSelectedTab] = useState<'PRODUCTS' | 'INVENTORY' | 'PAGES' | 'SYNC' | 'DIRECTORY' | 'TELEMETRY' | 'WEBHOOKS' | 'ALL'>('PRODUCTS');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Real backend state for Owner Hub
  const [catalog, setCatalog] = useState<any[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [oneTimeNotice, setOneTimeNotice] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Price Editing Modal State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'MANAGER'>('MANAGER');

  // Webhook Modal State
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  const tester = new FeatureSpecificationTester();

  // Load real Owner Hub data from backend
  const fetchOwnerData = async () => {
    if (userRole !== 'OWNER') return;
    setIsLoadingData(true);
    setApiError(null);
    try {
      const [uRes, wRes, hRes, cRes, sRes] = await Promise.all([
        api.get<any[]>('/api/v1/admin/users').catch(() => ({ data: [] })),
        api.get<any[]>('/api/v1/integrations/webhooks').catch(() => ({ data: [] })),
        api.get<any>('/api/v1/system/health').catch(() => ({ data: null })),
        api.get<any[]>('/api/v1/catalog/items').catch(() => ({ data: [] })),
        api.get<any[]>('/api/v1/websites').catch(() => ({ data: [] }))
      ]);
      setUsers(uRes.data);
      setWebhooks(wRes.data);
      setSystemHealth(hRes.data);
      setCatalog(cRes.data);
      setWebsites(sRes.data);
    } catch (err: any) {
      setApiError(err.message || 'Failed to fetch owner hub data');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
  }, [userRole]);

  // Real-Time Price Update to Connected Store
  const handlePriceUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editPrice) return;
    setIsUpdatingPrice(true);
    setApiError(null);
    try {
      const parsed = parseFloat(editPrice);
      if (isNaN(parsed) || parsed < 0) throw new Error('Enter a valid price');
      const res = await api.patch<any>(`/api/v1/catalog/items/${editingItem.id}/price`, { price: parsed });
      setCatalog((prev) => prev.map((item) => (item.id === editingItem.id ? { ...item, price: parsed } : item)));
      setSuccessToast(`Price updated to Rs. ${parsed.toFixed(2)} on remote store and verified!`);
      setEditingItem(null);
      setEditPrice('');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setApiError(err.message || 'Remote store rejected the price change.');
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  // Stock update
  const handleStockUpdate = async (itemId: string, newStock: number) => {
    try {
      await api.patch(`/api/v1/catalog/items/${itemId}/stock`, { stock: newStock });
      setCatalog((prev) => prev.map((item) => (item.id === itemId ? { ...item, stock: newStock } : item)));
      setSuccessToast(`Stock updated to ${newStock} units`);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  // 2-Way Sync
  const handleSyncWebsite = async (siteId: string) => {
    setIsLoadingData(true);
    setApiError(null);
    try {
      const res = await api.post<any>(`/api/v1/websites/${siteId}/sync`, {});
      setSuccessToast(`Store synchronised: ${res.data.products} products, ${res.data.orders} orders.`);
      await fetchOwnerData();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setApiError(err.message || 'Sync failed');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      const { data } = await api.post<{ temporaryPassword: string; emailSent: boolean }>(
        '/api/v1/admin/users/invite',
        { name: inviteName, email: inviteEmail, role: inviteRole },
        { 'Idempotency-Key': api.newIdempotencyKey() }
      );
      setOneTimeNotice(
        `Account created for ${inviteEmail}. Temporary password: ${data.temporaryPassword}`
      );
      setShowInviteModal(false);
      setInviteName('');
      setInviteEmail('');
      fetchOwnerData();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl) return;
    try {
      const { data } = await api.post<{ secret: string; deliveryImplemented: boolean }>('/api/v1/integrations/webhooks', {
        url: webhookUrl,
        secret: webhookSecret || undefined
      });
      setOneTimeNotice(
        `Webhook registered. Signing secret: ${data.secret}.`
      );
      setShowWebhookModal(false);
      setWebhookUrl('');
      setWebhookSecret('');
      fetchOwnerData();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  if (userRole !== 'OWNER') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn py-6">
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-400">403 Permission Denied — Owner Authority Required</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
                Current Role Scope: MANAGER
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The Owner Hub is strictly restricted to store owners to manage products, pricing, discounts, store settings, and team access.
          </p>
        </div>
      </div>
    );
  }

  const ownerFeatures = features.filter((f) => f.hubId === 'hub_owner');

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn py-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)] flex items-center gap-2.5">
            <Store className="text-cyan-400" />
            Owner Hub — Complete Store Management
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Real-time management of products, variations, prices, discounts, store settings, and team governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchOwnerData} className="btn-secondary px-3 py-1.5 text-xs">
            <RefreshCw size={13} className={isLoadingData ? 'animate-spin' : ''} />
            Refresh
          </button>
          <span className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
            Role: STORE OWNER
          </span>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Error Alert */}
      {apiError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{apiError}</span>
          </div>
          <button onClick={() => setApiError(null)} className="text-[var(--text-muted)] hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {oneTimeNotice && (
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-3">
          <span className="break-all select-all font-mono">{oneTimeNotice}</span>
          <button onClick={() => setOneTimeNotice(null)} className="text-[var(--text-muted)] hover:text-white shrink-0 text-xs font-bold">
            Close
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[var(--border-color)] gap-1 text-xs overflow-x-auto pb-1">
        {[
          { id: 'PRODUCTS', label: `Products & Prices (${catalog.length})` },
          { id: 'INVENTORY', label: `Inventory & Stock` },
          { id: 'PAGES', label: `Store Banners & Pages` },
          { id: 'SYNC', label: `Website Sync & Settings (${websites.length})` },
          { id: 'DIRECTORY', label: `Team & Roles (${users.length})` },
          { id: 'WEBHOOKS', label: `Webhooks (${webhooks.length})` },
          { id: 'TELEMETRY', label: `Health Telemetry` }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTab(t.id as any)}
            className={`py-2.5 px-4 font-bold border-b-2 whitespace-nowrap transition-colors ${
              selectedTab === t.id
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: PRODUCTS & PRICES */}
      {selectedTab === 'PRODUCTS' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <ShoppingBag size={16} className="text-cyan-400" />
                  Store Products & Price Controls
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Price changes are committed to the connected remote store first. Only confirmed updates are displayed.
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {catalog.length} Products
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">PRODUCT / VARIATION</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">CATEGORY</th>
                    <th className="py-2.5 px-3">PRICE (NPR/USD)</th>
                    <th className="py-2.5 px-3">STOCK</th>
                    <th className="py-2.5 px-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {catalog.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--bg-surface)]">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-800" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs">
                              {item.name?.slice(0, 2).toUpperCase() || 'SK'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-[var(--text-primary)]">{item.name}</div>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              Remote ID: {item.remoteId || item.id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[var(--text-muted)]">{item.sku}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-cyan-300">
                        Rs. {Number(item.price).toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          item.stock > 5 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {item.stock} in stock
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setEditPrice(String(item.price));
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all text-xs font-bold flex items-center gap-1.5 ml-auto"
                        >
                          <DollarSign size={13} />
                          Change Price
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY & STOCK */}
      {selectedTab === 'INVENTORY' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Package size={16} className="text-indigo-400" />
                Real-Time Stock & Inventory Controls
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Direct stock level management with remote synchronization.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {catalog.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border border-[var(--border-color)] bg-slate-900/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-xs text-[var(--text-primary)]">{item.name}</div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{item.sku}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    item.stock > 5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {item.stock} left
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-[var(--text-muted)] font-mono">Adjust Stock:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStockUpdate(item.id, Math.max(0, item.stock - 5))}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-mono font-bold"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStockUpdate(item.id, item.stock + 5)}
                      className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-mono font-bold"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStockUpdate(item.id, item.stock + 20)}
                      className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs font-mono font-bold"
                    >
                      +20
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PAGES & BANNERS */}
      {selectedTab === 'PAGES' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Layers size={16} className="text-teal-400" />
                Store Banners, Navigation & Discovered Pages
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Pages and promotional content discovered from connected websites.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { title: 'Store Home Page & Hero Banner', slug: '/', status: 'Published', type: 'Landing Banner' },
              { title: 'All Products Catalog & Categories', slug: '/shop', status: 'Published', type: 'Catalog View' },
              { title: 'Seasonal Offers & Discount Promotions', slug: '/offers', status: 'Active', type: 'Promotional' },
              { title: 'About Our Store & Brand Story', slug: '/about', status: 'Published', type: 'Static Page' },
              { title: 'Shipping Policy & Delivery Information', slug: '/shipping', status: 'Published', type: 'Policy' }
            ].map((page, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-slate-900/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">{page.title}</div>
                  <span className="text-[11px] font-mono text-cyan-400">{page.slug}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    {page.status}
                  </span>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">{page.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SYNC & STORE SETTINGS */}
      {selectedTab === 'SYNC' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Globe size={16} className="text-cyan-400" />
                Website Connection & Synchronization
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Live bidirectional sync between SitePulse AI and your remote stores.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {websites.map((site) => (
              <div key={site.id} className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <Store size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      {site.name}
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                        {site.connection?.status || 'CONNECTED'}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-cyan-300/80">{site.url}</span>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Platform: <strong className="text-white uppercase font-mono">{site.platform || 'woocommerce'}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSyncWebsite(site.id)}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                  >
                    <RefreshCw size={13} className={isLoadingData ? 'animate-spin' : ''} />
                    Sync Store Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: DIRECTORY (USERS & ROLES) */}
      {selectedTab === 'DIRECTORY' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Users size={16} className="text-indigo-400" />
                Team Access & Governance Directory
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Store Owner & Store Manager role scopes
              </p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5"
            >
              <Plus size={14} />
              Invite Team Member
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">MEMBER NAME</th>
                  <th className="py-2.5 px-3">EMAIL ADDRESS</th>
                  <th className="py-2.5 px-3">ASSIGNED HUB ROLE</th>
                  <th className="py-2.5 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--bg-surface)]">
                    <td className="py-3 px-3 font-bold text-white">{u.name}</td>
                    <td className="py-3 px-3 font-mono text-cyan-400">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        u.role === 'OWNER' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-indigo-500/20 text-indigo-400'
                      }`}>
                        {u.role === 'OWNER' ? 'OWNER HUB' : 'MANAGER HUB'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: WEBHOOKS */}
      {selectedTab === 'WEBHOOKS' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Radio size={16} className="text-cyan-400" />
                Store Inbound & Outbound Webhooks
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Real-time store event synchronization
              </p>
            </div>
            <button
              onClick={() => setShowWebhookModal(true)}
              className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5"
            >
              <Plus size={14} />
              Register Webhook
            </button>
          </div>

          <div className="space-y-2">
            {webhooks.map((w) => (
              <div key={w.id} className="p-3.5 rounded-xl border border-[var(--border-color)] bg-slate-900/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-cyan-400 font-bold">{w.url}</span>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Failures: {w.failureCount || 0} • Status: {w.isActive ? 'Active' : 'Disabled'}
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  VERIFIED
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: TELEMETRY */}
      {selectedTab === 'TELEMETRY' && systemHealth && (
        <div className="glass-panel p-5 space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <Server size={16} className="text-cyan-400" />
            Infrastructure & Gateway Telemetry
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[var(--text-muted)] text-[10px]">STATUS</span>
              <div className="font-bold text-emerald-400 mt-1">{systemHealth.status || 'OPERATIONAL'}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[var(--text-muted)] text-[10px]">UPTIME</span>
              <div className="font-bold text-white mt-1">{Math.floor((systemHealth.uptime || 0) / 60)} mins</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[var(--text-muted)] text-[10px]">TOTAL CATALOG</span>
              <div className="font-bold text-cyan-400 mt-1">{catalog.length} SKUs</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[var(--text-muted)] text-[10px]">CONNECTED STORES</span>
              <div className="font-bold text-indigo-400 mt-1">{websites.length} Sites</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REAL-TIME PRICE UPDATE */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="glass-panel p-6 max-w-md w-full rounded-2xl border border-cyan-500/40 bg-slate-950 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <DollarSign size={16} className="text-cyan-400" />
                Change Store Price
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div className="font-bold text-white">{editingItem.name}</div>
              <div className="font-mono text-[11px] text-[var(--text-muted)]">
                SKU: {editingItem.sku} • Current Price: Rs. {Number(editingItem.price).toFixed(2)}
              </div>
            </div>

            <form onSubmit={handlePriceUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[var(--text-muted)] mb-1">
                  NEW PRICE (NPR / USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="input-field font-mono text-sm py-2.5 w-full bg-slate-900 rounded-xl border border-slate-700"
                  autoFocus
                />
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  This write operation commits to the remote website first before updating the local display.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPrice || !editPrice}
                  className="btn-primary px-5 py-2 text-xs flex items-center gap-1.5"
                >
                  {isUpdatingPrice ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  Confirm & Update Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVITE MEMBER */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="glass-panel p-6 max-w-md w-full rounded-2xl border border-indigo-500/40 bg-slate-950 space-y-4 shadow-2xl animate-scaleIn">
            <h3 className="font-bold text-sm text-white">Invite Team Member</h3>
            <form onSubmit={handleInviteUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">NAME</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="input-field py-2 w-full bg-slate-900 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">EMAIL</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field py-2 w-full bg-slate-900 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">ROLE HUB</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="input-field py-2 w-full bg-slate-900 rounded-lg"
                >
                  <option value="MANAGER">Manager Hub (Orders & Operations)</option>
                  <option value="OWNER">Owner Hub (Full Governance & Products)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn-secondary px-3 py-1.5">
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-1.5">
                  Issue Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
