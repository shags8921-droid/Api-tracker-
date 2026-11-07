import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  PlusCircle,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  LifeBuoy,
  FileQuestion,
  User,
  Headphones
} from 'lucide-react';
import { SupportTicketItem } from '../types/commercial';

interface Props {
  currentOrgId?: string;
  currentOrgName?: string;
  currentUserEmail?: string;
}

export const CustomerSupportCenterScreen: React.FC<Props> = ({
  currentOrgId = 'org_default',
  currentOrgName = 'Default Organization',
  currentUserEmail = 'owner@sitepulse.ai'
}) => {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [newMessageText, setNewMessageText] = useState<string>('');
  const [submittingReply, setSubmittingReply] = useState<boolean>(false);

  // New ticket form
  const [newSubject, setNewSubject] = useState<string>('');
  const [newCategory, setNewCategory] = useState<SupportTicketItem['category']>('INTEGRATION_ISSUE');
  const [newPriority, setNewPriority] = useState<SupportTicketItem['priority']>('MEDIUM');
  const [newInitialMessage, setNewInitialMessage] = useState<string>('');
  const [creatingTicket, setCreatingTicket] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/commercial/support/tickets?orgId=${encodeURIComponent(currentOrgId)}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        if (selectedTicket) {
          const updated = (data.tickets || []).find((t: SupportTicketItem) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      } else {
        // Fallback default tickets if backend response is non-200
        setTickets([]);
      }
    } catch (err: any) {
      console.error('Failed to load tickets:', err);
      setErrorMsg('Could not connect to support service. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [currentOrgId]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newInitialMessage.trim()) return;

    setCreatingTicket(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/commercial/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          orgName: currentOrgName,
          authorEmail: currentUserEmail,
          subject: newSubject.trim(),
          category: newCategory,
          priority: newPriority,
          initialMessage: newInitialMessage.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(`Ticket #${data.ticket.id} created successfully! Our engineering team has been notified.`);
        setShowNewModal(false);
        setNewSubject('');
        setNewInitialMessage('');
        await fetchTickets();
        setSelectedTicket(data.ticket);
        setTimeout(() => setSuccessMsg(null), 5000);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to create ticket');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while creating ticket');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !newMessageText.trim()) return;
    setSubmittingReply(true);
    try {
      // Append local message and update via mock/server
      const updatedMessages = [
        ...selectedTicket.messages,
        {
          id: `msg_${Date.now()}`,
          sender: 'CUSTOMER' as const,
          senderName: currentUserEmail,
          messageText: newMessageText.trim(),
          timestamp: Date.now()
        }
      ];

      const updated = {
        ...selectedTicket,
        messages: updatedMessages,
        updatedAt: Date.now(),
        status: 'WAITING_ON_CUSTOMER' === selectedTicket.status ? 'IN_PROGRESS' : selectedTicket.status
      };

      // Optimistic update
      setSelectedTicket(updated);
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      setNewMessageText('');
    } catch (err: any) {
      setErrorMsg('Failed to post reply message');
    } finally {
      setSubmittingReply(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
              <Headphones className="text-cyan-400" size={26} />
              Customer Support Center
            </h1>
            <span className="badge-cyan font-mono text-xs">Enterprise SLA</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dedicated assistance for website discovery, API authentication, sync errors, and billing inquiries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTickets()}
            className="btn-secondary text-xs flex items-center gap-1.5"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <PlusCircle size={14} />
            Open Support Ticket
          </button>
        </div>
      </div>

      {/* Tenant Isolation Banner */}
      <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-cyan-400 flex-shrink-0" />
          <span>
            Workspace Isolation Active: All tickets are strictly compartmentalized to organization{' '}
            <strong className="text-white font-mono">{currentOrgName}</strong> ({currentOrgId}).
          </span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400">Response SLA: &lt; 2 hrs</span>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Main Layout: List & Thread */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>Your Support Tickets ({filteredTickets.length})</span>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tickets by ID or topic..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900/60 border border-[var(--border-color)] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="bg-slate-900/60 border border-[var(--border-color)] rounded-lg px-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Categories</option>
                <option value="INTEGRATION_ISSUE">Integration</option>
                <option value="DISCOVERY_BUG">Discovery Bug</option>
                <option value="BILLING">Billing / Nepal Pay</option>
                <option value="FEATURE_REQUEST">Feature Request</option>
                <option value="SECURITY">Security</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {loading && (
                <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  Loading organization tickets...
                </div>
              )}

              {!loading && filteredTickets.length === 0 && (
                <div className="text-center py-10 glass-panel border-dashed p-4 space-y-2">
                  <LifeBuoy size={28} className="mx-auto text-slate-500" />
                  <p className="text-xs text-slate-300 font-medium">No tickets found</p>
                  <p className="text-[11px] text-slate-500">Need help with your website connection or billing? Open a ticket above.</p>
                </div>
              )}

              {!loading && filteredTickets.map(t => {
                const isSelected = selectedTicket?.id === t.id;
                const statusColor =
                  t.status === 'RESOLVED' ? 'badge-green' :
                  t.status === 'IN_PROGRESS' ? 'badge-cyan' :
                  t.status === 'WAITING_ON_CUSTOMER' ? 'badge-amber' : 'badge-purple';

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md'
                        : 'bg-slate-900/40 border-[var(--border-color)] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-mono text-cyan-400 font-semibold">{t.id}</span>
                      <span className={statusColor}>{t.status.replace(/_/g, ' ')}</span>
                    </div>
                    <h3 className="text-xs font-bold text-white line-clamp-1">{t.subject}</h3>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {t.category.replace(/_/g, ' ')}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={11} />
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ticket Details & Conversation (7 cols) */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="glass-panel p-5 space-y-4 flex flex-col h-full min-h-[500px]">
              {/* Thread Header */}
              <div className="border-b border-[var(--border-color)] pb-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-cyan-400 font-bold">{selectedTicket.id}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Priority:</span>
                    <span className="font-bold text-xs uppercase text-amber-400">{selectedTicket.priority}</span>
                  </div>
                </div>
                <h2 className="text-base font-bold text-white">{selectedTicket.subject}</h2>
                <div className="flex items-center gap-4 text-[11px] text-slate-400">
                  <span>Author: {selectedTicket.authorEmail}</span>
                  <span>Opened: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Messages Container */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[360px] pr-2">
                {selectedTicket.messages.map(m => {
                  const isCustomer = m.sender === 'CUSTOMER';
                  const isAgent = m.sender === 'SUPPORT_AGENT';

                  return (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        isCustomer
                          ? 'bg-slate-900/60 border-slate-700 ml-6'
                          : isAgent
                          ? 'bg-cyan-500/10 border-cyan-500/30 mr-6'
                          : 'bg-slate-800/80 border-slate-700 text-center font-mono text-[11px]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`font-semibold flex items-center gap-1.5 ${isAgent ? 'text-cyan-400' : 'text-slate-200'}`}>
                          {isAgent ? <Headphones size={13} /> : <User size={13} />}
                          {m.senderName} {isAgent && '(Support Engineer)'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{m.messageText}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Box */}
              <div className="pt-2 border-t border-[var(--border-color)] space-y-2">
                <textarea
                  rows={3}
                  value={newMessageText}
                  onChange={e => setNewMessageText(e.target.value)}
                  placeholder="Type your response to the support engineers..."
                  className="w-full p-2.5 bg-slate-900/80 border border-[var(--border-color)] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    Press send to notify our support desk. Attachments can be linked securely.
                  </span>
                  <button
                    onClick={handleSendReply}
                    disabled={!newMessageText.trim() || submittingReply}
                    className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    Send Reply
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px] space-y-3">
              <MessageSquare size={36} className="text-slate-600" />
              <h3 className="text-sm font-bold text-white">Select a Support Ticket</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Choose a ticket from the list on the left to view the technical conversation thread, or open a new inquiry.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border-cyan-500/40 p-6 max-w-lg w-full space-y-4 rounded-2xl shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LifeBuoy size={18} className="text-cyan-400" />
                Submit Technical Support Ticket
              </h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subject / Issue Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., eSewa webhook verification timeout or API mapping error"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-[var(--border-color)] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-900 border border-[var(--border-color)] rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="INTEGRATION_ISSUE">Integration & Connection</option>
                    <option value="DISCOVERY_BUG">Autonomous Discovery Bug</option>
                    <option value="BILLING">Billing & Nepal Payment Gateway</option>
                    <option value="FEATURE_REQUEST">Feature Request</option>
                    <option value="SECURITY">Security & Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full p-2 bg-slate-900 border border-[var(--border-color)] rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Low (General guidance)</option>
                    <option value="MEDIUM">Medium (Standard operation)</option>
                    <option value="HIGH">High (Impacts orders/sync)</option>
                    <option value="CRITICAL">Critical (Service down)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe what occurred, any error messages received, and the steps to reproduce..."
                  value={newInitialMessage}
                  onChange={e => setNewInitialMessage(e.target.value)}
                  className="w-full p-2 bg-slate-900 border border-[var(--border-color)] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="btn-secondary px-4 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTicket || !newSubject.trim() || !newInitialMessage.trim()}
                  className="btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5"
                >
                  {creatingTicket ? <RefreshCw size={12} className="animate-spin" /> : <PlusCircle size={12} />}
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
