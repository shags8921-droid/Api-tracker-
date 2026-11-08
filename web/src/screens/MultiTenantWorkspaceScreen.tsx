import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Users,
  CreditCard,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
  ExternalLink,
  ChevronRight,
  Globe,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { OrganisationTenant, SubscriptionTier } from '../types/saas';
import { platform } from '../services/platform';

interface Props {
  activeOrgId: string;
  onSwitchOrg: (orgId: string) => void;
  onNavigateToOnboarding: () => void;
}

export const MultiTenantWorkspaceScreen: React.FC<Props> = ({
  activeOrgId,
  onSwitchOrg,
  onNavigateToOnboarding
}) => {
  const [organisations, setOrganisations] = useState<OrganisationTenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'WORKSPACES' | 'PLANS' | 'USAGE' | 'SETTINGS'>('WORKSPACES');

  // Create Org Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCategory, setNewOrgCategory] = useState<any>('RETAIL');
  const [newOrgTier, setNewOrgTier] = useState<SubscriptionTier>('STARTER');

  const fetchOrganisations = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<OrganisationTenant[]>('/api/v1/saas/organisations');
      setOrganisations(res.data);
    } catch (e) {
      console.error('Failed to load organisations', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganisations();
  }, []);

  const activeOrg = organisations.find((o) => o.id === activeOrgId) || organisations[0];

  const handleCreateOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      const res = await api.post<any>('/api/v1/saas/organisations/register', {
        name: newOrgName,
        category: newOrgCategory,
        tier: newOrgTier
      });
      setShowCreateModal(false);
      setNewOrgName('');
      platform.notification.showToast(`Organisation ${res.data.organisation.name} registered successfully!`, 'SUCCESS');
      await fetchOrganisations();
      onSwitchOrg(res.data.organisation.id);
    } catch (err: any) {
      alert(`Registration error: ${err.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Building2 className="text-cyan-400" />
            Multi-Tenant SaaS Workspaces & Subscriptions
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              ACTIVE ORG: {activeOrg?.name || 'Loading...'}
            </span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Complete workspace isolation, tenant-specific website connections, custom subscription tiers, and team permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
          >
            <Plus size={14} />
            New Business Workspace
          </button>
          <button
            onClick={onNavigateToOnboarding}
            className="btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
          >
            <Sparkles size={14} className="text-cyan-400" />
            Guided Onboarding
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2 overflow-x-auto">
        {[
          { id: 'WORKSPACES', label: 'Registered Workspaces' },
          { id: 'PLANS', label: 'Subscription Plans & Tiers' },
          { id: 'USAGE', label: 'Resource & AI Quota Usage' },
          { id: 'SETTINGS', label: 'Organisation Settings' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === t.id
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: WORKSPACES */}
      {activeTab === 'WORKSPACES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organisations.map((org) => {
            const isSelected = org.id === activeOrg?.id;
            return (
              <div
                key={org.id}
                className={`glass-panel p-5 space-y-3 transition-all ${
                  isSelected ? 'border-2 border-cyan-500 shadow-lg shadow-cyan-500/10' : 'hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[var(--text-primary)]">{org.name}</h3>
                      {isSelected && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      Tenant ID: {org.id} · Category: {org.category}
                    </span>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    {org.subscription.tier}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 bg-[var(--bg-secondary)] p-2.5 rounded-xl font-mono">
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">WEBSITES</span>
                    <span>1 / {org.subscription.limits.maxWebsites}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">AI USAGE</span>
                    <span>{org.usage.aiRequestsThisMonth} / {org.subscription.limits.monthlyAiRequests}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block text-[10px]">STORAGE</span>
                    <span>{org.usage.storageUsedMb} MB</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {!isSelected ? (
                    <button
                      onClick={() => {
                        onSwitchOrg(org.id);
                        platform.notification.showToast(`Switched active workspace to ${org.name}`, 'INFO');
                      }}
                      className="btn-secondary px-3 py-1 text-xs"
                    >
                      Switch to Workspace
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle2 size={14} /> Connected to this workspace
                    </span>
                  )}

                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    Renews: {new Date(org.subscription.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: PLANS & TIERS */}
      {activeTab === 'PLANS' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {[
            {
              tier: 'FREE',
              price: '$0',
              period: '/mo',
              desc: 'Testing and initial website discovery evaluation',
              websites: '1 Website',
              users: '2 Team Members',
              ai: '250 AI Requests / mo',
              support: 'Community Support'
            },
            {
              tier: 'STARTER',
              price: '$49',
              period: '/mo',
              desc: 'Small operational business with single online store',
              websites: '2 Websites',
              users: '5 Team Members',
              ai: '1,000 AI Requests / mo',
              support: 'Standard Webhooks'
            },
            {
              tier: 'PROFESSIONAL',
              price: '$149',
              period: '/mo',
              desc: 'Growing multi-channel enterprise with full hub replication',
              websites: '5 Websites',
              users: '15 Team Members',
              ai: '5,000 AI Requests / mo',
              support: 'Priority Support & Reports'
            },
            {
              tier: 'BUSINESS',
              price: '$399',
              period: '/mo',
              desc: 'High-volume distributed operations across platforms',
              websites: '25 Websites',
              users: '50 Team Members',
              ai: '25,000 AI Requests / mo',
              support: 'Dedicated Technical SLA'
            }
          ].map((plan, i) => (
            <div
              key={i}
              className={`glass-panel p-5 space-y-4 flex flex-col justify-between ${
                activeOrg?.subscription.tier === plan.tier ? 'border-2 border-emerald-500' : ''
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[var(--text-primary)]">{plan.tier}</span>
                  {activeOrg?.subscription.tier === plan.tier && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                      CURRENT
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">{plan.desc}</p>

                <div className="space-y-1.5 pt-3 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 size={13} className="text-emerald-400" /> {plan.websites}
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 size={13} className="text-emerald-400" /> {plan.users}
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 size={13} className="text-emerald-400" /> {plan.ai}
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <CheckCircle2 size={13} className="text-emerald-400" /> {plan.support}
                  </div>
                </div>
              </div>

              <button
                disabled={activeOrg?.subscription.tier === plan.tier}
                className="btn-primary w-full py-2 text-xs disabled:opacity-50"
              >
                {activeOrg?.subscription.tier === plan.tier ? 'Current Plan' : `Upgrade to ${plan.tier}`}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: USAGE */}
      {activeTab === 'USAGE' && activeOrg && (
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <BarChart3 size={16} className="text-cyan-400" />
            Resource Quota & Subscription Usage ({activeOrg.name})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs font-mono">
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
              <span className="text-[var(--text-muted)] block text-[10px]">MONTHLY AI AGENT QUOTA</span>
              <div className="text-2xl font-bold text-cyan-400">
                {activeOrg.usage.aiRequestsThisMonth} / {activeOrg.subscription.limits.monthlyAiRequests}
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-500 h-full"
                  style={{
                    width: `${Math.min(100, (activeOrg.usage.aiRequestsThisMonth / activeOrg.subscription.limits.monthlyAiRequests) * 100)}%`
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-400">
                {activeOrg.subscription.limits.monthlyAiRequests - activeOrg.usage.aiRequestsThisMonth} calls remaining this cycle
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
              <span className="text-[var(--text-muted)] block text-[10px]">TOTAL API INGESTION CALLS</span>
              <div className="text-2xl font-bold text-emerald-400">
                {activeOrg.usage.totalApiRequests.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Authoritative queries to live orders, catalog feeds, and webhook routing.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
              <span className="text-[var(--text-muted)] block text-[10px]">ISOLATED TENANT STORAGE</span>
              <div className="text-2xl font-bold text-indigo-400">
                {activeOrg.usage.storageUsedMb} MB / {activeOrg.subscription.limits.storageMb} MB
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Includes discovered OpenAPI specifications, visual tokens, and configuration snapshots.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === 'SETTINGS' && activeOrg && (
        <div className="glass-panel p-6 space-y-4 text-xs">
          <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck size={16} className="text-cyan-400" />
            Organisation Settings & Data Isolation Controls
          </h3>

          <div className="space-y-3 max-w-xl">
            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">Business Name</label>
              <input type="text" readOnly value={activeOrg.name} className="input-field w-full text-xs" />
            </div>

            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">Unique Tenant ID</label>
              <input type="text" readOnly value={activeOrg.id} className="input-field w-full text-xs font-mono text-cyan-400" />
            </div>

            <div>
              <label className="text-[11px] text-[var(--text-muted)] block mb-1">Reporting Currency</label>
              <input type="text" readOnly value={activeOrg.settings.currency} className="input-field w-full text-xs font-mono" />
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-emerald-500/30 text-[11px] text-emerald-300">
              ✓ Tenant Isolation Verified: Queries targeting this workspace automatically filter by tenant ID `{activeOrg.id}` on the server layer.
            </div>
          </div>
        </div>
      )}

      {/* Create Org Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Building2 size={16} className="text-cyan-400" />
              Register New Organisation Workspace
            </h3>

            <form onSubmit={handleCreateOrgSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">Business Legal / Operating Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Logistics"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">Industry Category</label>
                <select
                  value={newOrgCategory}
                  onChange={(e) => setNewOrgCategory(e.target.value as any)}
                  className="input-field w-full text-xs bg-[var(--bg-surface)]"
                >
                  <option value="RETAIL">E-Commerce & Retail</option>
                  <option value="LOGISTICS">Logistics & Supply Chain</option>
                  <option value="SAAS">Technology & SaaS</option>
                  <option value="MANUFACTURING">Manufacturing</option>
                  <option value="HEALTHCARE">Healthcare & Services</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-[var(--text-muted)] block mb-1">Subscription Tier</label>
                <select
                  value={newOrgTier}
                  onChange={(e) => setNewOrgTier(e.target.value as any)}
                  className="input-field w-full text-xs bg-[var(--bg-surface)]"
                >
                  <option value="FREE">Free Tier (1 Website, 2 Users)</option>
                  <option value="STARTER">Starter Tier (2 Websites, 5 Users)</option>
                  <option value="PROFESSIONAL">Professional Tier (5 Websites, 15 Users)</option>
                  <option value="BUSINESS">Business Enterprise (25 Websites, 50 Users)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary px-4 py-1.5 text-xs">
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
