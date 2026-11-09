import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Lock,
  Store,
  Layers,
  ChevronDown,
  ShoppingBag,
  Sliders,
  Check,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { WebsiteConfig } from '../types';
import { ScreenId } from '../components/Navigation';

interface Props {
  websiteUrl: string;
  setWebsiteUrl: (url: string) => void;
  integrationName: string;
  setIntegrationName: (name: string) => void;
  savedWebsites: WebsiteConfig[];
  onSwitchWebsite: (id: string) => void;
  onProceedToAuth: () => void;
  onNavigate: (screen: ScreenId) => void;
  userRole?: 'OWNER' | 'MANAGER';
}

interface InspectionStage {
  id: number;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  detail?: string;
}

const DEFAULT_STAGES: InspectionStage[] = [
  { id: 1, name: 'Checking website availability...', status: 'PENDING' },
  { id: 2, name: 'Detecting platform and technology...', status: 'PENDING' },
  { id: 3, name: 'Verifying access and permissions...', status: 'PENDING' },
  { id: 4, name: 'Retrieving available website data...', status: 'PENDING' },
  { id: 5, name: 'Discovering products, categories & settings...', status: 'PENDING' },
  { id: 6, name: 'Detecting order & fulfilment capabilities...', status: 'PENDING' },
  { id: 7, name: 'Discovering existing Owner & Manager portals...', status: 'PENDING' },
  { id: 8, name: 'Mapping administrative functionality & permissions...', status: 'PENDING' },
  { id: 9, name: 'Verifying real-time read/write store access...', status: 'PENDING' },
  { id: 10, name: 'Verifying two-way synchronization...', status: 'PENDING' },
  { id: 11, name: 'Generating website-specific capability manifest...', status: 'PENDING' },
  { id: 12, name: 'Preparing customized Control Hub...', status: 'PENDING' }
];

