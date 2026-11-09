import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Zap,
  ShoppingCart,
  Package,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Download,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DiscoveredFeature, FeatureStatus } from '../types';
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

export const ManagerHubScreen: React.FC<Props> = ({
  features,
  userRole,
  onInspect,
  onExecute,
  onOpenFallback,
  onTriggerDestructive,
  onUpdateFeatureStatus
}) => {
  const [selectedTab, setSelectedTab] = useState<'ORDERS' | 'CATALOG' | 'CANVAS' | 'ALL'>('ORDERS');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Live Backend Manager Data State
  const [orders, setOrders] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fulfill Modal State
  const [fulfillOrder, setFulfillOrder] = useState<any | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  // Add SKU Item Modal State
  const [showAddSkuModal, setShowAddSkuModal] = useState(false);
  const [skuName, setSkuName] = useState('');
  const [skuCode, setSkuCode] = useState('');
  const [skuCategory, setSkuCategory] = useState('Hardware');
  const [skuPrice, setSkuPrice] = useState('499.00');
  const [skuStock, setSkuStock] = useState('25');

  const tester = new FeatureSpecificationTester();

  const fetchManagerData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [oRes, cRes] = await Promise.all([
        api.get<any[]>(`/api/v1/orders/feed?status=${orderStatusFilter}&search=${orderSearch}`),
        api.get<any[]>(`/api/v1/catalog/items?search=${catalogSearch}`)
      ]);
      setOrders(oRes.data);
      setCatalog(cRes.data);
    } catch (err: any) {
      setApiError(err.message || 'Failed to fetch manager hub feed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerData();
  }, [orderStatusFilter, orderSearch, catalogSearch]);

  const handleFulfillOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fulfillOrder) return;
    try {
      await api.post(`/api/v1/orders/${fulfillOrder.id}/fulfill`, { trackingNumber, confirm: true });
      setFulfillOrder(null);
      setTrackingNumber('');
      fetchManagerData();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleAddSkuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuName || !skuCode) return;
    try {
      await api.post('/api/v1/catalog/items', {
        name: skuName,
        sku: skuCode,
        category: skuCategory,
        price: Number(skuPrice),
        stock: Number(skuStock),
        minThreshold: 5
      });
      setShowAddSkuModal(false);
      setSkuName('');
      setSkuCode('');
      fetchManagerData();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleStockUpdate = async (itemId: string, newStock: number) => {
    try {
      const target: any = catalog.find((c: any) => c.id === itemId);
      if (target?.websiteId && !window.confirm(`Change stock of "${target.name}" to ${newStock} on the connected website?`)) return;
      await api.patch(`/api/v1/catalog/items/${itemId}/stock`, { stock: newStock, confirm: true });
      fetchManagerData();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleExportCsv = () => {
    const csvRows = ['Order ID,Customer,Items,Total,Status,Tracking,Address'];
    orders.forEach((o) => {
      csvRows.push(`"${o.id}","${o.customer}",${o.itemsCount},$${o.totalAmount},"${o.status}","${o.trackingNumber || ''}","${o.shippingAddress}"`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_dispatch_feed_${Date.now()}.csv`;
    a.click();
  };

  const handleTestSpec = async (feat: DiscoveredFeature) => {
    const summary = await tester.testFeatureCompleteness(feat, userRole);
    if (summary.passed && onUpdateFeatureStatus) {
      onUpdateFeatureStatus(feat.id, 'FULLY_INTEGRATED');
    }
    alert(`Spec Test Result for ${feat.name}:\nScore: ${summary.score}%\nPassed: ${summary.passed ? 'YES (FULLY INTEGRATED)' : 'NO'}`);
  };

  const managerFeatures = features.filter((f) => f.hubId === 'hub_manager' || f.hubId === 'hub_general');
  const filteredFeatures = managerFeatures.filter((f) => {
    if (statusFilter !== 'ALL' && f.implementationStatus !== statusFilter) return false;
    if (selectedTab === 'ORDERS') return f.route.includes('order');
    if (selectedTab === 'CATALOG') return f.route.includes('catalog');
    if (selectedTab === 'CANVAS') return f.chosenOption === 'WEBVIEW_FALLBACK' || f.route.includes('builder');
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Briefcase className="text-cyan-400" />
            Operational Manager Hub — Orders & Inventory Feed
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            SitePulse workspace data. Changes here are stored in SitePulse only and are <strong>not</strong> sent to a connected website until a platform connector is enabled for it.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchManagerData} className="btn-secondary px-3 py-1.5 text-xs">
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <span className="px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold">
            Role Scope: MANAGER OPS
          </span>
        </div>
      </div>

      {/* Feature Tracker Widget for Manager Hub (Requirement 10) */}
      <FeatureTrackerWidget
        hubName="Manager Hub"
        features={managerFeatures}
        onFilterStatus={(st) => setStatusFilter(st)}
        onInspectFeature={onInspect}
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-[var(--border-color)] gap-2 text-xs">
        {[
          { id: 'ORDERS', label: `Live Orders Feed (${orders.length})` },
          { id: 'CATALOG', label: `Inventory SKU Catalog (${catalog.length})` },
          { id: 'CANVAS', label: `Interactive Page Canvas (WebView)` },
          { id: 'ALL', label: `All Manager Features (${managerFeatures.length})` }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTab(t.id as any)}
            className={`py-2.5 px-4 font-semibold border-b-2 transition-colors ${
              selectedTab === t.id
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error Alert */}
      {apiError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{apiError}</span>
          </div>
          <button onClick={() => setApiError(null)} className="text-[var(--text-muted)] hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* 1. ORDERS FEED TAB */}
      {selectedTab === 'ORDERS' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <ShoppingCart size={16} className="text-cyan-400" />
                  Live Customer Orders & Dispatch Pipeline
                </h3>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Endpoint: GET /api/v1/orders/feed · POST /api/v1/orders/:id/fulfill
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleExportCsv} className="btn-secondary text-xs px-3 py-1.5">
                  <Download size={13} /> Export CSV
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 text-xs">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Filter by Order ID or customer name..."
                  className="input-field pl-9 text-xs"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="input-field w-auto text-xs"
              >
                <option value="ALL">All Order Statuses</option>
                <option value="NEW">NEW Orders</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            {/* Orders Feed Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">ORDER ID</th>
                    <th className="py-2.5 px-4">CUSTOMER</th>
                    <th className="py-2.5 px-4">ITEMS</th>
                    <th className="py-2.5 px-4">TOTAL</th>
                    <th className="py-2.5 px-4">STATUS</th>
                    <th className="py-2.5 px-4">TRACKING #</th>
                    <th className="py-2.5 px-4 text-right">FULFILLMENT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] font-mono">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-[var(--bg-surface)]">
                      <td className="py-3 px-4 font-bold text-cyan-400">{o.id}</td>
                      <td className="py-3 px-4 font-sans font-medium text-[var(--text-primary)]">{o.customer}</td>
                      <td className="py-3 px-4 text-slate-400">{o.itemsCount} pcs</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">${o.totalAmount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          o.status === 'SHIPPED' ? 'bg-emerald-500/20 text-emerald-400' :
                          o.status === 'PROCESSING' ? 'bg-cyan-500/20 text-cyan-400' :
                          o.status === 'NEW' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)] font-mono text-[11px]">
                        {o.trackingNumber || 'Pending'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {o.status !== 'SHIPPED' && o.status !== 'CANCELLED' ? (
                          <button
                            onClick={() => {
                              setFulfillOrder(o);
                              setTrackingNumber(`TRK-EXPRESS-${Math.floor(1000000 + Math.random() * 9000000)}`);
                            }}
                            className="btn-primary px-3 py-1 text-[11px]"
                          >
                            Fulfill Order
                          </button>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-sans">Fulfilled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. CATALOG SKU TAB */}
      {selectedTab === 'CATALOG' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Package size={16} className="text-cyan-400" />
                  Product Catalog & Stock Threshold Management
                </h3>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Endpoint: GET /api/v1/catalog/items · PATCH /api/v1/catalog/items/:id/stock
                </span>
              </div>

              <button onClick={() => setShowAddSkuModal(true)} className="btn-primary text-xs px-4 py-2">
                <Plus size={14} /> Add Product SKU
              </button>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {catalog.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-cyan-400 font-bold">{item.sku}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        item.status === 'IN_STOCK' ? 'bg-emerald-500/20 text-emerald-400' :
                        item.status === 'LOW_STOCK' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-[var(--text-primary)]">{item.name}</h4>
                    <div className="text-[11px] font-mono text-[var(--text-muted)] mt-0.5">{item.category}</div>
                    <div className="text-sm font-bold text-emerald-400 mt-2">${item.price.toFixed(2)}</div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
                    <span className="font-mono text-[11px] text-[var(--text-secondary)]">Stock: {item.stock}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStockUpdate(item.id, Math.max(0, item.stock - 1))}
                        className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono hover:bg-slate-800"
                      >
                        -
                      </button>
                      <button
                        onClick={() => handleStockUpdate(item.id, item.stock + 5)}
                        className="px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono hover:bg-slate-800 text-cyan-400"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Render All Manager Features Dynamic Cards Grid */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-bold text-[var(--text-muted)] font-mono tracking-wider">
          DISCOVERED MANAGER HUB MODULES & DYNAMIC FEATURE CARDS ({filteredFeatures.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFeatures.map((feat) => (
            <div key={feat.id} className="space-y-2">
              <DynamicFeatureRenderer
                feature={feat}
                userRole={userRole}
                onTriggerDestructive={onTriggerDestructive}
                onOpenFallback={onOpenFallback}
                onInspect={onInspect}
                onActionComplete={(msg) => alert(msg)}
              />
              <button
                onClick={() => handleTestSpec(feat)}
                className="w-full btn-secondary text-[11px] py-1 text-[var(--text-muted)] hover:text-white"
              >
                Run Spec Completeness Test Suite
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Fulfill Order Modal */}
      {fulfillOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Fulfill Order {fulfillOrder.id}</h3>
            <p className="text-xs text-[var(--text-secondary)]">Customer: {fulfillOrder.customer}</p>

            <form onSubmit={handleFulfillOrderSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">CARRIER TRACKING NUMBER</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="input-field font-mono"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2">
                  Confirm Shipment & Notify
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillOrder(null)}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product SKU Modal */}
      {showAddSkuModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Add Product SKU to Catalog</h3>
            <form onSubmit={handleAddSkuSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">PRODUCT NAME</label>
                <input
                  type="text"
                  value={skuName}
                  onChange={(e) => setSkuName(e.target.value)}
                  placeholder="e.g. Fiber Optic Transceiver"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">SKU CODE</label>
                <input
                  type="text"
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                  placeholder="HW-FIBER-01"
                  className="input-field font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">PRICE ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={skuPrice}
                    onChange={(e) => setSkuPrice(e.target.value)}
                    className="input-field font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">INITIAL STOCK</label>
                  <input
                    type="number"
                    value={skuStock}
                    onChange={(e) => setSkuStock(e.target.value)}
                    className="input-field font-mono"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2">
                  Save SKU
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSkuModal(false)}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
