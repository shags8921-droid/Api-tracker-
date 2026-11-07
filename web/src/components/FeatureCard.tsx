import React from 'react';
import { DiscoveredFeature } from '../types';
import { FeatureStatusBadge } from './FeatureStatusBadge';
import {
  Play,
  ExternalLink,
  ShieldAlert,
  Info,
  Wrench,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';

interface Props {
  feature: DiscoveredFeature;
  onInspect: (feature: DiscoveredFeature) => void;
  onExecute: (feature: DiscoveredFeature) => void;
}

export const FeatureCard: React.FC<Props> = ({ feature, onInspect, onExecute }) => {
  const primaryMethod = feature.apiOperations[0]?.method || (feature.isDestructive ? 'DELETE' : 'GET');

  return (
    <div className="glass-panel p-4 flex flex-col justify-between transition-all hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 group">
      <div>
        {/* Top line: method + route + badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span
              className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                primaryMethod === 'GET'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : primaryMethod === 'POST'
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                  : primaryMethod === 'DELETE'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
              }`}
            >
              {primaryMethod}
            </span>
            <span className="font-mono text-xs text-[var(--text-secondary)] truncate">
              {feature.route}
            </span>
          </div>

          <FeatureStatusBadge status={feature.implementationStatus} />
        </div>

        {/* Name & Description */}
        <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors mb-1">
          {feature.name}
        </h4>
        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-3">
          {feature.description}
        </p>

        {/* AI Rationale Snippet if available */}
        {feature.implementationPlan && (
          <div className="text-[11px] p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-cyan-400/90 mb-3">
            <span className="font-semibold">AI Plan: </span>
            {feature.implementationPlan.rationale}
          </div>
        )}
      </div>

      {/* Footer info & actions */}
      <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-2 text-[11px]">
          {feature.isDestructive ? (
            <span className="flex items-center gap-1 text-rose-400 font-semibold font-mono text-[10px]">
              <ShieldAlert size={12} />
              Approval Req
            </span>
          ) : (
            <span className="text-[var(--text-muted)] font-mono text-[10px]">
              Conf: {feature.confidenceScore}%
            </span>
          )}
          {feature.dependencies.length > 0 && (
            <span className="text-[10px] text-amber-400 font-mono">
              ({feature.dependencies.length} deps)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onInspect(feature)}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] flex items-center gap-1 font-medium transition-colors"
          >
            <Info size={13} />
            Inspect
          </button>

          {feature.chosenOption === 'WEBVIEW_FALLBACK' ? (
            <button
              onClick={() => onExecute(feature)}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <ExternalLink size={13} />
              Open Fallback
            </button>
          ) : feature.chosenOption === 'REQUIRES_CONFIG' ? (
            <button
              onClick={() => onInspect(feature)}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1"
            >
              <Wrench size={13} />
              Configure
            </button>
          ) : feature.chosenOption === 'UNAVAILABLE' ? (
            <button
              disabled
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/5 text-rose-400/50 border border-rose-500/10 text-xs font-semibold cursor-not-allowed"
            >
              Unavailable
            </button>
          ) : (
            <button
              onClick={() => onExecute(feature)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 text-white shadow-sm transition-transform active:scale-95 ${
                feature.isDestructive
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-cyan-600 hover:bg-cyan-500'
              }`}
            >
              <Play size={12} />
              Run Action
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
