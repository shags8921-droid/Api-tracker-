import React from 'react';
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Terminal,
  ArrowRight,
  RefreshCw,
  Radio
} from 'lucide-react';
import { DiscoveryStageItem } from '../types';

interface Props {
  stages: DiscoveryStageItem[];
  isScanning: boolean;
  logs: string[];
  onViewResults: () => void;
  onRestartDiscovery: () => void;
}

export const DiscoveryProgressScreen: React.FC<Props> = ({
  stages,
  isScanning,
  logs,
  onViewResults,
  onRestartDiscovery
}) => {
  const completedCount = stages.filter((s) => s.status === 'COMPLETED' || s.status === 'WARNING').length;
  const progressPct = Math.round((completedCount / stages.length) * 100);
  const isFinished = !isScanning && stages.every((s) => s.status !== 'PENDING' && s.status !== 'IN_PROGRESS');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Compass className="text-cyan-400" />
            Automatic Website Self-Discovery Engine
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Running 11-stage inspection of APIs, OpenAPI specifications, hubs, routes, permissions, and design tokens.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isFinished ? (
            <button onClick={onViewResults} className="btn-primary px-5 py-2.5 text-xs">
              View Discovery Results
              <ArrowRight size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono">
              <RefreshCw size={13} className="animate-spin" />
              <span>Scanning Target Host...</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar & Metric Header */}
      <div className="glass-panel p-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Radio size={14} className="text-cyan-400 animate-pulse" />
            Execution Pipeline: {completedCount} / {stages.length} Stages Verified
          </span>
          <span className="font-mono font-bold text-cyan-400 text-sm">{progressPct}%</span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border-color)]">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* 11-Stage Inspection List */}
      <div className="space-y-2">
        {stages.map((stage) => {
          return (
            <div
              key={stage.id}
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                stage.status === 'IN_PROGRESS'
                  ? 'bg-cyan-500/10 border-cyan-500/40 shadow-sm'
                  : stage.status === 'COMPLETED'
                  ? 'bg-[var(--bg-surface)] border-[var(--border-color)]'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                  {stage.status === 'COMPLETED' ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : stage.status === 'IN_PROGRESS' ? (
                    <RefreshCw size={16} className="text-cyan-400 animate-spin" />
                  ) : stage.status === 'WARNING' ? (
                    <AlertTriangle size={18} className="text-amber-400" />
                  ) : stage.status === 'FAILED' ? (
                    <XCircle size={18} className="text-rose-400" />
                  ) : (
                    <Clock size={16} className="text-[var(--text-muted)]" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {stage.id}. {stage.title}
                    </span>
                    {stage.targetEndpoint && (
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {stage.targetEndpoint}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {stage.details || stage.description}
                  </p>
                </div>
              </div>

              {stage.latencyMs && (
                <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">
                  {stage.latencyMs}ms
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Live Terminal Telemetry Output */}
      <div className="glass-panel p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-mono border-b border-[var(--border-color)] pb-2">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Terminal size={14} />
            LIVE DISCOVERY TELEMETRY LOG
          </span>
          <span>{logs.length} events streamed</span>
        </div>

        <div className="font-mono text-[11px] text-slate-300 max-h-44 overflow-y-auto space-y-1 bg-black/40 p-3 rounded-lg border border-[var(--border-color)]">
          {logs.map((log, i) => (
            <div key={i} className="leading-relaxed">
              <span className="text-cyan-500 mr-2">&gt;</span>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
