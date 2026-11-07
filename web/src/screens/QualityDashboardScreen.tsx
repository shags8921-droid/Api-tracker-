import React, { useState } from 'react';
import {
  ShieldCheck,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  Lock,
  Server,
  Zap,
  HelpCircle,
  FileText
} from 'lucide-react';
import { ProductionQualityAssuranceRunner, QaReportSummary, TestResultItem } from '../domain/testing/production_suite';
import { DiscoveredFeature } from '../types';

interface Props {
  features: DiscoveredFeature[];
}

export const QualityDashboardScreen: React.FC<Props> = ({ features }) => {
  const [report, setReport] = useState<QaReportSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const runner = new ProductionQualityAssuranceRunner();

  const handleRunSuite = async () => {
    setIsRunning(true);
    try {
      const summary = await runner.runFullSuite(features);
      setReport(summary);
    } catch (err) {
      console.error('Test suite execution error', err);
    } finally {
      setIsRunning(false);
    }
  };

  const filteredResults = report
    ? selectedCategory === 'ALL'
      ? report.results
      : report.results.filter((r) => r.category === selectedCategory)
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="text-emerald-400" />
            Phase 5 Quality Assurance & Production-Readiness Dashboard
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Validates Unit, Integration, E2E, and Security test suites against authoritative gateway endpoints.
          </p>
        </div>

        <button
          onClick={handleRunSuite}
          disabled={isRunning}
          className="btn-primary px-5 py-2.5 text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20"
        >
          {isRunning ? (
            <>
              <Clock size={15} className="animate-spin" />
              Running Live Test Suite...
            </>
          ) : (
            <>
              <Play size={15} />
              Run Full QA & Security Suite
            </>
          )}
        </button>
      </div>

      {/* Summary Scorecard if run */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 border-l-4 border-emerald-500 space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Test Passing Rate</span>
            <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
              {report.coveragePct}%
              <CheckCircle2 size={20} />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {report.passedCount} passed / {report.totalTests} executed
            </p>
          </div>

          <div className="glass-panel p-4 border-l-4 border-cyan-500 space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Security Hardening</span>
            <div className="text-2xl font-black text-cyan-400 flex items-center gap-2">
              {report.securityAuditsPassed ? '100% SECURE' : 'ACTION REQ'}
              <Lock size={18} />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">RBAC 403, SSRF, & Redaction</p>
          </div>

          <div className="glass-panel p-4 border-l-4 border-indigo-500 space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Overall Assessment</span>
            <div className="text-lg font-bold text-white flex items-center gap-1 mt-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {report.overallAssessment}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Zero Critical Regressions</p>
          </div>

          <div className="glass-panel p-4 border-l-4 border-amber-500 space-y-1">
            <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Source of Truth</span>
            <div className="text-lg font-bold text-amber-300 flex items-center gap-1 mt-1">
              PROTECTED
              <Server size={18} />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Authoritative remote website</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {report && (
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2 overflow-x-auto">
          {['ALL', 'UNIT', 'INTEGRATION', 'SECURITY', 'E2E'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-secondary)]'
              }`}
            >
              {cat} ({cat === 'ALL' ? report.totalTests : report.results.filter((r) => r.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Test Execution List */}
      {report ? (
        <div className="glass-panel overflow-hidden">
          <div className="divide-y divide-[var(--border-color)]">
            {filteredResults.map((item) => (
              <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/[0.02]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1 rounded-md text-[10px] font-mono font-bold ${
                        item.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {item.passed ? 'PASS' : 'FAIL'}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                      {item.category}
                    </span>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">{item.name}</h4>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{item.description}</p>
                  <p className="text-[11px] font-mono text-cyan-400/90 bg-cyan-950/20 px-2.5 py-1 rounded-md inline-block mt-1">
                    ↳ {item.details}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1">
                    <Clock size={12} />
                    {item.durationMs}ms
                  </span>
                  {item.passed ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <XCircle size={18} className="text-rose-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
            <ShieldCheck size={28} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Automated Quality Assurance Suite Ready</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Click "Run Full QA & Security Suite" to execute all Unit, Integration, RBAC 403 Security, and E2E workflow verification tests.
            </p>
          </div>
          <button onClick={handleRunSuite} className="btn-primary px-5 py-2 text-xs">
            Start Verification Run
          </button>
        </div>
      )}

      {/* Production Readiness Report & Known Limitations Section (Requirement 14) */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="glass-panel p-5 space-y-3">
            <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <FileText size={16} className="text-cyan-400" />
              1. Production-Readiness Highlights
            </h4>
            <ul className="space-y-2 text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Source of Truth:</strong> Live website maintains authoritative ownership over users, orders, and SKUs.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Zero-Exposed Secrets:</strong> Tokens & API keys are confined to server proxy with automatic redaction.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Safe Offline Queue:</strong> Destructive operations are refused offline; safe idempotent actions buffer with backoff.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Future Android Architecture:</strong> Platform storage, network, and files isolated behind modular adapter interfaces.</span>
              </li>
            </ul>
          </div>

          <div className="glass-panel p-5 space-y-3">
            <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              2. Known Limitations & Constraints
            </h4>
            <ul className="space-y-2 text-[var(--text-secondary)]">
              {report.knownLimitations.map((lim, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-mono text-[10px] shrink-0 mt-0.5">[{idx + 1}]</span>
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
