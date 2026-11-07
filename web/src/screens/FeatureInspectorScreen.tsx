import React, { useState } from 'react';
import { Search, FileCode, Play, Sparkles, Layers, ShieldCheck, ArrowRight } from 'lucide-react';
import { DiscoveredFeature, ImplementationOption } from '../types';
import { FeatureStatusBadge } from '../components/FeatureStatusBadge';
import { AdvancedAiIntegrationAgent } from '../domain/ai/agent';

interface Props {
  features: DiscoveredFeature[];
  selectedFeature: DiscoveredFeature | null;
  onSelectFeature: (feature: DiscoveredFeature) => void;
  onExecutePipeline: (feature: DiscoveredFeature) => void;
  onSaveManualOverride: (featureId: string, option: ImplementationOption, note: string) => void;
}

export const FeatureInspectorScreen: React.FC<Props> = ({
  features,
  selectedFeature,
  onSelectFeature,
  onExecutePipeline,
  onSaveManualOverride
}) => {
  const current = selectedFeature || features[0];
  const [overrideOption, setOverrideOption] = useState<ImplementationOption>(
    current?.chosenOption || 'NATIVE_WEB'
  );
  const [overrideNote, setOverrideNote] = useState('');

  if (!current) {
    return (
      <div className="p-12 text-center text-[var(--text-muted)]">
        No features discovered yet. Run the discovery pipeline first.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
          <Search className="text-cyan-400" />
          Feature Deep Inspector & Architectural Spec
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Detailed inspection of API schemas, interaction states, AI implementation plans, and manual overrides.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Feature Selector */}
        <div className="glass-panel p-4 space-y-3 h-[75vh] flex flex-col">
          <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
            SELECT FEATURE TO INSPECT ({features.length})
          </span>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {features.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  onSelectFeature(f);
                  setOverrideOption(f.chosenOption);
                }}
                className={`w-full text-left p-3 rounded-xl transition-all border ${
                  f.id === current.id
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 font-bold'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold truncate">{f.name}</span>
                  <FeatureStatusBadge status={f.implementationStatus} size="sm" />
                </div>
                <div className="font-mono text-[10px] text-[var(--text-muted)] truncate">{f.route}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right 2 Columns: Full Inspector Detail */}
        <div className="lg:col-span-2 glass-panel p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{current.name}</h3>
                <FeatureStatusBadge status={current.implementationStatus} />
              </div>
              <span className="font-mono text-xs text-cyan-400">{current.route}</span>
            </div>

            <button
              onClick={() => onExecutePipeline(current)}
              className="btn-primary text-xs self-start sm:self-auto"
            >
              <Play size={13} />
              Run 12-Step Pipeline
            </button>
          </div>

          {/* Core Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <span className="font-mono text-[10px] text-[var(--text-muted)] block mb-1">MANAGEMENT HUB</span>
              <span className="font-bold text-cyan-400">
                {current.hubId === 'hub_owner' ? 'Owner Hub (Executive)' : 'Manager Hub (Operations)'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <span className="font-mono text-[10px] text-[var(--text-muted)] block mb-1">CONFIDENCE SCORE</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{current.confidenceScore}%</span>
            </div>
          </div>

          {/* Description */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs">
            <span className="font-mono text-[10px] text-[var(--text-muted)] block mb-1">BUSINESS DESCRIPTION</span>
            <p className="text-[var(--text-secondary)] leading-relaxed">{current.description}</p>
          </div>

          {/* AI Plan Rationale */}
          {current.implementationPlan && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/30 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} /> AI IMPLEMENTATION STRATEGY
                </span>
                <span className="font-mono text-emerald-400">
                  Feasibility: {current.implementationPlan.nativeFeasibilityScore}%
                </span>
              </div>
              <p className="text-[var(--text-primary)] leading-relaxed font-medium">
                {current.implementationPlan.rationale}
              </p>
              <div className="pt-2 text-[11px] text-[var(--text-muted)]">
                Template: <span className="font-mono text-cyan-400">{current.implementationPlan.componentTemplate}</span>
              </div>
            </div>
          )}

          {/* API Operations */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs space-y-2">
            <span className="font-mono text-[10px] text-[var(--text-muted)] block">VERIFIED REST CONTRACTS</span>
            {current.apiOperations.length > 0 ? (
              current.apiOperations.map((op, i) => (
                <div key={i} className="flex items-center gap-2 font-mono p-2 rounded bg-[var(--bg-secondary)] text-[11px]">
                  <span className="font-bold text-cyan-400">{op.method}</span>
                  <span className="text-[var(--text-primary)]">{op.endpoint}</span>
                  <span className="text-[var(--text-muted)] ml-auto text-[10px]">{op.description}</span>
                </div>
              ))
            ) : (
              <span className="text-[var(--text-muted)] italic">No direct API operations declared</span>
            )}
          </div>

          {/* Manual Correction Form */}
          <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs space-y-3">
            <span className="font-bold text-[var(--text-primary)] block">Manual Operator Correction (Requirement 9F)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-[var(--text-muted)] mb-1">STRATEGY DECISION</label>
                <select
                  value={overrideOption}
                  onChange={(e) => setOverrideOption(e.target.value as ImplementationOption)}
                  className="input-field text-xs"
                >
                  <option value="NATIVE_WEB">Native-Style Web Interface (Option A)</option>
                  <option value="WEBVIEW_FALLBACK">Original Website Fallback (Option B)</option>
                  <option value="REQUIRES_CONFIG">Requires Manual Configuration (Option C)</option>
                  <option value="UNAVAILABLE">Unavailable / Retired Endpoint (Option D)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[var(--text-muted)] mb-1">REASON NOTE</label>
                <input
                  type="text"
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="Rationale for manual override..."
                  className="input-field text-xs"
                />
              </div>
            </div>

            <button
              onClick={() => onSaveManualOverride(current.id, overrideOption, overrideNote)}
              className="btn-secondary text-xs"
            >
              Commit Manual Correction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
