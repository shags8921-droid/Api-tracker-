import React from 'react';
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Shield,
  Layers,
  FileCode,
  Globe,
  Lock,
  Image as ImageIcon
} from 'lucide-react';
import { TransparentCoverageReport, DiscoveredFeature } from '../types';
import { ScreenId } from '../components/Navigation';

interface Props {
  report: TransparentCoverageReport | null;
  features: DiscoveredFeature[];
  onNavigate: (screen: ScreenId) => void;
}

export const DiscoveryResultsScreen: React.FC<Props> = ({ report, features, onNavigate }) => {
  if (!report) {
    return (
      <div className="p-12 text-center text-[var(--text-muted)] space-y-4">
        <p>No discovery run results found. Please execute the discovery pipeline first.</p>
        <button onClick={() => onNavigate('discovery')} className="btn-primary">
          Start Discovery
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <FileCheck className="text-cyan-400" />
            Website Discovery Inventory & Completeness Audit
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Verified resource breakdown from the 11-stage self-discovery engine.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate('agent')} className="btn-primary px-4 py-2 text-xs">
            Open AI Agent Dashboard
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Transparent Completeness Score Card (Requirement 9A & Requirement 9C) */}
      <div className="glass-panel p-6 border-cyan-500/30 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider block mb-1">
              TRANSPARENT DISCOVERY COMPLETENESS RATING
            </span>
            <div className="text-3xl font-extrabold text-cyan-400 font-mono">
              {report.overallCompletenessPct}%{' '}
              <span className="text-xs text-[var(--text-secondary)] font-normal font-sans">
                (Verified Coverage Ceiling)
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xl leading-relaxed">
              {report.confidenceReasoning}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs max-w-xs">
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <Info size={14} />
              Requirement 9 Verification Rule
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Completeness is never marked 100% unless target website host supplies verified exhaustive evidence proofs.
            </p>
          </div>
        </div>

        {/* Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-color)]">
          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="text-[10px] text-[var(--text-muted)] font-mono">PAGES DISCOVERED</div>
            <div className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
              {report.pagesDiscovered}{' '}
              {report.totalPagesExpected && (
                <span className="text-xs text-[var(--text-muted)] font-normal font-mono">
                  / {report.totalPagesExpected}
                </span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="text-[10px] text-[var(--text-muted)] font-mono">REST OPERATIONS</div>
            <div className="text-lg font-bold text-cyan-400 mt-0.5">{report.apiOperationsVerified} verified</div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="text-[10px] text-[var(--text-muted)] font-mono">RBAC SCOPES</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{report.permissionsMapped} mapped</div>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="text-[10px] text-[var(--text-muted)] font-mono">ASSETS INDEXED</div>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">{report.assetsIdentified} assets</div>
          </div>
        </div>
      </div>

      {/* Classification Strategy Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
          <div className="text-xs font-bold text-emerald-400 mb-1">Native Ready</div>
          <div className="text-2xl font-bold font-mono text-emerald-300">{report.nativeReadyCount}</div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">Reconstructed via React controls</p>
        </div>

        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/25">
          <div className="text-xs font-bold text-cyan-400 mb-1">WebView Fallback</div>
          <div className="text-2xl font-bold font-mono text-cyan-300">{report.webViewFallbackCount}</div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">Embedded authenticated canvas</p>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <div className="text-xs font-bold text-amber-400 mb-1">Needs Config</div>
          <div className="text-2xl font-bold font-mono text-amber-300">{report.needsConfigCount}</div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">Missing payload documentation</p>
        </div>

        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25">
          <div className="text-xs font-bold text-rose-400 mb-1">Unavailable / 404</div>
          <div className="text-2xl font-bold font-mono text-rose-300">{report.unavailableCount}</div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">Retired server endpoints</p>
        </div>
      </div>

      {/* Discovery Audit Inventory Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[var(--text-primary)] font-mono">
            DISCOVERED RESOURCE INVENTORY AUDIT
          </h3>
          <span className="text-xs text-[var(--text-muted)] font-mono">{features.length} features indexed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono text-[10px]">
              <tr>
                <th className="py-2.5 px-4">METHOD</th>
                <th className="py-2.5 px-4">ROUTE</th>
                <th className="py-2.5 px-4">FEATURE</th>
                <th className="py-2.5 px-4">HUB</th>
                <th className="py-2.5 px-4">SOURCE</th>
                <th className="py-2.5 px-4 text-right">CONFIDENCE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {features.map((feat) => {
                const method = feat.apiOperations[0]?.method || (feat.isDestructive ? 'DELETE' : 'GET');
                return (
                  <tr key={feat.id} className="hover:bg-[var(--bg-surface)] transition-colors">
                    <td className="py-2.5 px-4 font-mono font-bold text-[10px] text-cyan-400">{method}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-300">{feat.route}</td>
                    <td className="py-2.5 px-4 font-medium text-[var(--text-primary)]">{feat.name}</td>
                    <td className="py-2.5 px-4 text-slate-400">
                      {feat.hubId === 'hub_owner' ? 'Owner Hub' : 'Manager Hub'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">{feat.discoverySource}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-400">{feat.confidenceScore}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
