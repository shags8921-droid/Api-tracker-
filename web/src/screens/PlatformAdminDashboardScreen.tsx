import React, { useState, useEffect } from 'react';
import {
  Server,
  Building2,
  Users,
  Activity,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Zap,
  BarChart2,
  Lock
} from 'lucide-react';
import { api } from '../services/api';
import { PlatformMetrics, SubscriptionTier } from '../types/saas';

export const PlatformAdminDashboardScreen: React.FC = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<PlatformMetrics>('/api/v1/saas/platform/metrics');
      setMetrics(res.data);
    } catch (e) {
      console.error('Failed to load platform metrics', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Server className="text-cyan-400" />
            Central Platform Administration Dashboard
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              SaaS OPERATOR CONSOLE
            </span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Global tenant fleet overview, subscription distributions, AI load telemetry, and cross-organization health.
          </p>
        </div>

        <button
          onClick={fetchMetrics}
          disabled={isLoading}
          className="btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Refresh Fleet Telemetry
        </button>
      </div>

      {/* Operator Fleet Scorecard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-l-4 border-cyan-500 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Total Organisations</span>
          <div className="text-2xl font-black text-cyan-400 flex items-center gap-2">
            {metrics?.totalOrganisations || 0}
            <Building2 size={20} />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">{metrics?.activeOrganisations || 0} active workspaces</p>
        </div>

        <div className="glass-panel p-4 border-l-4 border-emerald-500 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Active Subscriptions</span>
          <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
            {Object.values(metrics?.activeSubscriptions || {}).reduce((a, b) => a + b, 0)}
            <CreditCard size={18} />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">Paying SaaS subscribers</p>
        </div>

        <div className="glass-panel p-4 border-l-4 border-indigo-500 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Connected Websites Fleet</span>
          <div className="text-2xl font-black text-indigo-400 flex items-center gap-2">
            {metrics?.totalConnectedWebsites || 0}
            <Activity size={18} />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">Live authoritative gateways</p>
        </div>

        <div className="glass-panel p-4 border-l-4 border-amber-500 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Total Platform AI Calls</span>
          <div className="text-2xl font-black text-amber-400 flex items-center gap-2">
            {metrics?.totalPlatformAiCalls || 0}
            <Zap size={18} />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">Across all tenant assistants</p>
        </div>
      </div>

      {/* Subscription Breakdown & Recent Tenants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tier Distribution */}
        <div className="glass-panel p-5 space-y-3">
          <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <BarChart2 size={16} className="text-cyan-400" />
            Active Subscription Tier Distribution
          </h3>

          <div className="space-y-2 text-xs font-mono">
            {Object.entries(metrics?.activeSubscriptions || {}).map(([tier, count]) => (
              <div key={tier} className="p-3 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-between">
                <span className="font-bold text-slate-300">{tier}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold">
                  {count} Active Workspaces
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tenant Registry */}
        <div className="glass-panel p-5 space-y-3">
          <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <Building2 size={16} className="text-indigo-400" />
            Recently Registered Organisations
          </h3>

          <div className="space-y-2 text-xs">
            {(metrics?.recentTenants || []).map((tenant) => (
              <div
                key={tenant.id}
                className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-[var(--text-primary)] block">{tenant.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">ID: {tenant.id}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  {tenant.tier}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="glass-panel p-4 border-l-4 border-emerald-500 text-xs flex items-center gap-3">
        <Lock size={18} className="text-emerald-400 shrink-0" />
        <p className="text-[var(--text-secondary)]">
          <strong>SaaS Operator Privacy Guard:</strong> In accordance with multi-tenant zero-trust policy, platform administrators view aggregate telemetry and tenant health, but are strictly prohibited from querying customers' private sales, customer records, or credentials without audited authorized access.
        </p>
      </div>
    </div>
  );
};
