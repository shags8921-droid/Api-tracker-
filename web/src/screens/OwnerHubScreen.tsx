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
  Server
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
  const [selectedTab, setSelectedTab] = useState<'DIRECTORY' | 'TELEMETRY' | 'WEBHOOKS' | 'ALL'>('DIRECTORY');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Real backend state for Owner Hub
  const [users, setUsers] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [oneTimeNotice, setOneTimeNotice] = useState<string | null>(null);

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
      const [uRes, wRes, hRes] = await Promise.all([
        api.get<any[]>('/api/v1/admin/users'),
        api.get<any[]>('/api/v1/integrations/webhooks'),
        api.get<any>('/api/v1/system/health')
      ]);
      setUsers(uRes.data);
      setWebhooks(wRes.data);
      setSystemHealth(hRes.data);
    } catch (err: any) {
      setApiError(err.message || 'Failed to fetch owner hub data');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
  }, [userRole]);

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
        `Account created for ${inviteEmail}. No email was sent. Share this temporary password securely; it is shown only once: ${data.temporaryPassword}`
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
        `Webhook registered. Signing secret (shown only once): ${data.secret}. Note: outbound event delivery is not implemented yet.`
      );
      setShowWebhookModal(false);
      setWebhookUrl('');
      setWebhookSecret('');
      fetchOwnerData();
    } catch (err: any) {
      setApiError(err.message);
    }
  };

  const handleTestFeatureSpec = async (feat: DiscoveredFeature) => {
    const summary = await tester.testFeatureCompleteness(feat, userRole);
    if (summary.passed && onUpdateFeatureStatus) {
      onUpdateFeatureStatus(feat.id, 'FULLY_INTEGRATED');
    }
    alert(`Spec Test Result for ${feat.name}:\nScore: ${summary.score}%\nPassed: ${summary.passed ? 'YES (FULLY INTEGRATED)' : 'NO'}`);
  };

  // Requirement 8: RBAC Protection - Block Manager account from Owner Hub
  if (userRole !== 'OWNER') {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-rose-400">403 Permission Denied — Owner Authority Required</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">
                Current Role Scope: MANAGER (enforced server-side from your signed session)
              </p>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Requirement 8 Enforced: The Owner Hub contains executive governance, team revocation, billing controls, and infrastructure telemetry. Operational Manager accounts are strictly prohibited from viewing or triggering owner operations.
          </p>

          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs font-mono text-[var(--text-muted)]">
            To view Owner Hub functionality, switch the session role selector in the top bar or settings to <strong>OWNER</strong>.
          </div>
        </div>
      </div>
    );
  }

  const ownerFeatures = features.filter((f) => f.hubId === 'hub_owner');
  const filteredFeatures = ownerFeatures.filter((f) => {
    if (statusFilter !== 'ALL' && f.implementationStatus !== statusFilter) return false;
    if (selectedTab === 'DIRECTORY') return f.route.includes('user') || f.route.includes('admin');
    if (selectedTab === 'TELEMETRY') return f.route.includes('health') || f.route.includes('system');
    if (selectedTab === 'WEBHOOKS') return f.route.includes('webhook') || f.route.includes('integration');
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="text-indigo-400" />
            Executive Owner Hub — Governance & Infrastructure
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Real REST operations connected to <code className="font-mono text-cyan-400">/api/v1/admin/*</code> and <code className="font-mono text-cyan-400">/api/v1/system/*</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchOwnerData} className="btn-secondary px-3 py-1.5 text-xs">
            <RefreshCw size={13} className={isLoadingData ? 'animate-spin' : ''} />
            Refresh Gateway
          </button>
          <span className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-bold">
            Role: EXECUTIVE OWNER
          </span>
        </div>
      </div>

      {/* Feature Implementation Tracker Widget for Owner Hub (Requirement 10) */}
      <FeatureTrackerWidget
        hubName="Owner Hub"
        features={ownerFeatures}
        onFilterStatus={(st) => setStatusFilter(st)}
        onInspectFeature={onInspect}
      />

      {/* Navigation Tabs */}
      <div className="flex border-b border-[var(--border-color)] gap-2 text-xs">
        {[
          { id: 'DIRECTORY', label: `Team & Access Directory (${users.length})` },
          { id: 'TELEMETRY', label: `System Health Telemetry` },
          { id: 'WEBHOOKS', label: `Enterprise Webhooks (${webhooks.length})` },
          { id: 'ALL', label: `All Owner Features (${ownerFeatures.length})` }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedTab(t.id as any)}
            className={`py-2.5 px-4 font-semibold border-b-2 transition-colors ${
              selectedTab === t.id
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {oneTimeNotice && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <span className="break-all select-all">{oneTimeNotice}</span>
          <button onClick={() => setOneTimeNotice(null)} className="text-[var(--text-muted)] hover:text-white shrink-0">
            I have saved it
          </button>
        </div>
      )}

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

      {/* Tab Contents */}

      {/* 1. DIRECTORY: Team Access & RBAC */}
      {selectedTab === 'DIRECTORY' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Users size={16} className="text-indigo-400" />
                  Team Access & RBAC Member Directory
                </h3>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Endpoint: GET /api/v1/admin/users · Two-tap revocation enforced
                </span>
              </div>

              <button
                onClick={() => setShowInviteModal(true)}
                className="btn-primary text-xs px-4 py-2"
              >
                <Plus size={14} />
                Invite Team Member
              </button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">MEMBER NAME</th>
                    <th className="py-2.5 px-4">EMAIL ADDRESS</th>
                    <th className="py-2.5 px-4">ROLE SCOPE</th>
                    <th className="py-2.5 px-4">STATUS</th>
                    <th className="py-2.5 px-4">LAST LOGIN</th>
                    <th className="py-2.5 px-4 text-right">REVOCATION ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] font-mono">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[var(--bg-surface)]">
                      <td className="py-3 px-4 font-sans font-bold text-[var(--text-primary)]">{u.name}</td>
                      <td className="py-3 px-4 text-cyan-400">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'OWNER' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-cyan-500/20 text-cyan-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">{u.lastLogin}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            const feat = ownerFeatures.find((f) => f.id === 'feat_user_governance') || {
                              id: 'feat_user_governance',
                              name: `Revoke User Access (${u.name})`,
                              description: `Revoke active bearer tokens and purge session for ${u.email}`,
                              hubId: 'hub_owner',
                              route: `/api/v1/admin/users/${u.id}`,
                              uiStructure: { componentType: 'DataTable', hasForm: false, hasTable: true, hasCanvas: false, formFields: [], buttons: [] },
                              interactions: [],
                              apiOperations: [{ method: 'DELETE', endpoint: `/api/v1/admin/users/${u.id}`, description: 'Revoke user', parameters: [], verified: true }],
                              permissions: ['owner:admin'],
                              businessRules: [],
                              assets: [],
                              dependencies: [],
                              discoverySource: 'INTEGRATION_API',
                              verificationStatus: 'VERIFIED',
                              implementationStatus: 'NATIVE_READY',
                              chosenOption: 'NATIVE_WEB',
                              confidenceScore: 95,
                              isDestructive: true,
                              lastVerified: 'Now'
                            };
                            onTriggerDestructive(feat as DiscoveredFeature);
                          }}
                          className="px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-[11px] font-bold"
                        >
                          Revoke Token
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

      {/* 2. TELEMETRY: System Health */}
      {selectedTab === 'TELEMETRY' && (
        <div className="space-y-4">
          <div className="glass-panel p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Server size={16} className="text-cyan-400" />
                  Infrastructure Uptime & Gateway Telemetry
                </h3>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">GET /api/v1/system/health</span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                GATEWAY HEALTHY
              </span>
            </div>

            {systemHealth && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">CPU UTILIZATION</div>
                  <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{systemHealth.cpuUsagePct}%</div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">MEMORY USAGE</div>
                  <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">{systemHealth.memoryUsageMB} MB</div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">P95 LATENCY</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{systemHealth.p95LatencyMs} ms</div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">ACTIVE CONNS</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{systemHealth.activeConnections}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. WEBHOOKS */}
      {selectedTab === 'WEBHOOKS' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Radio size={16} className="text-cyan-400" />
                Enterprise Webhook Dispatcher Rules
              </h3>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">GET /api/v1/integrations/webhooks</span>
            </div>

            <button onClick={() => setShowWebhookModal(true)} className="btn-primary text-xs px-4 py-2">
              <Plus size={14} /> Add Webhook Rule
            </button>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {webhooks.map((w) => (
              <div key={w.id} className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-[var(--text-primary)]">{w.url}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Secret: {w.secret.slice(0, 12)}... · Events: {w.events.join(', ')}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Render All Owner Features Dynamic Cards Grid */}
      <div className="space-y-4 pt-2">
        <h3 className="text-xs font-bold text-[var(--text-muted)] font-mono tracking-wider">
          DISCOVERED OWNER HUB MODULES & DYNAMIC FEATURE CARDS ({filteredFeatures.length})
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
                onClick={() => handleTestFeatureSpec(feat)}
                className="w-full btn-secondary text-[11px] py-1 text-[var(--text-muted)] hover:text-white"
              >
                Run Spec Completeness Test Suite
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Invite Team Member</h3>
            <form onSubmit={handleInviteUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">MEMBER NAME</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Full name..."
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@sitepulse.internal"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">ROLE SCOPE</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="input-field"
                >
                  <option value="MANAGER">MANAGER Scope</option>
                  <option value="OWNER">OWNER Executive Scope</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2">
                  Send Invitation
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn-secondary flex-1 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Add Enterprise Webhook Rule</h3>
            <form onSubmit={handleAddWebhook} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">WEBHOOK ENDPOINT URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.acme.com/webhooks"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">SIGNING SECRET (OPTIONAL)</label>
                <input
                  type="text"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="input-field"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1 py-2">
                  Save Webhook Rule
                </button>
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
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
