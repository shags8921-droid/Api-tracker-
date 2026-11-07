import React, { useState } from 'react';
import {
  Cpu,
  Sparkles,
  Bot,
  Brain,
  Sliders,
  DollarSign,
  Gauge,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Layers,
  Shield
} from 'lucide-react';
import { DiscoveredFeature } from '../types';
import { AdvancedAiIntegrationAgent } from '../domain/ai/agent';
import { ScreenId } from '../components/Navigation';

interface Props {
  features: DiscoveredFeature[];
  onUpdateFeatures: (features: DiscoveredFeature[]) => void;
  onNavigate: (screen: ScreenId) => void;
  onInspect: (feature: DiscoveredFeature) => void;
}

export const AiAgentDashboardScreen: React.FC<Props> = ({
  features,
  onUpdateFeatures,
  onNavigate,
  onInspect
}) => {
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-flash' | 'gemini-2.5-pro' | 'local-heuristic'>('gemini-2.5-flash');
  const [isAnalysingAll, setIsAnalysingAll] = useState(false);
  const [analysedCount, setAnalysedCount] = useState(features.filter((f) => f.implementationPlan).length);

  const aiAgent = new AdvancedAiIntegrationAgent();

  const handleRunBatchAnalysis = async () => {
    setIsAnalysingAll(true);
    await new Promise((r) => setTimeout(r, 600));

    const updated = features.map((f) => {
      const res = aiAgent.analyseFeature(f);
      return {
        ...f,
        chosenOption: res.chosenOption,
        implementationPlan: res.plan,
        confidenceScore: Math.round(res.reproducibilityScore)
      };
    });

    onUpdateFeatures(updated);
    setAnalysedCount(updated.length);
    setIsAnalysingAll(false);
  };

  // Group features into domain clusters
  const domainClusters = [
    {
      name: 'Executive Governance & Identity',
      hub: 'Owner Hub',
      features: features.filter((f) => f.hubId === 'hub_owner'),
      color: 'border-indigo-500/30 bg-indigo-500/5'
    },
    {
      name: 'Operations, Catalog & Dispatches',
      hub: 'Manager Hub',
      features: features.filter((f) => f.hubId === 'hub_manager'),
      color: 'border-cyan-500/30 bg-cyan-500/5'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Cpu className="text-cyan-400" />
            Advanced AI Integration Agent & Decision Console
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Modular reasoning engine classifying UI reproduction strategy, schema mappings, and component templates.
          </p>
        </div>

        <button
          onClick={handleRunBatchAnalysis}
          disabled={isAnalysingAll}
          className="btn-primary px-5 py-2.5 text-xs shadow-lg shadow-cyan-500/20"
        >
          {isAnalysingAll ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {isAnalysingAll ? 'Evaluating Schemas...' : 'Analyse All Features'}
        </button>
      </div>

      {/* Model Selector & Cost / Performance Control (Requirement 9H) */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Sliders size={14} className="text-cyan-400" />
            AI PROVIDER ADAPTER & PERFORMANCE TUNING (Requirement 9H)
          </span>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <DollarSign size={12} />
            Cost Control Active: $0.00 cached queries
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              id: 'gemini-2.5-flash',
              title: 'Gemini 2.5 Flash',
              badge: 'Fast & Cost-Efficient',
              desc: 'High-speed classification, schema matching, and 12-step pipeline decisioning.'
            },
            {
              id: 'gemini-2.5-pro',
              title: 'Gemini 2.5 Pro',
              badge: 'Complex Reasoning',
              desc: 'Reserved for multi-step transactional workflows and ambiguous legacy contracts.'
            },
            {
              id: 'local-heuristic',
              title: 'Local Heuristic Engine',
              badge: 'Offline / Zero Token Cost',
              desc: 'Deterministic rule-based classification based on OpenAPI 3.0 types and HTTP codes.'
            }
          ].map((m) => (
            <div
              key={m.id}
              onClick={() => setSelectedModel(m.id as any)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                selectedModel === m.id
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">{m.title}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                  {m.badge}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Domain Clusters & Strategy Breakdown */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-[var(--text-muted)] font-mono tracking-wider">
          DOMAIN CLUSTERS & MAPPED FEATURE SETS
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {domainClusters.map((cluster, i) => (
            <div key={i} className={`p-5 rounded-2xl border ${cluster.color} space-y-3`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">{cluster.name}</h4>
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">{cluster.hub}</span>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-400">
                  {cluster.features.length} features
                </span>
              </div>

              <div className="space-y-2">
                {cluster.features.map((feat) => (
                  <div
                    key={feat.id}
                    onClick={() => onInspect(feat)}
                    className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-between cursor-pointer hover:border-cyan-500/40 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">{feat.name}</div>
                      <div className="text-[11px] font-mono text-[var(--text-muted)] truncate max-w-[200px]">
                        {feat.route}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-cyan-400 font-mono font-semibold">
                      {feat.chosenOption}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
