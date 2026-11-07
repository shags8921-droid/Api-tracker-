import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { DiscoveredFeature } from '../types';

interface Props {
  feature: DiscoveredFeature;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DestructiveConfirmModal: React.FC<Props> = ({ feature, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-rose-500 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-rose-400">Security Approval Required</h3>
            <span className="text-xs text-[var(--text-muted)] font-mono">Two-Tap Authority Safeguard</span>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
          The AI Integration Agent detected that this action performs an irreversible or sensitive operational modification:
        </p>

        <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs mb-5">
          <div className="font-bold text-[var(--text-primary)] mb-1">{feature.name}</div>
          <div className="font-mono text-cyan-400 text-[11px] mb-1">
            {feature.apiOperations[0]?.method || 'POST'} {feature.route}
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">{feature.description}</div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={onConfirm} className="btn-danger flex-1 py-2.5">
            Authorize & Execute
          </button>
          <button onClick={onCancel} className="btn-secondary flex-1 py-2.5">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
