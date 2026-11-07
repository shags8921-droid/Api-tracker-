import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Globe,
  Wrench,
  XCircle,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';
import { DiscoveredFeature, FeatureStatus } from '../types';
import { FeatureCard } from '../components/FeatureCard';

interface Props {
  features: DiscoveredFeature[];
  onInspect: (feature: DiscoveredFeature) => void;
  onExecute: (feature: DiscoveredFeature) => void;
}

export const FeatureRegistryScreen: React.FC<Props> = ({ features, onInspect, onExecute }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHub, setSelectedHub] = useState<'ALL' | 'hub_owner' | 'hub_manager'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FeatureStatus>('ALL');

  const filtered = features.filter((feat) => {
    const matchesSearch =
      feat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feat.route.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feat.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesHub = selectedHub === 'ALL' || feat.hubId === selectedHub;
    const matchesStatus = statusFilter === 'ALL' || feat.implementationStatus === statusFilter;

    return matchesSearch && matchesHub && matchesStatus;
  });

  const statuses: Array<{ id: 'ALL' | FeatureStatus; label: string }> = [
    { id: 'ALL', label: 'All Statuses' },
    { id: 'FULLY_INTEGRATED', label: 'Fully Integrated' },
    { id: 'NATIVE_READY', label: 'Native Ready' },
    { id: 'WEBVIEW_FALLBACK', label: 'WebView Fallback' },
    { id: 'NEEDS_CONFIGURATION', label: 'Needs Config' },
    { id: 'UNAVAILABLE', label: 'Unavailable' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Layers className="text-cyan-400" />
            Verified Feature Registry & Implementation Matrix
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Browse, filter, and inspect {features.length} registered capabilities across management hubs.
          </p>
        </div>

        <div className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
          Showing {filtered.length} of {features.length} features
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-panel p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search features by name, route (/api/v1/...), or description..."
              className="input-field pl-9 text-xs"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value as any)}
              className="input-field w-auto text-xs"
            >
              <option value="ALL">All Hubs</option>
              <option value="hub_owner">Owner Hub</option>
              <option value="hub_manager">Manager Hub</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input-field w-auto text-xs"
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((feat) => (
            <FeatureCard
              key={feat.id}
              feature={feat}
              onInspect={onInspect}
              onExecute={onExecute}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-12 text-center text-[var(--text-muted)] space-y-2">
          <p className="font-semibold text-sm text-[var(--text-primary)]">No matching features found</p>
          <p className="text-xs">Try resetting your search query or status filter.</p>
        </div>
      )}
    </div>
  );
};
