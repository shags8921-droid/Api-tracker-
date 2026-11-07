import React, { useState } from 'react';
import {
  Settings,
  Smartphone,
  Cpu,
  Wifi,
  WifiOff,
  Database,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Download
} from 'lucide-react';
import { WebsiteConfig } from '../types';

interface Props {
  activeConfig: WebsiteConfig | null;
  onClearStorage: () => void;
  onDisconnect: () => void;
}

export const SettingsScreen: React.FC<Props> = ({ activeConfig, onClearStorage, onDisconnect }) => {
  const [offlineCacheEnabled, setOfflineCacheEnabled] = useState(true);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
          <Settings className="text-cyan-400" />
          Integration Settings & Platform Configuration
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Manage AI adapter parameters, offline data caching, and future Android Capacitor export settings.
        </p>
      </div>

      {/* Offline Mode Architecture (Requirement 9G) */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              {offlineCacheEnabled ? <Wifi size={20} /> : <WifiOff size={20} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Offline-Ready Query Caching (Requirement 9G)
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Caches non-sensitive UI schemas and previously retrieved catalog entities. Displays clear online/offline badges without faking synchronisation.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={offlineCacheEnabled}
              onChange={(e) => setOfflineCacheEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
          </label>
        </div>
      </div>

      {/* Future Android Compatibility Card (Requirement 11) */}
      <div className="glass-panel p-6 space-y-4 border-cyan-500/20">
        <div className="flex items-center gap-3 text-cyan-400">
          <Smartphone size={22} />
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Android & Capacitor Compatibility Architecture (Requirement 11)
            </h3>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              Zero-Rewrite Native Adapter Readiness
            </span>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          All frontend modules rely strictly on platform-independent TypeScript interfaces (`IStorageProvider`, decoupled REST dispatch, and hardware-agnostic authentication wrappers). When converting to Android with Capacitor, no core application logic requires rewriting.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="font-bold text-cyan-400 mb-1">Storage Abstraction</div>
            <p className="text-[11px] text-[var(--text-muted)]">Hooks cleanly into Capacitor Storage or Android KeyStore.</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="font-bold text-emerald-400 mb-1">Embedded WebViews</div>
            <p className="text-[11px] text-[var(--text-muted)]">Maps automatically to Android Chrome Custom Tabs or Android WebView.</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <div className="font-bold text-indigo-400 mb-1">PKCE Authenticator</div>
            <p className="text-[11px] text-[var(--text-muted)]">Supports Deep Link Custom URI schemes on mobile.</p>
          </div>
        </div>
      </div>

      {/* Danger Zone: Storage Reset & Disconnect */}
      <div className="glass-panel p-6 space-y-4 border-rose-500/20">
        <h3 className="text-xs font-bold text-rose-400 font-mono tracking-wider">
          DATA MANAGEMENT & DISCONNECTION
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onDisconnect}
            className="btn-secondary text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
          >
            Disconnect Active Website
          </button>

          <button
            onClick={onClearStorage}
            className="btn-danger text-xs"
          >
            <Trash2 size={13} />
            Purge Cached Local Metadata
          </button>
        </div>
      </div>
    </div>
  );
};
