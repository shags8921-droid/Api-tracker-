import React, { useState } from 'react';
import { DiscoveredFeature, ImplementationOption } from '../types';
import { FeatureStatusBadge } from './FeatureStatusBadge';
import {
  X,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle,
  FileCode,
  ArrowRight,
  Sparkles,
  Layers,
  Wrench,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface Props {
  feature: DiscoveredFeature;
  onClose: () => void;
  onExecutePipeline: (feature: DiscoveredFeature) => void;
  onSaveManualOverride: (featureId: string, option: ImplementationOption, note: string) => void;
}

export const FeatureInspectorModal: React.FC<Props> = ({
  feature,
  onClose,
  onExecutePipeline,
  onSaveManualOverride
}) => {
  const [activeTab, setActiveTab] = useState<'RECORD' | 'PLAN' | 'TESTS' | 'OVERRIDE'>('RECORD');
  const [overrideOption, setOverrideOption] = useState<ImplementationOption>(
    feature.manualOverride?.forcedOption || feature.chosenOption
  );
  const [overrideNote, setOverrideNote] = useState(feature.manualOverride?.userNote || '');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileCode size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">{feature.name}</h3>
                <FeatureStatusBadge status={feature.implementationStatus} />
              </div>
              <p className="text-xs font-mono text-[var(--text-secondary)]">{feature.route}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-color)] px-6 bg-[var(--bg-secondary)] text-xs">
          {(
            [
              { id: 'RECORD', label: 'Feature Registry Record' },
              { id: 'PLAN', label: 'AI Implementation Plan' },
              { id: 'TESTS', label: '11-Point Test Suite' },
              { id: 'OVERRIDE', label: 'Manual Correction' }
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-3 px-4 font-semibold border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'RECORD' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1">FEATURE ID</span>
                  <span className="font-mono text-[var(--text-primary)] font-medium">{feature.id}</span>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1">HUB ASSIGNMENT</span>
                  <span className="font-semibold text-cyan-400">
                    {feature.hubId === 'hub_owner' ? 'Owner Hub (Executive)' : 'Manager Hub (Operations)'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1">DESCRIPTION</span>
                <p className="text-[var(--text-secondary)] leading-relaxed">{feature.description}</p>
              </div>

              {/* UI Structure & Forms */}
              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1">UI STRUCTURE & FORMS</span>
                <div className="space-y-1 mt-1">
                  <div>Type: <span className="font-mono font-bold text-cyan-400">{feature.uiStructure.componentType}</span></div>
                  <div>Interactive Form: {feature.uiStructure.hasForm ? 'Yes (Validated)' : 'None'}</div>
                  {feature.uiStructure.formFields.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {feature.uiStructure.formFields.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] font-mono text-[10px]">
                          {f.label} ({f.type})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* API Operations */}
              <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1">VERIFIED API OPERATIONS</span>
                {feature.apiOperations.length > 0 ? (
                  <div className="space-y-1.5 mt-1">
                    {feature.apiOperations.map((op, i) => (
                      <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-[var(--bg-secondary)] font-mono">
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          op.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' :
                          op.method === 'POST' ? 'bg-cyan-500/20 text-cyan-400' :
                          op.method === 'DELETE' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {op.method}
                        </span>
                        <span className="text-[var(--text-primary)]">{op.endpoint}</span>
                        <span className="text-[var(--text-muted)] text-[10px] ml-auto">{op.description}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[var(--text-muted)] italic">No direct API endpoints declared</span>
                )}
              </div>

              {/* Permissions & Governance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1">REQUIRED PERMISSIONS</span>
                  <div className="flex flex-wrap gap-1">
                    {feature.permissions.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-[10px]">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1">SAFETY & REVERSIBILITY</span>
                  {feature.isDestructive ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <ShieldAlert size={14} /> Two-tap confirmation required (Destructive)
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-medium">Standard Non-Destructive Operation</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PLAN' && (
            <div className="space-y-4 text-xs">
              {feature.implementationPlan ? (
                <>
                  <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border border-cyan-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                        <Sparkles size={16} /> RECOMMENDED STRATEGY
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-sm">
                        Feasibility: {feature.implementationPlan.nativeFeasibilityScore}%
                      </span>
                    </div>
                    <p className="text-[var(--text-primary)] leading-relaxed font-medium">
                      {feature.implementationPlan.rationale}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1.5">EVIDENCE SUPPORTING DECISION</span>
                    <ul className="space-y-1">
                      {feature.implementationPlan.evidenceReferences.map((ref, i) => (
                        <li key={i} className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <CheckCircle size={13} className="text-cyan-400" />
                          <span>{ref}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <span className="text-[11px] text-[var(--text-muted)] font-mono block mb-1.5">PIPELINE ACTION STEPS</span>
                    <ol className="space-y-1.5">
                      {feature.implementationPlan.actionSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-[var(--text-secondary)]">
                          <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] flex items-center justify-center font-bold mt-0.5">
                            {i + 1}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-[var(--text-muted)]">
                  <p>AI plan not generated yet. Click 'Run Safe Pipeline' to analyse.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'TESTS' && (
            <div className="space-y-3 text-xs">
              {feature.testResults ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <span className="font-bold text-[var(--text-primary)]">Automated Completeness Score</span>
                    <span className={`font-mono text-sm font-bold ${
                      feature.testResults.passed ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {feature.testResults.score}% ({feature.testResults.passed ? 'PASSED' : 'FAILED'})
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {feature.testResults.checks.map((chk, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-[var(--text-primary)]">{chk.name}</div>
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{chk.details}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          chk.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {chk.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-[var(--text-muted)]">
                  <p>No test runs recorded for this feature yet. Run the Safe AI Implementation Pipeline to execute.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'OVERRIDE' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <span className="font-bold text-[var(--text-primary)] block mb-1">
                  Manual Correction & Decision Override (Requirement 9F)
                </span>
                <p className="text-[var(--text-secondary)] mb-3 leading-relaxed">
                  Authorized operators can manually override the AI recommendation, force WebView fallback, or change configuration requirements. Every manual adjustment is preserved in the immutable Audit History.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">FORCED STRATEGY</label>
                    <select
                      value={overrideOption}
                      onChange={(e) => setOverrideOption(e.target.value as ImplementationOption)}
                      className="input-field"
                    >
                      <option value="NATIVE_WEB">Native-Style Web Interface (Option A)</option>
                      <option value="WEBVIEW_FALLBACK">Original Website Fallback (Option B)</option>
                      <option value="REQUIRES_CONFIG">Requires Manual Configuration (Option C)</option>
                      <option value="UNAVAILABLE">Unavailable / Retired Endpoint (Option D)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-muted)] mb-1">OPERATOR RATIONALE NOTE</label>
                    <textarea
                      value={overrideNote}
                      onChange={(e) => setOverrideNote(e.target.value)}
                      rows={3}
                      placeholder="Explain the reason for manual override..."
                      className="input-field resize-none"
                    />
                  </div>

                  <button
                    onClick={() => {
                      onSaveManualOverride(feature.id, overrideOption, overrideNote);
                      onClose();
                    }}
                    className="btn-primary w-full"
                  >
                    Commit Manual Override to Audit History
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between">
          <div className="text-xs text-[var(--text-muted)] font-mono">
            Confidence: {feature.confidenceScore}% · Verified: {feature.lastVerified}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onExecutePipeline(feature)}
              className="btn-primary"
            >
              <Play size={14} />
              Run 12-Step Safe Pipeline
            </button>
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
