import React from 'react';
import {
  Sparkles,
  Link2,
  KeyRound,
  Compass,
  FileCheck,
  Cpu,
  Layers,
  Search,
  Shield,
  Briefcase,
  Activity,
  History,
  FileText,
  Settings,
  Terminal,
  Menu,
  X,
  Radio,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Lock,
  Rocket,
  Building2,
  Server,
  Globe,
  CreditCard,
  Headphones,
  Scale
} from 'lucide-react';
import { WebsiteConfig, DiscoveredFeature } from '../types';

export type ScreenId =
  | 'landing'
  | 'welcome'
  | 'connect'
  | 'auth'
  | 'discovery'
  | 'results'
  | 'workspaces'
  | 'platform'
  | 'assistant'
  | 'agent'
  | 'registry'
  | 'inspector'
  | 'owner'
  | 'manager'
  | 'monitor'
  | 'sync'
  | 'quality'
  | 'launch'
  | 'audit'
  | 'pricing'
  | 'support'
  | 'legal'
  | 'settings'
  | 'diagnostics';

interface Props {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  activeConfig: WebsiteConfig | null;
  savedWebsites: WebsiteConfig[];
  onSwitchWebsite: (id: string) => void;
  userRole: 'OWNER' | 'MANAGER';
  userLabel: string;
  isPlatformAdmin: boolean;
  onSignOut: () => void;
  onOpenGlobalSearch: () => void;
  recentFeatures: DiscoveredFeature[];
  onSelectRecentFeature: (feature: DiscoveredFeature) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navigation: React.FC<Props> = ({
  currentScreen,
  onNavigate,
  activeConfig,
  savedWebsites,
  onSwitchWebsite,
  userRole,
  userLabel,
  isPlatformAdmin,
  onSignOut,
  onOpenGlobalSearch,
  recentFeatures,
  onSelectRecentFeature,
  isMobileOpen,
  setIsMobileOpen,
  theme,
  onToggleTheme
}) => {
  interface NavItem {
    id: ScreenId;
    label: string;
    icon: any;
    isOwnerOnly?: boolean;
    isPlatformOnly?: boolean;
  }

  const navSections: Array<{ title: string; items: NavItem[] }> = [
    {
      title: 'CONNECT & DISCOVERY',
      items: [
        { id: 'welcome', label: '1. Welcome', icon: Sparkles },
        { id: 'connect', label: '2. Connect Website', icon: Link2 },
        { id: 'auth', label: '3. Authentication', icon: KeyRound },
        { id: 'discovery', label: '4. Discovery Pipeline', icon: Compass },
        { id: 'results', label: '5. Discovery Results', icon: FileCheck }
      ]
    },
    {
      title: 'SAAS WORKSPACES & FLEET',
      items: [
        { id: 'workspaces', label: '6. Business Workspaces', icon: Building2 },
        { id: 'platform', label: '7. Platform Operator', icon: Server, isPlatformOnly: true }
      ]
    },
    {
      title: 'INTELLIGENCE & REGISTRY',
      items: [
        { id: 'assistant', label: '8. AI Business Assistant', icon: Sparkles },
        { id: 'agent', label: '9. AI Agent Dashboard', icon: Cpu },
        { id: 'registry', label: '10. Feature Registry', icon: Layers },
        { id: 'inspector', label: '11. Feature Inspector', icon: Search }
      ]
    },
    {
      title: 'MANAGEMENT HUBS',
      items: [
        { id: 'owner', label: '12. Owner Hub', icon: Shield, isOwnerOnly: true },
        { id: 'manager', label: '13. Manager Hub', icon: Briefcase }
      ]
    },
    {
      title: 'OPERATIONS & RELIABILITY',
      items: [
        { id: 'monitor', label: '14. Integration Monitor', icon: Activity },
        { id: 'sync', label: '15. Sync & Rollback', icon: History },
        { id: 'quality', label: '16. QA & Quality Suite', icon: UserCheck },
        { id: 'launch', label: '17. Launch Readiness', icon: Rocket },
        { id: 'audit', label: '18. Audit History', icon: FileText },
        { id: 'settings', label: '19. Settings', icon: Settings },
        { id: 'diagnostics', label: '20. Diagnostics', icon: Terminal }
      ]
    },
    {
      title: 'COMMERCIAL & TRUST',
      items: [
        { id: 'landing', label: '0. Public Landing Page', icon: Globe },
        { id: 'pricing', label: '21. Pricing & Nepal Pay', icon: CreditCard },
        { id: 'support', label: '22. Customer Support Desk', icon: Headphones },
        { id: 'legal', label: '23. Legal & Trust Center', icon: Scale }
      ]
    }
  ];

  const screenLabels: Record<ScreenId, string> = {
    landing: 'Public Landing Page',
    welcome: 'Welcome',
    connect: 'Connect Website',
    auth: 'Authentication',
    discovery: 'Discovery Pipeline',
    results: 'Discovery Results',
    workspaces: 'Business Workspaces',
    platform: 'Platform Operator Console',
    assistant: 'AI Business Assistant',
    agent: 'AI Agent Dashboard',
    registry: 'Feature Registry',
    inspector: 'Feature Inspector',
    owner: 'Owner Hub',
    manager: 'Manager Hub',
    monitor: 'Integration Monitor',
    sync: 'Sync & Rollback',
    quality: 'QA & Quality Suite',
    launch: 'Launch Readiness',
    audit: 'Audit History',
    pricing: 'Pricing & Billing',
    support: 'Customer Support Desk',
    legal: 'Legal & Trust Center',
    settings: 'Settings',
    diagnostics: 'Diagnostics'
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
            SP
          </div>
          <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">SitePulse AI</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGlobalSearch}
            className="p-1.5 rounded-lg text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
            title="Global Search"
          >
            <Search size={16} />
          </button>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
            aria-label="Toggle navigation"
          >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Top Breadcrumb & Global Search Bar for Desktop */}
      <div className="hidden lg:flex items-center justify-between px-8 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] text-xs sticky top-0 z-30">
        <div className="flex items-center gap-2 font-mono text-[var(--text-muted)]">
          <span>SitePulse AI</span>
          <ChevronRight size={12} />
          <span className="text-cyan-400 font-bold">{activeConfig?.name || 'Sandbox Portal'}</span>
          <ChevronRight size={12} />
          <span className="text-[var(--text-primary)] font-semibold">{screenLabels[currentScreen]}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Global Search Button */}
          <button
            onClick={onOpenGlobalSearch}
            className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-cyan-500/40 hover:text-white font-mono text-xs transition-colors"
          >
            <Search size={13} className="text-cyan-400" />
            <span>Search Features & Ops...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px]">
              Ctrl+K
            </kbd>
          </button>

          {/* Signed-in identity (role is assigned by the server, not selectable here) */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <UserCheck size={13} className="text-indigo-400 ml-1" />
            <span className="text-[10px] font-mono text-[var(--text-muted)] max-w-[180px] truncate">{userLabel}</span>
            <span className="text-xs font-bold text-cyan-400 font-mono">{userRole === 'OWNER' ? 'OWNER' : 'MANAGER'}</span>
            <button
              onClick={onSignOut}
              className="ml-1 px-2 py-0.5 rounded-lg text-[10px] font-mono text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed lg:sticky top-0 h-screen w-72 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col z-50 transition-transform duration-200 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                SitePulse AI
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-mono font-semibold">
                  WEB v4.0
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-muted)] truncate max-w-[160px]">
                Autonomous Website Integrator
              </div>
            </div>
          </div>
        </div>

        {/* Active Connection & Role Selector */}
        <div className="px-3 pt-3 space-y-2">
          <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
              <span>TARGET CONNECTION</span>
              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                <Radio size={10} className="animate-pulse" />
                ACTIVE
              </span>
            </div>
            {savedWebsites.length > 0 ? (
              <select
                className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer focus:border-cyan-500 font-medium"
                value={activeConfig?.id || ''}
                onChange={(e) => onSwitchWebsite(e.target.value)}
              >
                {savedWebsites.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({new URL(w.url).hostname || w.url})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-[11px] text-[var(--text-secondary)] italic">
                No active website connected
              </div>
            )}
          </div>
        </div>

        {/* Nav Links Container */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navSections.map((sec, idx) => (
            <div key={idx}>
              <div className="px-2 text-[10px] font-bold text-[var(--text-muted)] tracking-wider mb-1">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.filter((item) => !item.isPlatformOnly || isPlatformAdmin).map((item) => {
                  const IconComp = item.icon;
                  const isActive = currentScreen === item.id;
                  const isRestricted = item.isOwnerOnly && userRole !== 'OWNER';

                  return (
                    <button
                      key={item.id}
                      disabled={isRestricted}
                      onClick={() => {
                        onNavigate(item.id as ScreenId);
                        setIsMobileOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
                          : isRestricted
                          ? 'text-slate-600 cursor-not-allowed opacity-60'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <IconComp size={15} className={isActive ? 'text-cyan-400' : isRestricted ? 'text-slate-600' : 'text-[var(--text-muted)]'} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isRestricted && <Lock size={12} className="text-rose-500/80 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Recently Accessed Features Drawer (Requirement 9) */}
          {recentFeatures.length > 0 && (
            <div className="pt-2 border-t border-[var(--border-color)]">
              <div className="px-2 text-[10px] font-bold text-[var(--text-muted)] tracking-wider mb-1.5">
                RECENTLY ACCESSED FEATURES (Requirement 9)
              </div>
              <div className="space-y-1">
                {recentFeatures.slice(0, 4).map((rf) => (
                  <button
                    key={rf.id}
                    onClick={() => onSelectRecentFeature(rf)}
                    className="w-full text-left p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-cyan-500/40 font-mono text-[11px] truncate flex items-center justify-between text-[var(--text-secondary)] hover:text-cyan-400"
                  >
                    <span className="truncate">{rf.name}</span>
                    <span className="text-[9px] text-[var(--text-muted)] ml-1 font-sans font-semibold">
                      {rf.hubId === 'hub_owner' ? 'Owner' : 'Mgr'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)]"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <span className="text-[10px] font-mono">Capacitor Ready</span>
        </div>
      </aside>
    </>
  );
};
