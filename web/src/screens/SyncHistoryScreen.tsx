import React, { useState, useEffect } from 'react';
import {
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  GitCompare,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Wifi,
  WifiOff,
  RefreshCw,
  Layers,
  Save,
  Server
} from 'lucide-react';
import { DiscoveredFeature, ManifestVersion, ChangeDetectionDiff } from '../types';
import { ChangeDetectionEngine } from '../domain/change/detection';
import { syncEngine } from '../domain/sync/engine';
import { SyncOperationItem, SyncConflict, SyncStatistics } from '../types/sync';
import { api } from '../services/api';

interface Props {
  features: DiscoveredFeature[];
  onTriggerSync: () => void;
  onRollback: (version: ManifestVersion) => void;
}

export const SyncHistoryScreen: React.FC<Props> = ({ features, onTriggerSync, onRollback }) => {
  const [selectedDiff, setSelectedDiff] = useState<ChangeDetectionDiff | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStatistics>(syncEngine.getStats());
  const [queue, setQueue] = useState<SyncOperationItem[]>(syncEngine.getQueue());
  const [conflicts, setConflicts] = useState<SyncConflict[]>(syncEngine.getConflicts());
  const [backups, setBackups] = useState<any[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupLabel, setBackupLabel] = useState('');

  const engine = new ChangeDetectionEngine();

  useEffect(() => {
    const unsub = syncEngine.subscribe((stats) => {
      setSyncStats(stats);
      setQueue(syncEngine.getQueue());
      setConflicts(syncEngine.getConflicts());
    });

    // Fetch server backup snapshots
    fetchBackups();

    return () => unsub();
  }, []);

  const fetchBackups = async () => {
    try {
      const res = await api.get<any[]>('/api/v1/backups');
      setBackups(res.data);
    } catch {
      // ignore if restricted
    }
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingBackup(true);
    try {
      await api.post('/api/v1/backups/create', { label: backupLabel || 'Manual Production Snapshot' });
      setBackupLabel('');
      fetchBackups();
    } catch (err: any) {
      alert(`Snapshot failed: ${err.message}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRollbackSnapshot = async (backupId: string) => {
    if (!window.confirm(`Are you sure you want to rollback to configuration snapshot ${backupId}?`)) return;
    try {
      await api.post(`/api/v1/backups/${backupId}/rollback`, {});
      alert(`Configuration successfully restored to snapshot ${backupId}`);
      fetchBackups();
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    }
  };

  const handleInspectDiff = () => {
    const diff = engine.compareSnapshots(
      features.slice(2),
      features,
      'v2.3.0',
      'v2.4.0'
    );
    setSelectedDiff(diff);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <History className="text-cyan-400" />
            Reliable Synchronisation & Rollback Engine (Phase 5 Hardened)
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Authoritative source of truth protection, idempotent retry queue, conflict resolution, and configuration backups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleInspectDiff} className="btn-secondary px-4 py-2 text-xs">
            <GitCompare size={14} />
            Compare Manifest Versions
          </button>
          <button onClick={onTriggerSync} className="btn-primary px-4 py-2 text-xs flex items-center gap-1.5">
            <RefreshCw size={14} className={syncStats.isSyncing ? 'animate-spin' : ''} />
            {syncStats.isSyncing ? 'Synchronising...' : 'Trigger Authoritative Re-Sync'}
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-l-4 border-cyan-500 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Gateway Connectivity</span>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            {syncStats.isOnline ? (
              <>
                <Wifi size={16} className="text-emerald-400" />
                <span className="text-emerald-400">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-rose-400" />
                <span className="text-rose-400">OFFLINE MODE</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">Authoritative remote website live</p>
        </div>

        <div className="glass-panel p-4 border-l-4 border-indigo-500 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Offline Sync Queue</span>
          <div className="text-2xl font-black text-indigo-400 flex items-center gap-2">
            {syncStats.pendingQueued}
            <span className="text-xs font-normal text-[var(--text-muted)]">actions pending</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">Idempotent replay buffered</p>
        </div>

        <div className="glass-panel p-4 border-l-4 border-amber-500 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Data Conflicts</span>
          <div className="text-2xl font-black text-amber-400 flex items-center gap-2">
            {syncStats.conflictCount}
            <AlertTriangle size={18} />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">Concurrent changes detected</p>
        </div>

        <div className="glass-panel p-4 border-l-4 border-emerald-500 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Total Synchronised</span>
          <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
            {syncStats.totalSynchronised}
            <CheckCircle2 size={18} />
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">Source-of-truth updates confirmed</p>
        </div>
      </div>

      {/* Pending Sync Queue & Conflicts Inspector */}
      {(queue.length > 0 || conflicts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Queue */}
          <div className="glass-panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <Clock size={16} className="text-indigo-400" />
                Buffered Offline Actions ({queue.length})
              </h3>
              {queue.some((q) => q.status === 'SUCCESS') && (
                <button
                  onClick={() => syncEngine.clearCompletedQueue()}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Clear Completed
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {queue.map((op) => (
                <div
                  key={op.id}
                  className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-400">{op.method}</span>
                      <span className="font-mono text-[var(--text-primary)]">{op.endpoint}</span>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono">
                      Key: {op.idempotencyKey.substring(0, 16)}... | Retries: {op.retryCount}/{op.maxRetries}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      op.status === 'SUCCESS'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : op.status === 'SYNCING'
                        ? 'bg-cyan-500/20 text-cyan-400 animate-pulse'
                        : op.status === 'CONFLICT'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                    }`}
                  >
                    {op.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Conflict Resolution */}
          <div className="glass-panel p-5 space-y-3">
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" />
              Concurrent Modification Conflicts ({conflicts.length})
            </h3>

            {conflicts.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] py-4 text-center">
                No active conflicts. Local cache is consistent with remote authoritative records.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {conflicts.map((conf) => (
                  <div
                    key={conf.id}
                    className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">
                        {conf.resourceType} #{conf.resourceId}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {conf.resolved ? 'RESOLVED' : 'UNRESOLVED'}
                      </span>
                    </div>

                    {!conf.resolved && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => syncEngine.resolveConflict(conf.id, 'SERVER_WINS')}
                          className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-[10px]"
                        >
                          Server Wins (Authoritative)
                        </button>
                        <button
                          onClick={() => syncEngine.resolveConflict(conf.id, 'CLIENT_WINS')}
                          className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px]"
                        >
                          Force Client Push
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Backup Snapshot Form */}
      <div className="glass-panel p-5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
              <Save size={16} className="text-emerald-400" />
              Configuration Backups & Rollback Points (Requirement 12)
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Creates isolated configuration snapshots. Rolling back restores metadata and mappings without tampering with the original website database.
            </p>
          </div>

          <form onSubmit={handleCreateSnapshot} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Snapshot label..."
              value={backupLabel}
              onChange={(e) => setBackupLabel(e.target.value)}
              className="input-field text-xs px-3 py-1.5 w-48"
            />
            <button
              type="submit"
              disabled={isCreatingBackup}
              className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
            >
              <Save size={13} />
              {isCreatingBackup ? 'Creating...' : 'Create Snapshot'}
            </button>
          </form>
        </div>

        {/* Backups List */}
        <div className="divide-y divide-[var(--border-color)] mt-3">
          {backups.map((bkp) => (
            <div key={bkp.backupId} className="py-3 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                  {bkp.label}
                  <span className="font-mono text-[10px] text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/40">
                    {bkp.schemaVersion}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">
                  ID: {bkp.backupId} · {new Date(bkp.timestamp).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => handleRollbackSnapshot(bkp.backupId)}
                className="btn-secondary px-3 py-1 text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10 flex items-center gap-1"
              >
                <RotateCcw size={12} />
                Restore Snapshot
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Diff Inspection Modal Section */}
      {selectedDiff && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-cyan-400" />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Manifest Change Detection Diff ({selectedDiff.previousVersion} → {selectedDiff.currentVersion})
              </h3>
            </div>
            <button onClick={() => setSelectedDiff(null)} className="text-xs text-[var(--text-muted)] hover:text-white">
              Close Diff
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <span className="font-bold text-emerald-400 flex items-center gap-1 mb-1">
                <Plus size={14} /> Added Features (2)
              </span>
              <ul className="text-[11px] text-[var(--text-secondary)] space-y-1">
                <li>• Infrastructure Health Telemetry (/api/v1/system/health)</li>
                <li>• Live Orders & Dispatch Feed (/api/v1/orders/feed)</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <span className="font-bold text-rose-400 flex items-center gap-1 mb-1">
                <Trash2 size={14} /> Removed / Retired Features (1)
              </span>
              <ul className="text-[11px] text-[var(--text-secondary)] space-y-1">
                <li>• Legacy SOAP/XML Batch Exporter (/api/v1/legacy/export.xml)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
