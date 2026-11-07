import React, { useState, useEffect } from 'react';
import { Search, X, Layers, ArrowRight, Shield, Briefcase, FileCode } from 'lucide-react';
import { DiscoveredFeature } from '../types';
import { FeatureStatusBadge } from './FeatureStatusBadge';

interface Props {
  features: DiscoveredFeature[];
  isOpen: boolean;
  onClose: () => void;
  onSelectFeature: (feature: DiscoveredFeature) => void;
}

export const GlobalSearchModal: React.FC<Props> = ({
  features,
  isOpen,
  onClose,
  onSelectFeature
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const results = query.trim()
    ? features.filter((f) => {
        const q = query.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.route.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.apiOperations.some((op) => op.endpoint.toLowerCase().includes(q))
        );
      })
    : features.slice(0, 6);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start justify-center pt-16 px-4 z-50 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-cyan-500/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Input Bar */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-3 bg-[var(--bg-surface)]">
          <Search size={18} className="text-cyan-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all discovered features, routes, API endpoints..."
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
          />
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
          <div className="px-2 py-1 text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
            {query.trim() ? `SEARCH RESULTS (${results.length})` : 'POPULAR & SUGGESTED DISCOVERED FEATURES'}
          </div>

          {results.length > 0 ? (
            results.map((f) => (
              <div
                key={f.id}
                onClick={() => {
                  onSelectFeature(f);
                  onClose();
                }}
                className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-cyan-500/40 cursor-pointer transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${f.hubId === 'hub_owner' ? 'bg-indigo-500/15 text-indigo-400' : 'bg-cyan-500/15 text-cyan-400'}`}>
                    {f.hubId === 'hub_owner' ? <Shield size={16} /> : <Briefcase size={16} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[var(--text-primary)]">{f.name}</span>
                      <FeatureStatusBadge status={f.implementationStatus} size="sm" />
                    </div>
                    <div className="font-mono text-[10px] text-[var(--text-muted)]">{f.route}</div>
                  </div>
                </div>

                <ArrowRight size={14} className="text-[var(--text-muted)]" />
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              No discovered features match "{query}".
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-surface)] text-[10px] font-mono text-[var(--text-muted)] flex justify-between">
          <span>Press <kbd className="px-1 rounded bg-slate-800">ESC</kbd> to close</span>
          <span>SitePulse AI Global Navigation Matrix</span>
        </div>
      </div>
    </div>
  );
};
