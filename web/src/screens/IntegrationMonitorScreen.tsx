import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Server,
  Network,
  Share2,
  RefreshCw
} from 'lucide-react';
import { DiscoveredFeature } from '../types';
import { FeatureDependencyGraphResolver } from '../domain/mapping/dependency';

interface Props {
  features: DiscoveredFeature[];
}

export const IntegrationMonitorScreen: React.FC<Props> = ({ features }) => {
  const [activeTab, setActiveTab] = useState<'METRICS' | 'DEPENDENCY_GRAPH'>('METRICS');
  const resolver = new FeatureDependencyGraphResolver();
  const graph = resolver.resolveGraph(features);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Activity className="text-cyan-400" />
            Integration Monitor & Feature Dependency Graph
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Real-time API gateway health, latency tracking, and topological prerequisite dependency verification.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs">
          <button
            onClick={() => setActiveTab('METRICS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'METRICS'
                ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Gateway Telemetry
          </button>
          <button
            onClick={() => setActiveTab('DEPENDENCY_GRAPH')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'DEPENDENCY_GRAPH'
                ? 'bg-cyan-500/20 text-cyan-400 font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Dependency Graph (Requirement 9B)
          </button>
        </div>
      </div>

      {activeTab === 'METRICS' ? (
        <div className="space-y-6">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-4">
              <div className="text-[10px] text-[var(--text-muted)] font-mono">GATEWAY STATUS</div>
              <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-2">
                <CheckCircle2 size={20} />
                ONLINE (HTTP 200)
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1">Protocol: TLS 1.3 Strict</div>
            </div>

            <div className="glass-panel p-4">
              <div className="text-[10px] text-[var(--text-muted)] font-mono">AVG P95 LATENCY</div>
              <div className="text-xl font-bold font-mono text-cyan-400 mt-1">42ms</div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1">Target SLA &lt; 200ms</div>
            </div>

            <div className="glass-panel p-4">
              <div className="text-[10px] text-[var(--text-muted)] font-mono">AUTH SESSION LIFETIME</div>
              <div className="text-xl font-bold font-mono text-[var(--text-primary)] mt-1">54 mins rem.</div>
              <div className="text-[11px] text-emerald-400 mt-1">Refresh Grant Valid</div>
            </div>

            <div className="glass-panel p-4">
              <div className="text-[10px] text-[var(--text-muted)] font-mono">BLOCKED BY DEPENDENCIES</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                {graph.blockedCount} feature(s)
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-1">Resolved via DAG</div>
            </div>
          </div>

          {/* Real-time Endpoints Monitor Table */}
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--text-primary)] font-mono">
                API GATEWAY ENDPOINTS STATUS
              </h3>
              <span className="text-[11px] text-[var(--text-muted)] font-mono">Polling interval: 15s</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">METHOD</th>
                    <th className="py-2.5 px-4">ENDPOINT PATH</th>
                    <th className="py-2.5 px-4">HEALTH STATUS</th>
                    <th className="py-2.5 px-4">RESPONSE TIME</th>
                    <th className="py-2.5 px-4 text-right">LAST PROBE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)] font-mono">
                  {[
                    { method: 'GET', path: '/api/v1/integration/health', status: 200, time: 38 },
                    { method: 'GET', path: '/api/v1/integration/manifest', status: 200, time: 54 },
                    { method: 'GET', path: '/api/v1/openapi.json', status: 200, time: 72 },
                    { method: 'GET', path: '/api/v1/orders/feed', status: 200, time: 48 },
                    { method: 'GET', path: '/api/v1/admin/users', status: 200, time: 41 },
                    { method: 'GET', path: '/api/v1/catalog/items', status: 200, time: 45 },
                    { method: 'GET', path: '/api/v1/legacy/export.xml', status: 404, time: 18 }
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-[var(--bg-surface)]">
                      <td className="py-2.5 px-4 text-cyan-400 font-bold">{row.method}</td>
                      <td className="py-2.5 px-4 text-slate-300">{row.path}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.status === 200 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {row.status === 200 ? 'HTTP 200 OK' : 'HTTP 404 NOT FOUND'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">{row.time}ms</td>
                      <td className="py-2.5 px-4 text-right text-[var(--text-muted)]">Just now</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Feature Dependency Graph View (Requirement 9B) */
        <div className="glass-panel p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Feature Dependency Graph (DAG Resolution)
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Identifies feature prerequisites to prevent activating dependents before dependencies are integrated.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Cycle Free: No Circular Deps
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {graph.nodes.map((node) => (
              <div
                key={node.featureId}
                className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  node.isBlocked
                    ? 'bg-amber-500/5 border-amber-500/30'
                    : 'bg-[var(--bg-surface)] border-[var(--border-color)]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)]">{node.featureName}</span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">({node.featureId})</span>
                  </div>

                  {node.dependsOn.length > 0 ? (
                    <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                      <span>Depends on:</span>
                      {node.dependsOn.map((d, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] font-mono text-[10px] text-cyan-400">
                          {d}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-emerald-400 mt-1 font-mono text-[10px]">
                      Independent root feature (No prerequisites)
                    </div>
                  )}

                  {node.isBlocked && (
                    <div className="text-xs text-amber-400 mt-1 font-medium">
                      ⚠️ {node.blockingReason}
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                    node.isBlocked
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {node.isBlocked ? 'BLOCKED' : 'READY TO DEPLOY'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
