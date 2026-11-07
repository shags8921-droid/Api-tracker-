import React from 'react';
import { DiscoveredFeature } from '../types';
import {
  CheckCircle2,
  Clock,
  Globe,
  Wrench,
  XCircle,
  ShieldAlert,
  Layers,
  ChevronRight
} from 'lucide-react';

interface Props {
  hubName: string;
  features: DiscoveredFeature[];
  onFilterStatus?: (status: string) => void;
  onInspectFeature?: (feature: DiscoveredFeature) => void;
}

export const FeatureTrackerWidget: React.FC<Props> = ({
  hubName,
  features,
  onFilterStatus,
  onInspectFeature
}) => {
  const total = features.length;
  const nativeCount = features.filter(
    (f) => f.implementationStatus === 'FULLY_INTEGRATED' || f.implementationStatus === 'NATIVE_READY' || f.implementationStatus === 'NATIVE_IMPLEMENTED'
  ).length;
  const testingCount = features.filter((f) => f.implementationStatus === 'TESTING' || f.implementationStatus === 'ANALYSING').length;
  const webviewCount = features.filter((f) => f.implementationStatus === 'WEBVIEW_FALLBACK').length;
  const configCount = features.filter((f) => f.implementationStatus === 'NEEDS_CONFIGURATION').length;
  const unavailableCount = features.filter((f) => f.implementationStatus === 'UNAVAILABLE').length;
  const failedCount = features.filter((f) => f.implementationStatus === 'FAILED_VALIDATION').length;

  const pctNative = total > 0 ? Math.round((nativeCount / total) * 100) : 0;

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-cyan-400" />
          <h3 className="font-bold text-sm text-[var(--text-primary)]">
            {hubName} Implementation Tracker (Requirement 10)
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[var(--text-muted)]">Native Replication Rate:</span>
          <span className="font-bold text-emerald-400">{pctNative}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border-color)] flex">
        <div className="h-full bg-emerald-500" style={{ width: `${(nativeCount / Math.max(1, total)) * 100}%` }} title="Native" />
        <div className="h-full bg-cyan-500" style={{ width: `${(webviewCount / Math.max(1, total)) * 100}%` }} title="WebView" />
        <div className="h-full bg-amber-500" style={{ width: `${(configCount / Math.max(1, total)) * 100}%` }} title="Needs Config" />
        <div className="h-full bg-indigo-500" style={{ width: `${(testingCount / Math.max(1, total)) * 100}%` }} title="Testing" />
        <div className="h-full bg-rose-500" style={{ width: `${((unavailableCount + failedCount) / Math.max(1, total)) * 100}%` }} title="Unavailable/Failed" />
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
        <div
          onClick={() => onFilterStatus && onFilterStatus('ALL')}
          className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] cursor-pointer hover:border-cyan-500/40"
        >
          <div className="text-[10px] font-mono text-[var(--text-muted)]">TOTAL</div>
          <div className="text-base font-bold text-[var(--text-primary)] mt-0.5">{total}</div>
          <div className="text-[9px] text-[var(--text-muted)] mt-0.5">Discovered</div>
        </div>

        <div
          onClick={() => onFilterStatus && onFilterStatus('NATIVE_READY')}
          className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 cursor-pointer hover:bg-emerald-500/20"
        >
          <div className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={10} /> NATIVE
          </div>
          <div className="text-base font-bold text-emerald-300 mt-0.5">{nativeCount}</div>
          <div className="text-[9px] text-emerald-400/80 mt-0.5">Implemented</div>
        </div>

        <div
          onClick={() => onFilterStatus && onFilterStatus('WEBVIEW_FALLBACK')}
          className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 cursor-pointer hover:bg-cyan-500/20"
        >
          <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
            <Globe size={10} /> WEBVIEW
          </div>
          <div className="text-base font-bold text-cyan-300 mt-0.5">{webviewCount}</div>
          <div className="text-[9px] text-cyan-400/80 mt-0.5">Embedded Canvas</div>
        </div>

        <div
          onClick={() => onFilterStatus && onFilterStatus('NEEDS_CONFIGURATION')}
          className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 cursor-pointer hover:bg-amber-500/20"
        >
          <div className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
            <Wrench size={10} /> CONFIG
          </div>
          <div className="text-base font-bold text-amber-300 mt-0.5">{configCount}</div>
          <div className="text-[9px] text-amber-400/80 mt-0.5">Awaiting Schema</div>
        </div>

        <div
          onClick={() => onFilterStatus && onFilterStatus('TESTING')}
          className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 cursor-pointer hover:bg-indigo-500/20"
        >
          <div className="text-[10px] font-mono text-indigo-400 flex items-center gap-1">
            <Clock size={10} /> TESTING
          </div>
          <div className="text-base font-bold text-indigo-300 mt-0.5">{testingCount}</div>
          <div className="text-[9px] text-indigo-400/80 mt-0.5">Under Audit</div>
        </div>

        <div
          onClick={() => onFilterStatus && onFilterStatus('UNAVAILABLE')}
          className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 cursor-pointer hover:bg-rose-500/20"
        >
          <div className="text-[10px] font-mono text-rose-400 flex items-center gap-1">
            <XCircle size={10} /> 404
          </div>
          <div className="text-base font-bold text-rose-300 mt-0.5">{unavailableCount}</div>
          <div className="text-[9px] text-rose-400/80 mt-0.5">Unavailable</div>
        </div>

        <div
          onClick={() => onFilterStatus && onFilterStatus('FAILED_VALIDATION')}
          className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 cursor-pointer hover:bg-rose-500/20"
        >
          <div className="text-[10px] font-mono text-rose-400 flex items-center gap-1">
            <ShieldAlert size={10} /> FAILED
          </div>
          <div className="text-base font-bold text-rose-300 mt-0.5">{failedCount}</div>
          <div className="text-[9px] text-rose-400/80 mt-0.5">Validation Failed</div>
        </div>
      </div>
    </div>
  );
};
