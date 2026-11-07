import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Cpu,
  Compass,
  CheckCircle2,
  Smartphone,
  Globe2
} from 'lucide-react';
import { ScreenId } from '../components/Navigation';

interface Props {
  onNavigate: (screen: ScreenId) => void;
  onSelectPreset: (url: string, name: string) => void;
}

export const WelcomeScreen: React.FC<Props> = ({ onNavigate, onSelectPreset }) => {
  const presets = [
    {
      url: 'https://demo.sitepulse.internal',
      name: 'Enterprise Sandbox Portal',
      description: 'Pre-configured cloud portal with 14 endpoints, Owner Hub, and OpenAPI spec.',
      badge: 'Recommended'
    },
    {
      url: 'https://store.sitepulse.internal',
      name: 'E-Commerce & Orders Hub',
      description: 'Live order streams, product SKU catalog, and webhook integrations.',
      badge: 'Commerce'
    },
    {
      url: 'https://saas.sitepulse.internal',
      name: 'Multi-Tenant SaaS Admin',
      description: 'Team permissions, billing tiers, API quotas, and emergency token purge.',
      badge: 'SaaS'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/20 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
            <Sparkles size={14} />
            <span>PHASE 3 — AUTONOMOUS WEB ENGINE & CAPACITOR ARCHITECTURE</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Connect any website. <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              Reproduce its management interface natively.
            </span>
          </h1>

          <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
            SitePulse AI connects to your website, runs an 11-stage self-discovery scan, parses OpenAPI schemas, classifies features, and generates native-style web components with automatic fallback to secure authenticated browser embedding.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => onNavigate('connect')}
              className="btn-primary px-6 py-3 text-sm shadow-xl shadow-cyan-500/25"
            >
              Connect Website
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => onNavigate('agent')}
              className="btn-secondary px-5 py-3 text-sm"
            >
              Explore AI Agent
            </button>
          </div>
        </div>
      </div>

      {/* Quick Connect Presets */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Globe2 size={18} className="text-cyan-400" />
            Quick-Connect Testbeds & Verified Sandboxes
          </h2>
          <span className="text-xs text-[var(--text-muted)] font-mono">Instant Discovery Ready</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((p, idx) => (
            <div
              key={idx}
              onClick={() => {
                onSelectPreset(p.url, p.name);
                onNavigate('connect');
              }}
              className="glass-panel glass-panel-hover p-5 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {p.badge}
                  </span>
                  <ArrowRight size={14} className="text-[var(--text-muted)]" />
                </div>
                <h3 className="font-bold text-sm text-[var(--text-primary)] mb-1">{p.name}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                  {p.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[var(--border-color)] text-[11px] font-mono text-cyan-400 truncate">
                {p.url}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            icon: Compass,
            title: '11-Stage Self-Discovery',
            desc: 'Health, manifests, OpenAPI, hubs, endpoints, sitemaps, and design assets.'
          },
          {
            icon: Cpu,
            title: 'Implementation Decision Engine',
            desc: 'Automated routing to Native Web, WebView fallback, or manual configuration.'
          },
          {
            icon: Shield,
            title: 'Executive Governance Hub',
            desc: 'Owner access safeguards, role-based boundary enforcement, and approval modals.'
          },
          {
            icon: Smartphone,
            title: 'Capacitor Ready',
            desc: 'Reusable storage and API abstractions for zero-rewrite Android packaging.'
          }
        ].map((item, idx) => {
          const IconC = item.icon;
          return (
            <div key={idx} className="glass-panel p-4">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
                <IconC size={18} />
              </div>
              <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">{item.title}</h4>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
