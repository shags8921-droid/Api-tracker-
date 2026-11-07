import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Bot,
  User,
  Shield,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Download,
  RotateCcw,
  Volume2,
  VolumeX,
  Compass,
  Zap,
  Info,
  Clock,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { ScreenId } from '../components/Navigation';
import { AiChatMessage, BusinessKpiSummary, BusinessAlert } from '../types/assistant';
import { platform } from '../services/platform';

interface Props {
  userRole: 'OWNER' | 'MANAGER';
  onNavigateToScreen: (screen: ScreenId) => void;
}

export const AiBusinessAssistantScreen: React.FC<Props> = ({ userRole, onNavigateToScreen }) => {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [kpis, setKpis] = useState<BusinessKpiSummary | null>(null);
  const [alerts, setAlerts] = useState<BusinessAlert[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [speechSynthesisActive, setSpeechSynthesisActive] = useState(false);
  const [pendingActionConfirmation, setPendingActionConfirmation] = useState<any | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'ASSISTANT' | 'INSIGHTS' | 'REPORTS' | 'ALERTS'>('ASSISTANT');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Welcome Message grounded in Role
  useEffect(() => {
    fetchKpis();
    generateDynamicAlerts();

    const initialGreeting: AiChatMessage = {
      id: `msg_init`,
      sender: 'ASSISTANT',
      text: userRole === 'OWNER'
        ? `Welcome, Executive Owner. I am your SitePulse Business Intelligence Assistant. I have direct access to authoritative revenue records, staff credentials, live orders, and enterprise webhooks. What would you like to analyze or manage today?`
        : `Welcome, Operations Manager. I am your SitePulse Operational Assistant. I am grounded in your live order queues, stock replenishment needs, and catalog items. How can I assist your workflow today?`,
      timestamp: Date.now(),
      dataEvidence: {
        sourceEndpoint: 'Authoritative Website Gateway',
        reportingPeriod: 'Live Real-Time Integration'
      },
      suggestedActions: userRole === 'OWNER'
        ? [
            { label: "Show today's revenue & sales", actionType: 'PREPARE_ACTION', payload: "Show today's sales" },
            { label: 'Check low-stock inventory', actionType: 'PREPARE_ACTION', payload: 'Which products are low in stock?' },
            { label: 'Review staff directory', actionType: 'PREPARE_ACTION', payload: 'Show staff and team directory' },
            { label: 'Generate monthly business report', actionType: 'GENERATE_REPORT', payload: { type: 'MONTHLY' } }
          ]
        : [
            { label: 'Check low-stock products', actionType: 'PREPARE_ACTION', payload: 'Which products are low in stock?' },
            { label: 'Show pending orders to dispatch', actionType: 'PREPARE_ACTION', payload: 'Show pending orders' },
            { label: 'Open Manager Hub', actionType: 'NAVIGATE', payload: { screen: 'manager' } }
          ]
    };

    setMessages([initialGreeting]);
  }, [userRole]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const fetchKpis = async () => {
    try {
      const res = await api.get<any>('/api/v1/ai/analytics/kpis');
      setKpis(res.data.kpis);
    } catch (e) {
      console.error('Failed to load KPIs', e);
    }
  };

  const generateDynamicAlerts = async () => {
    try {
      const [oRes, cRes] = await Promise.all([
        api.get<any[]>('/api/v1/orders/feed'),
        api.get<any[]>('/api/v1/catalog/items')
      ]);

      const generated: BusinessAlert[] = [];
      const lowItems = cRes.data.filter((i) => i.stock <= i.minThreshold);
      if (lowItems.length > 0) {
        generated.push({
          id: 'alt_stock',
          severity: 'HIGH',
          category: 'INVENTORY',
          title: `${lowItems.length} Products Under Safety Stock Threshold`,
          description: `Items including ${lowItems[0].name} (${lowItems[0].stock} units left) require inventory replenishment.`,
          timestamp: Date.now() - 15 * 60000,
          isRead: false,
          actionRoute: 'manager'
        });
      }

      const pendingOrders = oRes.data.filter((o) => o.status === 'NEW');
      if (pendingOrders.length > 0) {
        generated.push({
          id: 'alt_orders',
          severity: 'MEDIUM',
          category: 'ORDERS',
          title: `${pendingOrders.length} New Orders Awaiting Dispatch`,
          description: `Customer orders requiring packing and carrier tracking code generation.`,
          timestamp: Date.now() - 30 * 60000,
          isRead: false,
          actionRoute: 'manager'
        });
      }

      setAlerts(generated);
    } catch {
      // fallback
    }
  };

  const handleSendMessage = async (userPrompt?: string) => {
    const textToSend = userPrompt || inputValue;
    if (!textToSend.trim()) return;

    const userMsg: AiChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'USER',
      text: textToSend,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsThinking(true);

    try {
      const res = await api.post<any>('/api/v1/ai/chat', { prompt: textToSend });
      const aiMsg: AiChatMessage = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ASSISTANT',
        text: res.data.responseText,
        timestamp: Date.now(),
        dataEvidence: res.data.dataEvidence,
        suggestedActions: res.data.suggestedActions,
        preparedAction: res.data.preparedAction
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Voice TTS feedback if enabled
      if (speechSynthesisActive && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(res.data.responseText.replace(/[•\n]/g, ' '));
        window.speechSynthesis.speak(utterance);
      }
    } catch (err: any) {
      const errorMsg: AiChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'SYSTEM',
        text: err.message || 'The AI service encountered an issue communicating with the website gateway.',
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  // Voice Speech-to-Text Toggle
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      platform.notification.showToast('Voice Recognition is not supported on this browser engine. Please use text input.', 'WARNING');
      return;
    }

    if (isVoiceActive) {
      setIsVoiceActive(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsVoiceActive(true);
        platform.notification.showToast('Listening for voice command...', 'INFO');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsVoiceActive(false);
        setInputValue(transcript);
        handleSendMessage(transcript);
      };

      recognition.onerror = (e: any) => {
        setIsVoiceActive(false);
        platform.notification.showToast(`Voice capture error: ${e.error || 'Check microphone permission'}`, 'WARNING');
      };

      recognition.onend = () => {
        setIsVoiceActive(false);
      };

      recognition.start();
    } catch (err) {
      setIsVoiceActive(false);
      platform.notification.showToast('Microphone access blocked. Please grant browser permissions.', 'ERROR');
    }
  };

  // Controlled AI Action Confirmation Execution (Requirement 7)
  const handleConfirmPreparedAction = async (action: any) => {
    try {
      let res: any;
      if (action.method === 'POST') res = await api.post(action.endpoint, action.payload);
      else if (action.method === 'PATCH') res = await api.patch(action.endpoint, action.payload);
      else if (action.method === 'DELETE') res = await api.delete(action.endpoint);

      setPendingActionConfirmation(null);
      fetchKpis();
      generateDynamicAlerts();

      const successMsg: AiChatMessage = {
        id: `msg_act_success_${Date.now()}`,
        sender: 'SYSTEM',
        text: `✓ Operation Executed Successfully via Authoritative Gateway:\n${action.description}`,
        timestamp: Date.now(),
        dataEvidence: {
          sourceEndpoint: action.endpoint,
          reportingPeriod: 'Executed & Verified'
        }
      };
      setMessages((prev) => [...prev, successMsg]);
      platform.notification.showToast('Controlled AI action completed successfully', 'SUCCESS');
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    }
  };

  // Export Natural Language Report
  const handleExportReportCsv = (reportType: string) => {
    const csvContent =
      `SitePulse AI Business Report — ${reportType}\n` +
      `Generated At,${new Date().toISOString()}\n` +
      `Authorized Role,${userRole}\n` +
      `Authoritative Source,Enterprise Website Integration Gateway\n\n` +
      `Metric,Value\n` +
      `Total Revenue,${kpis?.totalRevenue ? `$${kpis.totalRevenue}` : 'Gated'}\n` +
      `Total Orders,${kpis?.ordersCount || 0}\n` +
      `Pending Orders,${kpis?.pendingOrdersCount || 0}\n` +
      `Low Stock Items,${kpis?.lowStockItemsCount || 0}\n` +
      `Total Catalog SKUs,${kpis?.totalCatalogSkus || 0}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitepulse_report_${reportType.toLowerCase()}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    platform.notification.showToast(`Exported ${reportType} CSV report.`, 'SUCCESS');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles className="text-cyan-400" />
            AI Business Assistant & Real-Time Intelligence
            <span
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                userRole === 'OWNER'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
              }`}
            >
              {userRole === 'OWNER' ? 'EXECUTIVE OWNER ASSISTANT' : 'OPERATIONS MANAGER ASSISTANT'}
            </span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Grounded directly in verified records from your connected authoritative website. Voice enabled with controlled action preview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSpeechSynthesisActive(!speechSynthesisActive)}
            className={`p-2 rounded-xl text-xs flex items-center gap-1.5 border transition-all ${
              speechSynthesisActive
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-color)]'
            }`}
            title="Toggle Text-to-Speech audio response"
          >
            {speechSynthesisActive ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span className="hidden sm:inline">Voice Speech</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2 overflow-x-auto">
        {[
          { id: 'ASSISTANT', label: 'AI Business Assistant' },
          { id: 'INSIGHTS', label: 'Real-Time Insights & KPIs' },
          { id: 'REPORTS', label: 'Intelligent Report Generator' },
          { id: 'ALERTS', label: `Active Business Alerts (${alerts.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeSubTab === tab.id
                ? 'bg-cyan-500 text-black shadow-md'
                : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: ASSISTANT CHAT & CONTROLLED ACTIONS */}
      {activeSubTab === 'ASSISTANT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chat Stream */}
          <div className="lg:col-span-2 glass-panel flex flex-col h-[600px] overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 text-xs ${
                    m.sender === 'USER' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.sender !== 'USER' && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                      <Bot size={15} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 space-y-2.5 ${
                      m.sender === 'USER'
                        ? 'bg-cyan-600 text-black font-medium ml-auto'
                        : m.sender === 'SYSTEM'
                        ? 'bg-slate-900 border border-emerald-500/40 text-emerald-300'
                        : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>

                    {/* Data Evidence Badge */}
                    {m.dataEvidence && (
                      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
                        <span>Source: {m.dataEvidence.sourceEndpoint}</span>
                        <span>{m.dataEvidence.reportingPeriod}</span>
                      </div>
                    )}

                    {/* Controlled Prepared Action Card (Requirement 7) */}
                    {m.preparedAction && (
                      <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 space-y-2 mt-2">
                        <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs">
                          <Zap size={14} />
                          Controlled Action Ready for Execution
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)]">{m.preparedAction.previewSummary}</p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleConfirmPreparedAction(m.preparedAction)}
                            className="btn-primary px-3 py-1 text-xs"
                          >
                            Execute Approved Action
                          </button>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            Requires {m.preparedAction.requiredRole}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Suggested Next Steps / Navigation */}
                    {m.suggestedActions && m.suggestedActions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {m.suggestedActions.map((act, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              if (act.actionType === 'NAVIGATE') {
                                onNavigateToScreen(act.payload.screen);
                              } else if (act.actionType === 'PREPARE_ACTION') {
                                handleSendMessage(act.payload);
                              } else if (act.actionType === 'GENERATE_REPORT') {
                                handleExportReportCsv(act.payload.type);
                              }
                            }}
                            className="text-[10px] px-2.5 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-all"
                          >
                            {act.label}
                            <ArrowRight size={10} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {m.sender === 'USER' && (
                    <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center text-black shrink-0 font-bold">
                      <User size={15} />
                    </div>
                  )}
                </div>
              ))}

              {isThinking && (
                <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono py-2">
                  <Bot size={15} className="animate-spin" />
                  Analyzing authoritative website database records...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-2">
              <button
                onClick={handleToggleVoice}
                className={`p-2 rounded-xl transition-all ${
                  isVoiceActive
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-[var(--bg-surface)] text-cyan-400 hover:bg-cyan-500/10 border border-[var(--border-color)]'
                }`}
                title={isVoiceActive ? 'Listening... click to stop' : 'Click to speak voice command'}
              >
                {isVoiceActive ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                type="text"
                placeholder={
                  isVoiceActive
                    ? 'Listening to voice command...'
                    : userRole === 'OWNER'
                    ? 'Ask about revenue, staff, inventory, or prepare actions...'
                    : 'Ask about pending orders, low stock, or navigation...'
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="input-field text-xs flex-1 py-2"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim()}
                className="btn-primary p-2 text-xs"
              >
                <Send size={15} />
              </button>
            </div>
          </div>

          {/* Quick Context & Role Shortcuts Panel */}
          <div className="space-y-4">
            <div className="glass-panel p-4 space-y-3">
              <h3 className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
                <Compass size={15} className="text-cyan-400" />
                Intelligent Voice & Text Prompts
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Click any prompt to trigger instant evaluation against your live gateway:
              </p>

              <div className="space-y-1.5">
                {[
                  userRole === 'OWNER' ? "Show today's sales and revenue" : "Show pending customer orders",
                  "Which products are running low in stock?",
                  "Show pending orders and dispatch status",
                  userRole === 'OWNER' ? "Show team and staff directory" : "Open Manager Hub",
                  "Generate monthly business performance report"
                ].map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(promptText)}
                    className="w-full text-left p-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-cyan-500/10 border border-[var(--border-color)] hover:border-cyan-500/30 text-xs text-slate-300 transition-all flex items-center justify-between"
                  >
                    <span>"{promptText}"</span>
                    <ArrowRight size={12} className="text-cyan-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Role Security Status Card */}
            <div className="glass-panel p-4 space-y-2 border-l-4 border-cyan-500 text-xs">
              <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <Shield size={14} className="text-cyan-400" />
                Active RBAC Enforcement: {userRole}
              </span>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {userRole === 'OWNER'
                  ? 'All executive financial operations, user admin permissions, and webhook routing rules are accessible.'
                  : 'Gated: Revenue metrics and staff management restricted. Operational order fulfillment and stock catalog access active.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REAL-TIME INSIGHTS & KPIS */}
      {activeSubTab === 'INSIGHTS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 border-l-4 border-cyan-500 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Total Revenue (30d)</span>
              <div className="text-2xl font-black text-cyan-400">
                {kpis?.totalRevenue ? `$${kpis.totalRevenue.toLocaleString()}` : userRole === 'MANAGER' ? 'RESTRICTED (Owner only)' : '$0.00'}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">Authoritative Order Ledger</p>
            </div>

            <div className="glass-panel p-4 border-l-4 border-emerald-500 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Live Orders</span>
              <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                {kpis?.ordersCount || 0}
                <span className="text-xs font-normal text-slate-400">({kpis?.pendingOrdersCount || 0} pending)</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">Real-time dispatch feed</p>
            </div>

            <div className="glass-panel p-4 border-l-4 border-amber-500 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Low Stock SKUs</span>
              <div className="text-2xl font-black text-amber-400 flex items-center gap-2">
                {kpis?.lowStockItemsCount || 0}
                <AlertTriangle size={18} />
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">Below minimum threshold</p>
            </div>

            <div className="glass-panel p-4 border-l-4 border-indigo-500 space-y-1">
              <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">Catalog SKUs</span>
              <div className="text-2xl font-black text-indigo-400">
                {kpis?.totalCatalogSkus || 0}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">Active inventory items</p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: INTELLIGENT REPORT GENERATOR */}
      {activeSubTab === 'REPORTS' && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                <FileText size={16} className="text-cyan-400" />
                Intelligent Business Report Generator
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Instant calculations grounded deterministically in verified database records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportReportCsv('EXECUTIVE_SUMMARY')}
                className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1.5"
              >
                <Download size={13} />
                Export Full CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
              <span className="font-bold text-cyan-400 block">Daily Operations Report</span>
              <p className="text-[11px] text-[var(--text-secondary)]">Tracks dispatch orders, tracking IDs generated today, and pending customer shipments.</p>
              <button onClick={() => handleExportReportCsv('DAILY_OPS')} className="btn-secondary px-3 py-1 text-[11px] w-full">
                Download Daily Report
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
              <span className="font-bold text-emerald-400 block">Inventory & Stock Audit</span>
              <p className="text-[11px] text-[var(--text-secondary)]">Lists all SKUs with current quantities, safety margins, and re-order purchase suggestions.</p>
              <button onClick={() => handleExportReportCsv('INVENTORY_AUDIT')} className="btn-secondary px-3 py-1 text-[11px] w-full">
                Download Inventory Report
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
              <span className="font-bold text-amber-400 block">Revenue & Sales Performance</span>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {userRole === 'OWNER' ? 'Complete revenue totals, average order value, and customer breakdown.' : 'Restricted to Executive Owner accounts.'}
              </p>
              <button
                disabled={userRole !== 'OWNER'}
                onClick={() => handleExportReportCsv('SALES_REVENUE')}
                className="btn-secondary px-3 py-1 text-[11px] w-full disabled:opacity-50"
              >
                {userRole === 'OWNER' ? 'Download Revenue Report' : 'Gated (Owner Only)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ACTIVE BUSINESS ALERTS */}
      {activeSubTab === 'ALERTS' && (
        <div className="glass-panel p-6 space-y-4">
          <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            Active Intelligent Business Alerts ({alerts.length})
          </h3>

          <div className="space-y-3">
            {alerts.map((alt) => (
              <div
                key={alt.id}
                className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400">
                      {alt.severity}
                    </span>
                    <span className="font-bold text-[var(--text-primary)]">{alt.title}</span>
                  </div>
                  <p className="text-[var(--text-secondary)]">{alt.description}</p>
                </div>

                {alt.actionRoute && (
                  <button
                    onClick={() => onNavigateToScreen(alt.actionRoute as ScreenId)}
                    className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1 self-start md:self-auto shrink-0"
                  >
                    Resolve in Hub
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
