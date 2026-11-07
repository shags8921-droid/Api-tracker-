import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  RefreshCw,
  CheckCircle2,
  Download,
  Printer,
  ChevronRight,
  ExternalLink,
  Scale,
  Award,
  AlertCircle
} from 'lucide-react';
import { LegalDocumentItem } from '../types/commercial';

export const LegalAndTrustScreen: React.FC = () => {
  const [activeSlug, setActiveSlug] = useState<LegalDocumentItem['slug']>('terms');

  const legalDocs: Record<LegalDocumentItem['slug'], LegalDocumentItem> = {
    terms: {
      slug: 'terms',
      title: 'Commercial Terms of Service',
      lastUpdated: 'November 2026 (v5.0 Commercial Release)',
      summary: 'Binding agreement governing organization access, multi-tenant workspace subscriptions, authorized website integrations, and platform availability.',
      sections: [
        {
          heading: '1. Authorization to Connect Websites',
          body: 'You affirm and warrant that you own, operate, or possess explicit administrative authorization from the business entity to connect the targeted website domain to SitePulse AI. You must not attempt to connect or discover APIs on domains for which you lack lawful authorization.'
        },
        {
          heading: '2. Source-of-Truth Integrity and Non-Destructive Operation',
          body: 'SitePulse AI functions as an orchestration, monitoring, and intelligent replication interface. Your connected original website remains the sole authoritative source of truth. SitePulse AI will never silently overwrite or mutate original database records without explicit user confirmation or verified idempotency checks.'
        },
        {
          heading: '3. Multi-Tenant Organization Isolation',
          body: 'Each organization workspace is assigned a cryptographically unique identifier and is logically isolated. Customers may not attempt to query or access data from adjacent tenant environments.'
        },
        {
          heading: '4. Service Availability & SLA',
          body: 'We commit to 99.9% uptime for the SitePulse AI orchestration plane. Scheduled maintenance windows will be announced at least 48 hours in advance through the in-app notification center.'
        }
      ]
    },
    privacy: {
      slug: 'privacy',
      title: 'Privacy Policy & GDPR Data Protection',
      lastUpdated: 'November 2026',
      summary: 'How SitePulse AI collects, processes, encrypts, and isolates customer data in compliance with GDPR, CCPA, and international security standards.',
      sections: [
        {
          heading: '1. Data We Collect and Process',
          body: 'We process organization metadata, authorized website integration endpoints, OpenAPI manifests, and synchronization logs necessary to run the management hubs. We do NOT store unencrypted database passwords or unauthorized customer payment credentials.'
        },
        {
          heading: '2. Tenant Data Ownership & Portability',
          body: 'You own 100% of your business data. At any time, organization administrators may initiate a complete, unencumbered JSON export of their full configuration, feature registry, and activity logs via the Data Ownership & GDPR Export feature.'
        },
        {
          heading: '3. Data Deletion & Right to Be Forgotten',
          body: 'Upon organization workspace deletion, all associated local cache, synchronization logs, and customer support tickets are permanently purged from active storage within 7 days.'
        },
        {
          heading: '4. Subprocessors and AI Models',
          body: 'AI queries through the Business Assistant are executed against verified business context. We never use proprietary customer business records to train public foundation models.'
        }
      ]
    },
    refund: {
      slug: 'refund',
      title: 'Refund & Subscription Cancellation Policy',
      lastUpdated: 'November 2026',
      summary: 'Transparent 14-day money-back guarantee, automatic renewal rules, and regional Nepal payment reversal standards.',
      sections: [
        {
          heading: '1. 14-Day Money-Back Guarantee',
          body: 'If you are unsatisfied with SitePulse AI during the first 14 days of your initial paid subscription (Starter, Professional, or Business), you may request a 100% full refund through our Customer Support Center with zero questions asked.'
        },
        {
          heading: '2. Nepal Payment Reversals (eSewa / Khalti / Fonepay)',
          body: 'Subscriptions paid in NPR via regional gateways (eSewa, Khalti, or Fonepay) are refunded back to the originating digital wallet or bank account within 3-5 business days upon support review and transaction reference verification.'
        },
        {
          heading: '3. Cancellation at Term End',
          body: 'You can cancel auto-renewals anytime from the Billing screen. Upon cancellation, your workspace retains paid features through the conclusion of the active billing cycle with no surprise penalty fees.'
        }
      ]
    },
    security: {
      slug: 'security',
      title: 'Security Architecture & Trust Whitepaper',
      lastUpdated: 'November 2026',
      summary: 'Technical overview of zero-trust tenant sandboxing, cryptographic request signing, TLS 1.3 encryption, and server-side payment verification.',
      sections: [
        {
          heading: '1. Zero-Trust API Communication',
          body: 'All communications between SitePulse AI, your connected business website, and the backend service are encrypted via modern TLS 1.3. API keys and bearer tokens are encrypted at rest using AES-256-GCM.'
        },
        {
          heading: '2. Strict Server-Side Payment Verification',
          body: 'We strictly reject client-side payment assertions. Every transaction initiated through eSewa, Khalti, Fonepay, or Stripe is cryptographically validated via backend webhooks and gateway reference APIs before subscription limits are provisioned.'
        },
        {
          heading: '3. Idempotent Writeback Protection',
          body: 'To protect inventory counts and transaction ledgers on your website, SitePulse AI utilizes unique client-side idempotency keys and two-phase commits. Duplicate button presses will never result in duplicate orders.'
        }
      ]
    },
    'acceptable-use': {
      slug: 'acceptable-use',
      title: 'Acceptable Use Policy',
      lastUpdated: 'November 2026',
      summary: 'Guidelines on lawful usage, rate limits, and prohibition of unauthorized penetration testing or denial-of-service activities.',
      sections: [
        {
          heading: '1. Prohibited Actions',
          body: 'Users are strictly prohibited from using SitePulse AI to reverse-engineer unauthorized third-party websites, initiate distributed denial-of-service attacks, bypass paywalls, or exfiltrate protected personal information.'
        },
        {
          heading: '2. API Rate Limiting Compliance',
          body: 'Our discovery engine respects standard HTTP 429 Retry-After headers and robots.txt directives. Users may not modify crawler configurations to overwhelm target server infrastructure.'
        }
      ]
    },
    cookies: {
      slug: 'cookies',
      title: 'Cookie & Local Storage Policy',
      lastUpdated: 'November 2026',
      summary: 'Details regarding essential session tokens, role preferences, and offline caching storage on web and Android.',
      sections: [
        {
          heading: '1. Essential Storage',
          body: 'SitePulse AI uses LocalStorage and IndexedDB strictly for essential application functions: maintaining authenticated sessions, role toggles (Owner vs. Manager), and offline sync queues.'
        },
        {
          heading: '2. Zero Third-Party Tracking',
          body: 'We do not sell advertising space or inject cross-site tracking pixels from third-party advertising networks.'
        }
      ]
    }
  };

  const currentDoc = legalDocs[activeSlug];

  const handlePrint = () => {
    window.print();
  };

  const handleExportText = () => {
    const text = `${currentDoc.title}\nLast Updated: ${currentDoc.lastUpdated}\n\nSummary:\n${currentDoc.summary}\n\n` +
      currentDoc.sections.map(s => `${s.heading}\n${s.body}\n`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SitePulse_${currentDoc.slug}_policy.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
              <Scale className="text-cyan-400" size={26} />
              Legal & Trust Center
            </h1>
            <span className="badge-green font-mono text-xs">Verified Compliant</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete transparency on terms of service, customer privacy, refund guarantees, and enterprise security architecture.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportText}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Download size={14} />
            Download Text
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Printer size={14} />
            Print Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Navigation Sidebar (4 cols) */}
        <div className="md:col-span-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 px-2 uppercase tracking-wider mb-2 font-mono">
            Compliance & Disclosures
          </div>

          {(Object.keys(legalDocs) as Array<LegalDocumentItem['slug']>).map(slug => {
            const doc = legalDocs[slug];
            const isActive = activeSlug === slug;
            return (
              <button
                key={slug}
                onClick={() => setActiveSlug(slug)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 border-cyan-500/50 shadow-md text-white'
                    : 'bg-slate-900/40 border-[var(--border-color)] text-slate-300 hover:border-slate-600 hover:text-white'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">{doc.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{doc.lastUpdated}</div>
                </div>
                <ChevronRight size={14} className={isActive ? 'text-cyan-400' : 'text-slate-600'} />
              </button>
            );
          })}

          <div className="glass-panel p-4 mt-6 space-y-2 border-emerald-500/30">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <ShieldCheck size={16} />
              Enterprise Data Guarantee
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Your business website remains your sole source of truth. SitePulse AI never sells tenant data or uses customer transactions for AI model training.
            </p>
          </div>
        </div>

        {/* Document Content (8 cols) */}
        <div className="md:col-span-8">
          <div className="glass-panel p-6 md:p-8 space-y-6">
            <div className="border-b border-[var(--border-color)] pb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="badge-cyan font-mono text-[11px]">Official Document</span>
                <span className="text-[11px] text-slate-400 font-mono">Last Updated: {currentDoc.lastUpdated}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white">{currentDoc.title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-[var(--border-color)]">
                {currentDoc.summary}
              </p>
            </div>

            <div className="space-y-6">
              {currentDoc.sections.map((section, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                    <CheckCircle2 size={15} />
                    {section.heading}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed pl-6 border-l border-cyan-500/20">
                    {section.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>SitePulse AI Legal Council & Security Operations</span>
              <span>Ref: SP-LEGAL-{currentDoc.slug.toUpperCase()}-2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