export const ConnectWebsiteScreen: React.FC<Props> = ({
  websiteUrl,
  setWebsiteUrl,
  integrationName,
  setIntegrationName,
  savedWebsites,
  onSwitchWebsite,
  onNavigate,
  userRole = 'OWNER'
}) => {
  // 1. Website URL state
  const [url, setUrl] = useState(websiteUrl || 'https://demo.sitepulse.internal');

  // 2. Platform Detection state
  const [detecting, setDetecting] = useState(false);
  const [platform, setPlatform] = useState<'woocommerce' | 'shopify' | 'custom' | null>('woocommerce');
  const [detectionLabel, setDetectionLabel] = useState<string>('Platform detected: WooCommerce');
  const [showManualPlatform, setShowManualPlatform] = useState(false);
  const debounceTimer = useRef<any>(null);

  // 3. Authorization / API Access credentials
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [apiKey, setApiKey] = useState('');

  // 4. Permissions
  const [permissions, setPermissions] = useState({
    products: true,
    pricing: true,
    orders: true,
    sync: true
  });

  // Inspection & Live Stage execution
  const [isInspecting, setIsInspecting] = useState(false);
  const [stages, setStages] = useState<InspectionStage[]>(DEFAULT_STAGES);
  const [inspectionError, setInspectionError] = useState<{ step: number; stageName: string; message: string } | null>(null);
  const [inspectionSuccess, setInspectionSuccess] = useState<any | null>(null);

  const isDemo = url.includes('sitepulse.internal') || url.includes('localhost') || url.includes('demo');

  // Live Auto-Detection logic when URL changes
  useEffect(() => {
    if (!url || url.length < 8 || !url.startsWith('http')) return;
    setWebsiteUrl(url);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setDetecting(true);
      setInspectionError(null);
      try {
        const res = await api.post<any>('/api/v1/discovery/detect-platform', { targetUrl: url });
        const data = res.data;
        if (data.detected) {
          setPlatform(data.platform);
          setDetectionLabel(data.platformLabel || `Platform detected: ${data.platform}`);
          setShowManualPlatform(false);
          if (data.siteName && !integrationName) {
            setIntegrationName(data.siteName);
          }
        } else {
          setPlatform(null);
          setDetectionLabel('Platform not identified');
          setShowManualPlatform(true);
        }
      } catch (err: any) {
        if (isDemo) {
          setPlatform('woocommerce');
          setDetectionLabel('Platform detected: WooCommerce (Sandbox)');
        } else {
          setPlatform(null);
          setDetectionLabel('Platform not identified');
          setShowManualPlatform(true);
        }
      } finally {
        setDetecting(false);
      }
    }, 600);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [url]);

  // Primary START Inspection & Connection Action
  const handleStart = async () => {
    setIsInspecting(true);
    setInspectionError(null);
    setInspectionSuccess(null);

    // Initialize stages in UI
    const initial = DEFAULT_STAGES.map((s, idx) => ({
      ...s,
      status: idx === 0 ? ('RUNNING' as const) : ('PENDING' as const)
    }));
    setStages(initial);

    try {
      // Execute real 12-stage inspection on backend
      const res = await api.post<any>('/api/v1/discovery/inspect-and-connect', {
        targetUrl: url,
        platform: platform || 'woocommerce',
        consumerKey: consumerKey || (isDemo ? 'ck_sandbox' : undefined),
        consumerSecret: consumerSecret || (isDemo ? 'cs_sandbox' : undefined),
        accessToken: accessToken || (isDemo ? 'shpat_sandbox' : undefined),
        apiKey: apiKey || (isDemo ? 'key_sandbox' : undefined),
        name: integrationName || `${platform?.toUpperCase() || 'Store'} Hub`,
        permissions
      });

      const data = res.data;
      if (data.success) {
        // Animate all stages to completed
        setStages(DEFAULT_STAGES.map(s => ({ ...s, status: 'COMPLETED' })));
        setInspectionSuccess(data);

        // Wait 1.5 seconds so user sees full verification, then open Control Hub
        setTimeout(() => {
          if (userRole === 'OWNER') {
            onNavigate('owner');
          } else {
            onNavigate('manager');
          }
        }, 1200);
      }
    } catch (err: any) {
      const errData = err.response?.data;
      const failedStep = errData?.failedStep || 3;
      const failedStage = errData?.failedStage || 'Verifying authorization and API connectivity';
      const msg = errData?.error || err.message || 'Connection check failed. Please verify your website URL and API credentials.';

      setStages(prev =>
        prev.map(s => {
          if (s.id < failedStep) return { ...s, status: 'COMPLETED' };
          if (s.id === failedStep) return { ...s, status: 'FAILED', detail: msg };
          return { ...s, status: 'PENDING' };
        })
      );

      setInspectionError({
        step: failedStep,
        stageName: failedStage,
        message: msg
      });
    }
  };

  const handleRetry = () => {
    setInspectionError(null);
    setIsInspecting(false);
    setStages(DEFAULT_STAGES);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn py-2">
      {/* Header */}
      <div className="text-center space-y-1.5 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-1">
          <Store size={14} />
          <span>SITEPULSE AI • INSTANT CONTROL HUB</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
          Website Connect
        </h1>
        <p className="text-xs md:text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
          Connect your website with four simple inputs. SitePulse AI automatically inspects your store and generates your customized Owner and Manager Hubs.
        </p>
      </div>

      {/* Main Container */}
      {!isInspecting ? (
        <div className="glass-panel p-6 md:p-8 space-y-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-xl">
          {/* Quick Sandbox Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <span className="text-[var(--text-muted)] font-medium flex items-center gap-1.5">
              <Sparkles size={13} className="text-cyan-400" />
              Quick Sandbox Testbeds:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setUrl('https://demo.sitepulse.internal');
                  setPlatform('woocommerce');
                  setDetectionLabel('Platform detected: WooCommerce');
                  setShowManualPlatform(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all text-[11px] font-medium"
              >
                WooCommerce Sandbox
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrl('https://store.sitepulse.internal');
                  setPlatform('woocommerce');
                  setDetectionLabel('Platform detected: WooCommerce');
                  setShowManualPlatform(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all text-[11px] font-medium"
              >
                E-Commerce Store
              </button>
            </div>
          </div>

          {/* ITEM 1: Website URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              1. Website URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourstore.com"
                className="input-field pl-10 pr-4 py-3 text-sm font-mono w-full rounded-xl bg-slate-950/70 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-[var(--text-primary)]"
              />
              <Globe size={18} className="absolute left-3.5 top-3.5 text-cyan-400 pointer-events-none" />
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Example: https://yourstore.com or https://mystore.myshopify.com
            </p>
          </div>

          {/* ITEM 2: Platform Detection */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                2. Platform Detection
              </label>
              {platform && !showManualPlatform && (
                <button
                  type="button"
                  onClick={() => setShowManualPlatform(true)}
                  className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Change platform
                  <ChevronDown size={12} />
                </button>
              )}
            </div>

            {/* Live Detection Status Badge */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                detecting
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : platform === 'woocommerce'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : platform === 'shopify'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  : platform === 'custom'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {detecting ? (
                  <RefreshCw size={17} className="animate-spin text-cyan-400" />
                ) : platform ? (
                  <CheckCircle2 size={17} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={17} className="text-amber-400" />
                )}
                <div>
                  <span className="text-xs font-bold font-mono">
                    {detecting ? 'Detecting website platform...' : detectionLabel}
                  </span>
                  {!detecting && platform && (
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Ready for automated inspection and Control Hub generation
                    </div>
                  )}
                </div>
              </div>

              {!detecting && platform && (
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 font-bold">
                  {platform}
                </span>
              )}
            </div>

            {/* Manual fallback platform selector */}
            {showManualPlatform && (
              <div className="grid grid-cols-3 gap-2 pt-1 animate-fadeIn">
                {[
                  { id: 'woocommerce', name: 'WooCommerce' },
                  { id: 'shopify', name: 'Shopify' },
                  { id: 'custom', name: 'Custom Website' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPlatform(p.id as any);
                      setDetectionLabel(`Platform selected: ${p.name}`);
                      setShowManualPlatform(false);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      platform === p.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-700 text-[var(--text-secondary)] hover:border-slate-500'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ITEM 3: Authorization / API Access */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                3. Authorization / API Access
              </label>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <ShieldCheck size={13} />
                No Admin Password Required
              </span>
            </div>

            {isDemo ? (
              <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-300 flex items-center gap-3">
                <Lock size={16} className="text-cyan-400 flex-shrink-0" />
                <div>
                  <div className="font-bold">Sandbox OAuth Credentials Active</div>
                  <div className="text-[11px] text-cyan-400/80">
                    Instant zero-config authentication enabled for SitePulse demo stores.
                  </div>
                </div>
              </div>
            ) : platform === 'shopify' ? (
              <div className="space-y-2">
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Shopify Admin API Access Token (shpat_...)"
                  className="input-field py-2.5 font-mono text-xs w-full rounded-xl bg-slate-950/70 border border-slate-700"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Obtained from Shopify Admin &gt; Settings &gt; Apps &gt; Develop apps. Secure token with scoped read/write permissions.
                </p>
              </div>
            ) : platform === 'custom' ? (
              <div className="space-y-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="API Key or Bearer Token (sk_...)"
                  className="input-field py-2.5 font-mono text-xs w-full rounded-xl bg-slate-950/70 border border-slate-700"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  API Key or Bearer token for authorized REST API endpoints.
                </p>
              </div>
            ) : (
              // WooCommerce
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <input
                      type="text"
                      value={consumerKey}
                      onChange={(e) => setConsumerKey(e.target.value)}
                      placeholder="Consumer Key (ck_...)"
                      className="input-field py-2.5 font-mono text-xs w-full rounded-xl bg-slate-950/70 border border-slate-700"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={consumerSecret}
                      onChange={(e) => setConsumerSecret(e.target.value)}
                      placeholder="Consumer Secret (cs_...)"
                      className="input-field py-2.5 font-mono text-xs w-full rounded-xl bg-slate-950/70 border border-slate-700"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Generated in WooCommerce &gt; Settings &gt; Advanced &gt; REST API. Requires Read/Write access.
                </p>
              </div>
            )}
          </div>

          {/* ITEM 4: Connection Permissions */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              4. Connection Permissions
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { key: 'products', label: 'Products & Catalog' },
                { key: 'pricing', label: 'Prices & Inventory' },
                { key: 'orders', label: 'Orders & Fulfilment' },
                { key: 'sync', label: 'Two-Way Sync' }
              ].map((perm) => (
                <div
                  key={perm.key}
                  onClick={() =>
                    setPermissions((prev) => ({
                      ...prev,
                      [perm.key]: !prev[perm.key as keyof typeof prev]
                    }))
                  }
                  className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2 cursor-pointer select-none transition-all hover:bg-emerald-500/15"
                >
                  <div className="w-4 h-4 rounded bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-emerald-300">
                    <Check size={11} />
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-200">{perm.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              SitePulse AI only requests the minimum operational permissions needed to control your online shop.
            </p>
          </div>

          {/* Primary Action Button: START */}
          <div className="pt-4">
            <button
              type="button"
              onClick={handleStart}
              disabled={detecting || !url || url.length < 8}
              className="w-full py-3.5 px-6 rounded-xl font-extrabold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-300 hover:from-cyan-300 hover:to-teal-200 transition-all duration-200 shadow-xl shadow-cyan-500/20 active:scale-[0.99] flex items-center justify-center gap-2 tracking-wider uppercase disabled:opacity-50 disabled:pointer-events-none"
            >
              <span>START</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        /* LIVE INSPECTION PROGRESS SCREEN */
        <div className="glass-panel p-6 md:p-8 space-y-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                <RefreshCw size={22} className={inspectionError ? '' : 'animate-spin'} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">
                  {inspectionError
                    ? 'Inspection Incomplete'
                    : inspectionSuccess
                    ? 'Verification Complete! Opening Hubs...'
                    : 'Automatic Website Inspection in Progress'}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] font-mono">
                  Target: {url} • Platform: {platform?.toUpperCase()}
                </p>
              </div>
            </div>

            {inspectionSuccess && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                VERIFIED
              </span>
            )}
          </div>

          {/* Error Banner if a check fails */}
          {inspectionError && (
            <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-200">
                <AlertCircle size={18} className="text-rose-400" />
                <span>Failed at Stage {inspectionError.step}: {inspectionError.stageName}</span>
              </div>
              <p className="text-rose-200/90 leading-relaxed font-mono text-[11px]">
                {inspectionError.message}
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-4 py-2 rounded-lg bg-rose-500/30 text-rose-200 hover:bg-rose-500/40 border border-rose-400/30 font-bold transition-all text-xs flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {/* 12 Live Stages List */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {stages.map((stage) => {
              const isCompleted = stage.status === 'COMPLETED';
              const isRunning = stage.status === 'RUNNING';
              const isFailed = stage.status === 'FAILED';

              return (
                <div
                  key={stage.id}
                  className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : isRunning
                      ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200 shadow-sm'
                      : isFailed
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-slate-900/40 border-slate-800/80 text-[var(--text-muted)]'
                  }`}
                >
                  <div className="mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : isRunning ? (
                      <RefreshCw size={16} className="text-cyan-400 animate-spin" />
                    ) : isFailed ? (
                      <AlertCircle size={16} className="text-rose-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                        {stage.id}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${isCompleted ? 'text-emerald-200' : isRunning ? 'text-cyan-100 font-bold' : isFailed ? 'text-rose-200' : 'text-slate-400'}`}>
                        {stage.name}
                      </span>
                      <span className="font-mono text-[10px] uppercase font-bold opacity-80">
                        {stage.status}
                      </span>
                    </div>
                    {stage.detail && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                        {stage.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Success summary preview before redirect */}
          {inspectionSuccess && (
            <div className="p-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-cyan-400" />
                  Control Hubs Ready
                </span>
                <span className="text-[11px] font-mono text-cyan-400">
                  {inspectionSuccess.synced?.products || 0} products • {inspectionSuccess.synced?.orders || 0} orders
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <Store size={13} className="text-cyan-400" />
                    Owner Hub
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Products, Prices, Discounts, Inventory & Pages
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <ShoppingBag size={13} className="text-indigo-400" />
                    Manager Hub
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Live Orders, Customer Details & Fulfilment
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Websites List */}
      {savedWebsites.length > 0 && !isInspecting && (
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-[var(--text-muted)] font-mono tracking-wider">
            CONNECTED WEBSITES ({savedWebsites.length})
          </h3>
          <div className="space-y-2">
            {savedWebsites.map((site) => (
              <div
                key={site.id}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  site.isActive
                    ? 'bg-cyan-500/10 border-cyan-500/40'
                    : 'bg-[var(--bg-surface)] border-[var(--border-color)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${site.isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                    <Globe size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)]">{site.name}</span>
                      {site.isActive && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-mono font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">{site.url}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('owner')}
                    className="btn-secondary px-3 py-1 text-xs"
                  >
                    Owner Hub
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('manager')}
                    className="btn-primary px-3 py-1 text-xs"
                  >
                    Manager Hub
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
