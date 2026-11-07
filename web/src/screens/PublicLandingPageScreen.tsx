import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Cpu,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  Globe,
  Lock,
  Zap,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Building2,
  Briefcase
} from 'lucide-react';
import { ScreenId } from '../components/Navigation';

interface Props {
  onGetStarted: () => void;
  onExplorePlans: () => void;
  onOpenDemo: () => void;
  onNavigate: (screen: ScreenId) => void;
}

export const PublicLandingPageScreen: React.FC<Props> = ({
  onGetStarted,
  onExplorePlans,
  onOpenDemo,
  onNavigate
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How does SitePulse AI connect to my existing business website?',
      a: 'SitePulse AI connects securely to your authorized website using OAuth 2.0 PKCE, API Keys, or Bearer Tokens. Once connected, its 11-stage self-discovery engine analyzes the exposed OpenAPI specifications, integration manifests, and REST endpoints to faithfully reproduce your management tools.'
    },
    {
      q: 'Is my original website data modified or overwritten?',
      a: 'Never. Your connected website remains the single authoritative source of truth for all customer records, sales transactions, permissions, and orders. SitePulse AI uses idempotent buffers and conflict detection to protect your database from accidental overwrites.'
    },
    {
      q: 'Which payment gateways are supported for subscriptions?',
      a: 'We support regional payment processing in Nepal via eSewa, Khalti, and Fonepay (NPR billing), as well as international cards (USD billing) with server-side transaction verification.'
    },
    {
      q: 'Can I manage multiple websites or business branches under one account?',
      a: 'Yes. Every organization workspace supports multiple distinct website connections (e.g. main e-commerce storefront, warehouse inventory ERP, and logistics relay) with unified AI assistant queries.'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-16 animate-fadeIn pb-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
          <Sparkles size={13} />
          Commercial SaaS Release v5.0 — Multi-Tenant & Autonomous Discovery
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Intelligent Website Management & Autonomous Feature Replication
        </h1>

        <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Connect your existing business website, automatically discover its authorized APIs, and reproduce full Executive Owner & Operations Manager hubs in one responsive, AI-augmented management platform.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onGetStarted}
            className="btn-primary px-6 py-3 text-sm flex items-center gap-2 shadow-xl shadow-cyan-500/25"
          >
            Start Free Evaluation
            <ArrowRight size={16} />
          </button>
          <button
            onClick={onExplorePlans}
            className="btn-secondary px-6 py-3 text-sm flex items-center gap-2"
          >
            <DollarSign size={16} className="text-emerald-400" />
            View Pricing & Plans
          </button>
          <button
            onClick={onOpenDemo}
            className="btn-secondary px-6 py-3 text-sm text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
          >
            Launch Interactive Demo
          </button>
        </div>

        {/* Live Product Preview Card */}
        <div className="pt-6">
          <div className="glass-panel p-6 border-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/10 rounded-2xl max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-mono text-slate-400 ml-2">https://demo.sitepulse.internal/api/v1/health</span>
              </div>
              <span className="text-emerald-400 font-mono text-[11px] font-bold">LIVE AUTHORITATIVE GATEWAY</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 uppercase">Self-Discovery</span>
                <div className="font-bold text-sm text-white">15 Verified Capabilities</div>
                <p className="text-[11px] text-slate-400">11-stage pipeline maps OpenAPI schemas automatically.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
                <span className="text-[10px] font-mono text-emerald-400 uppercase">Role-Based Hubs</span>
                <div className="font-bold text-sm text-white">Owner & Manager RBAC</div>
                <p className="text-[11px] text-slate-400">Server-enforced 403 authorization on sensitive records.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
                <span className="text-[10px] font-mono text-indigo-400 uppercase">AI Business Assistant</span>
                <div className="font-bold text-sm text-white">Voice & Controlled Actions</div>
                <p className="text-[11px] text-slate-400">Grounded in live orders, inventory thresholds, and telemetry.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-white">Enterprise Management Capabilities</h2>
          <p className="text-xs text-slate-400">Built for businesses requiring real integrations, not static mock demos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="glass-panel p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
              <Zap size={18} />
            </div>
            <h3 className="font-bold text-sm text-white">Automatic Website Discovery</h3>
            <p className="text-slate-400 leading-relaxed">
              Discovers routes, forms, OpenAPI contracts, and assets directly from your live integration manifest.
            </p>
          </div>

          <div className="glass-panel p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Shield size={18} />
            </div>
            <h3 className="font-bold text-sm text-white">Executive Owner Hub</h3>
            <p className="text-slate-400 leading-relaxed">
              Complete administrative authority over staff directories, token revocations, webhook rules, and financial KPIs.
            </p>
          </div>

          <div className="glass-panel p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
              <Briefcase size={18} />
            </div>
            <h3 className="font-bold text-sm text-white">Operations Manager Hub</h3>
            <p className="text-slate-400 leading-relaxed">
              Live orders dispatch queue, tracking code assignment, and catalog inventory with low-stock warnings.
            </p>
          </div>

          <div className="glass-panel p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Cpu size={18} />
            </div>
            <h3 className="font-bold text-sm text-white">Grounded AI Assistant</h3>
            <p className="text-slate-400 leading-relaxed">
              Voice-enabled business assistant answering questions strictly using verified database records with action previews.
            </p>
          </div>

          <div className="glass-panel p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              <RefreshCw size={18} />
            </div>
            <h3 className="font-bold text-sm text-white">Idempotent Safe Sync</h3>
            <p className="text-slate-400 leading-relaxed">
              Offline action queue with exponential backoff and conflict resolution. Destructive actions refused offline.
            </p>
          </div>

          <div className="glass-panel p-5 space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <Building2 size={18} />
            </div>
            <h3 className="font-bold text-sm text-white">Multi-Tenant Workspaces</h3>
            <p className="text-slate-400 leading-relaxed">
              Serve multiple organizations with strict tenant isolation, quota enforcement, and local Nepal payment gateways.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="glass-panel p-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-white">How It Works in 5 Steps</h2>
          <p className="text-xs text-slate-400">Zero manual coding required to recreate your business hubs.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          {[
            { num: '01', title: 'Register Org', desc: 'Create your isolated workspace and team directory.' },
            { num: '02', title: 'Connect URL', desc: 'Input your target website address with HTTPS validation.' },
            { num: '03', title: 'Authenticate', desc: 'Authorize via OAuth 2.0 PKCE or secure API token.' },
            { num: '04', title: 'Self-Discovery', desc: 'Engine analyzes OpenAPI schemas and manifests.' },
            { num: '05', title: 'Manage Business', desc: 'Operate your Owner & Manager Hubs with live sync.' }
          ].map((s, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1.5">
              <span className="font-mono text-cyan-400 font-extrabold text-sm">{s.num}</span>
              <h4 className="font-bold text-white text-xs">{s.title}</h4>
              <p className="text-[11px] text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-black text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-400">Transparent answers about integration, data security, and billing.</p>
        </div>

        <div className="space-y-2 max-w-3xl mx-auto">
          {faqs.map((f, i) => (
            <div key={i} className="glass-panel overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-white hover:text-cyan-400"
              >
                <span>{f.q}</span>
                <ChevronDown size={14} className={`transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="p-4 pt-0 text-xs text-slate-300 leading-relaxed border-t border-[var(--border-color)]">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA & Legal Links */}
      <section className="text-center p-8 glass-panel border-cyan-500/30 space-y-4 rounded-2xl">
        <h3 className="text-2xl font-black text-white">Ready to Transform Your Website Management?</h3>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          Join businesses managing orders, inventory, and staff through autonomous website discovery and AI intelligence.
        </p>
        <button onClick={onGetStarted} className="btn-primary px-8 py-3 text-sm inline-flex items-center gap-2">
          Start Your Free Evaluation Workspace
          <ArrowRight size={16} />
        </button>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-6 text-[11px] text-slate-400 font-mono">
          <button onClick={() => onNavigate('legal')} className="hover:text-cyan-400">Terms of Service</button>
          <span>·</span>
          <button onClick={() => onNavigate('legal')} className="hover:text-cyan-400">Privacy Policy</button>
          <span>·</span>
          <button onClick={() => onNavigate('legal')} className="hover:text-cyan-400">Refund Policy</button>
          <span>·</span>
          <button onClick={() => onNavigate('support')} className="hover:text-cyan-400">Customer Support Center</button>
        </div>
      </section>
    </div>
  );
};
