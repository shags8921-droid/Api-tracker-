import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock
} from 'lucide-react';
import { AuditLogEntry } from '../types';

interface Props {
  auditLogs: AuditLogEntry[];
}

export const AuditHistoryScreen: React.FC<Props> = ({ auditLogs }) => {
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = auditLogs.filter((log) => {
    const matchesCat = filterCategory === 'ALL' || log.category === filterCategory;
    const matchesSearch =
      log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <FileText className="text-cyan-400" />
            Security & Compliance Audit History (Requirement 9E)
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Immutable log of discovery scans, AI analyses, approvals, rollbacks, and manual overrides.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
          <ShieldCheck size={13} />
          Sanitized: No Credentials Logged
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row gap-3 text-xs">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-3 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit records..."
            className="input-field pl-9 text-xs"
          />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-field w-auto text-xs"
        >
          <option value="ALL">All Event Categories</option>
          <option value="DISCOVERY_SESSION">Discovery Sessions</option>
          <option value="AI_ANALYSIS">AI Analyses</option>
          <option value="FEATURE_CHANGE">Feature Changes</option>
          <option value="USER_APPROVAL">Security Approvals</option>
          <option value="TEST_EXECUTION">Test Executions</option>
          <option value="ROLLBACK">Rollbacks</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-[var(--text-muted)] font-mono text-[10px]">
              <tr>
                <th className="py-2.5 px-4">TIMESTAMP</th>
                <th className="py-2.5 px-4">CATEGORY</th>
                <th className="py-2.5 px-4">EVENT DESCRIPTION</th>
                <th className="py-2.5 px-4">PERFORMED BY</th>
                <th className="py-2.5 px-4 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--bg-surface)]">
                  <td className="py-3 px-4 font-mono text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-cyan-400 border border-[var(--border-color)]">
                      {log.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-[var(--text-primary)]">{log.title}</div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      {log.details}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">{log.performedBy}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      log.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                      log.status === 'WARNING' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
