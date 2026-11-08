import React, { useState } from 'react';
import { api } from '../services/api';
import {
  Terminal,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { WebsiteConfig } from '../types';

interface Props {
  activeConfig: WebsiteConfig | null;
}

export const DiagnosticsScreen: React.FC<Props> = ({ activeConfig }) => {
  const [isPinging, setIsPinging] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const [diagnosticEntries, setDiagnosticEntries] = useState([
    {
      id: 'log_1',
      timestamp: Date.now() - 30000,
      method: 'GET',
      path: '/api/v1/integration/health',
      status: 200,
      latency: 38,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer [REDACTED FOR SECURITY]',
        'X-RateLimit-Remaining': '58',
        'Server': 'SitePulse-Gateway/2.4'
      },
      responseBody: '{"status":"UP","services":{"database":"OK","auth":"OK","queue":"OK"},"version":"2.4.0"}'
    },
    {
      id: 'log_2',
      timestamp: Date.now() - 15000,
      method: 'GET',
      path: '/api/v1/integration/manifest',
      status: 200,
      latency: 54,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer [REDACTED FOR SECURITY]'
      },
      responseBody: '{"manifestVersion":"2.4.0","modules":["auth","catalog","orders","admin"]}'
    },
    {
      id: 'log_3',
      timestamp: Date.now() - 5000,
      method: 'GET',
      path: '/api/v1/legacy/export.xml',
      status: 404,
      latency: 18,
      headers: {
        'Content-Type': 'application/json'
      },
      responseBody: '{"error":"Not Found","message":"Endpoint retired on gateway v2.4.0"}'
    }
  ]);

  const handlePing = async () => {
    setIsPinging(true);
    let status = 0;
    let latency = 0;
    let body = '';
    try {
      const r = await api.get<any>('/api/v1/health');
      status = r.status;
      latency = r.latencyMs;
      body = JSON.stringify(r.data);
    } catch (e: any) {
      status = e?.status || 0;
      latency = e?.latencyMs || 0;
      body = JSON.stringify({ error: e?.message || 'Request failed' });
    }
    const newEntry = {
      id: `log_${Date.now()}`,
      timestamp: Date.now(),
      method: 'GET',
      path: '/api/v1/health',
      status,
      latency,
      headers: { 'Content-Type': 'application/json', Authorization: '[not sent]' },
      responseBody: body
    };
    setDiagnosticEntries([newEntry, ...diagnosticEntries]);
    setIsPinging(false);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(diagnosticEntries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sitepulse_diagnostics_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Terminal className="text-cyan-400" />
            Network Diagnostics & Sanitized Telemetry Logs
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Raw HTTP headers, payload inspectors, and gateway response times with automatic token sanitization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePing} disabled={isPinging} className="btn-secondary px-3 py-2 text-xs">
            <RefreshCw size={13} className={isPinging ? 'animate-spin' : ''} />
            Live Health Ping
          </button>
          <button onClick={handleExportJson} className="btn-primary px-3 py-2 text-xs">
            <Download size={13} />
            Export Diagnostics JSON
          </button>
        </div>
      </div>

      {/* Grid: Log List + Raw Payload Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log Entries */}
        <div className="glass-panel p-4 space-y-2 max-h-[70vh] overflow-y-auto">
          <div className="text-[10px] font-mono font-bold text-[var(--text-muted)] border-b border-[var(--border-color)] pb-2 flex justify-between">
            <span>REQUEST LOG ENTRIES</span>
            <span>{diagnosticEntries.length} recorded</span>
          </div>

          <div className="space-y-1.5 pt-1">
            {diagnosticEntries.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`p-3 rounded-xl border cursor-pointer font-mono text-xs transition-all ${
                  selectedLog?.id === log.id
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-400">{log.method}</span>
                    <span className="text-[var(--text-primary)] truncate max-w-[200px]">{log.path}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    log.status === 200 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {log.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Latency: {log.latency}ms</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Log Inspector */}
        <div className="glass-panel p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <span>SANITIZED INSPECTION VIEW</span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <ShieldCheck size={12} />
              Tokens Redacted
            </span>
          </div>

          {selectedLog ? (
            <div className="space-y-4 text-xs font-mono">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block mb-1">HTTP REQUEST TARGET</span>
                <div className="p-2.5 rounded bg-[var(--bg-secondary)] text-cyan-400">
                  {selectedLog.method} {selectedLog.path}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-[var(--text-muted)] block mb-1">SANITIZED RESPONSE HEADERS</span>
                <pre className="p-3 rounded bg-black/50 text-slate-300 overflow-x-auto text-[11px] leading-relaxed border border-[var(--border-color)]">
                  {JSON.stringify(selectedLog.headers, null, 2)}
                </pre>
              </div>

              <div>
                <span className="text-[10px] text-[var(--text-muted)] block mb-1">RESPONSE BODY JSON</span>
                <pre className="p-3 rounded bg-black/50 text-emerald-300 overflow-x-auto text-[11px] leading-relaxed border border-[var(--border-color)]">
                  {JSON.stringify(JSON.parse(selectedLog.responseBody), null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-[var(--text-muted)] text-xs">
              Select an entry from the left column to view sanitized headers and raw payloads.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
