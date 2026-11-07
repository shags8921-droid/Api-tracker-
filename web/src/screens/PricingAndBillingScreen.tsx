import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Check,
  Shield,
  Zap,
  Globe,
  Sparkles,
  ArrowRight,
  Download,
  AlertCircle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Clock,
  FileText,
  DollarSign,
  Wallet,
  Receipt
} from 'lucide-react';
import {
  PricingPlanConfig,
  PaymentGatewayType,
  PaymentTransactionRecord
} from '../types/commercial';

interface Props {
  currentOrgId?: string;
  currentOrgName?: string;
  currentTier?: string;
  onUpgradeSuccess?: (newTier: string) => void;
}

export const PricingAndBillingScreen: React.FC<Props> = ({
  currentOrgId = 'org_default',
  currentOrgName = 'Default Organization',
  currentTier = 'PROFESSIONAL',
  onUpgradeSuccess
}) => {
  const [plans, setPlans] = useState<PricingPlanConfig[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);
  const [currency, setCurrency] = useState<'USD' | 'NPR'>('USD');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  // Checkout modal state
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PricingPlanConfig | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayType>('ESEWA');
  const [initiatingPayment, setInitiatingPayment] = useState<boolean>(false);
  const [pendingTx, setPendingTx] = useState<{ transactionId: string; invoiceNumber: string; amount: number; currency: string } | null>(null);
  const [gatewayRefInput, setGatewayRefInput] = useState<string>('');
  const [verifyingPayment, setVerifyingPayment] = useState<boolean>(false);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payment history
  const [paymentHistory, setPaymentHistory] = useState<PaymentTransactionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Export state
  const [exportingData, setExportingData] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch('/api/v1/commercial/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Failed to fetch pricing plans:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/v1/commercial/payments/history?orgId=${encodeURIComponent(currentOrgId)}`);
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch transaction history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchHistory();
  }, [currentOrgId]);

  const handleStartCheckout = (plan: PricingPlanConfig) => {
    setSelectedPlanForCheckout(plan);
    setPendingTx(null);
    setGatewayRefInput('');
    setErrorMsg(null);
    setVerificationSuccess(null);
    // Default Nepal gateways if NPR is chosen
    if (currency === 'NPR') {
      setSelectedGateway('ESEWA');
    } else {
      setSelectedGateway('STRIPE_INTL');
    }
  };

  const handleInitiatePayment = async () => {
    if (!selectedPlanForCheckout) return;
    setInitiatingPayment(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/commercial/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          planId: selectedPlanForCheckout.id,
          currency,
          billingCycle,
          gateway: selectedGateway
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPendingTx({
          transactionId: data.transactionId,
          invoiceNumber: data.invoiceNumber,
          amount: data.amount,
          currency: data.currency
        });
        // Pre-fill simulated gateway reference for frictionless testing
        setGatewayRefInput(`${selectedGateway.toLowerCase()}_ref_${Math.floor(100000 + Math.random() * 900000)}`);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to initiate payment transaction');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error initiating checkout');
    } finally {
      setInitiatingPayment(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!pendingTx || !gatewayRefInput.trim()) return;
    setVerifyingPayment(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/commercial/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: pendingTx.transactionId,
          gatewayRefId: gatewayRefInput.trim(),
          gateway: selectedGateway
        })
      });

      if (res.ok) {
        const data = await res.json();
        setVerificationSuccess(
          `Payment verified! Upgraded organization to ${selectedPlanForCheckout?.name}. Invoice: ${data.invoiceNumber}`
        );
        fetchHistory();
        if (onUpgradeSuccess && selectedPlanForCheckout) {
          onUpgradeSuccess(selectedPlanForCheckout.tier);
        }
        setTimeout(() => {
          setSelectedPlanForCheckout(null);
          setPendingTx(null);
        }, 3000);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Payment verification failed on server');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment verification network error');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleExportDataArchive = async () => {
    setExportingData(true);
    setExportNotice(null);
    try {
      const res = await fetch(`/api/v1/commercial/tenant/export?orgId=${encodeURIComponent(currentOrgId)}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SitePulse_Archive_${currentOrgId}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExportNotice('Complete workspace data archive downloaded successfully!');
        setTimeout(() => setExportNotice(null), 5000);
      } else {
        setExportNotice('Error generating export archive. Please retry.');
      }
    } catch (err: any) {
      setExportNotice('Failed to download tenant archive.');
    } finally {
      setExportingData(false);
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
              <CreditCard className="text-cyan-400" size={26} />
              Subscriptions & Commercial Billing
            </h1>
            <span className="badge-purple font-mono text-xs">Multi-Currency</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Predictable SaaS plans for growing businesses. Native support for Nepal payment gateways (eSewa, Khalti, Fonepay) and International Cards.
          </p>
        </div>

        {/* Currency & Billing Period Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Currency Toggle */}
          <div className="flex items-center p-1 bg-slate-900 border border-[var(--border-color)] rounded-xl text-xs">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1 rounded-lg font-mono font-bold transition-all ${
                currency === 'USD' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('NPR')}
              className={`px-3 py-1 rounded-lg font-mono font-bold transition-all ${
                currency === 'NPR' ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              NPR (Rs.) Nepal
            </button>
          </div>

          {/* Cycle Toggle */}
          <div className="flex items-center p-1 bg-slate-900 border border-[var(--border-color)] rounded-xl text-xs">
            <button
              onClick={() => setBillingCycle('MONTHLY')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                billingCycle === 'MONTHLY' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('ANNUAL')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                billingCycle === 'ANNUAL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Annual
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-mono font-normal">
                -20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loadingPlans ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            Loading subscription pricing models...
          </div>
        ) : (
          plans.map(plan => {
            const isCurrent = currentTier.toUpperCase() === plan.tier;
            const price =
              currency === 'USD'
                ? billingCycle === 'MONTHLY'
                  ? plan.monthlyUsd
                  : plan.annualUsd
                : billingCycle === 'MONTHLY'
                ? plan.monthlyNpr
                : plan.annualNpr;

            return (
              <div
                key={plan.id}
                className={`relative glass-panel rounded-2xl p-5 flex flex-col justify-between transition-all ${
                  plan.isPopular
                    ? 'border-2 border-cyan-500 shadow-xl shadow-cyan-500/15'
                    : 'border-[var(--border-color)]'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-black text-[10px] font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{plan.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 min-h-[32px]">{plan.tagline}</p>
                  </div>

                  {/* Price Block */}
                  <div className="border-y border-[var(--border-color)] py-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white">
                        {currency === 'USD' ? `$${price}` : `Rs. ${price.toLocaleString()}`}
                      </span>
                      <span className="text-[11px] text-slate-400">/{billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</span>
                    </div>
                    {billingCycle === 'ANNUAL' && (
                      <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Billed annually (2 months free)</p>
                    )}
                  </div>

                  {/* Key Limits */}
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Connected Websites</span>
                      <span className="font-mono font-bold text-white">
                        {plan.limits.maxWebsites === 999 ? 'Unlimited' : plan.limits.maxWebsites}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Team Accounts</span>
                      <span className="font-mono font-bold text-white">
                        {plan.limits.maxUsers === 999 ? 'Unlimited' : plan.limits.maxUsers}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Monthly AI Queries</span>
                      <span className="font-mono font-bold text-cyan-400">
                        {plan.limits.monthlyAiRequests.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      Included Capabilities
                    </div>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <Check size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Action Button */}
                <div className="pt-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2 bg-slate-800 text-slate-400 text-xs font-bold rounded-xl border border-slate-700 cursor-not-allowed"
                    >
                      Active Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartCheckout(plan)}
                      className={`w-full py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                        plan.isPopular
                          ? 'btn-primary shadow-lg shadow-cyan-500/25'
                          : 'btn-secondary text-white hover:border-cyan-500'
                      }`}
                    >
                      <span>Choose {plan.name}</span>
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Nepal Gateways & Regional Trust Card */}
      <div className="glass-panel p-6 border-cyan-500/30 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <Wallet size={16} />
            Nepal Local Payment Gateways
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Direct NPR settlement via <strong>eSewa</strong>, <strong>Khalti</strong>, and <strong>Fonepay QR</strong> networks with zero international transaction exchange fees.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Shield size={16} />
            Strict Server-Side Verification
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All gateway callback tokens are cryptographically validated against gateway webhooks before workspace limits are upgraded. Client assertions are never trusted alone.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
            <Globe size={16} />
            International Cards & Invoicing
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Credit and debit cards accepted globally with instant automated PDF tax receipts and VAT/PAN compliant invoices.
          </p>
        </div>
      </div>

      {/* Payment History & Invoices */}
      <div className="glass-panel p-6 space-y-4 rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Payment Transactions & Verified Invoices</h2>
          </div>
          <button
            onClick={() => fetchHistory()}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
          >
            <RefreshCw size={12} className={loadingHistory ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {paymentHistory.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            No past transactions found for this workspace. When you upgrade via eSewa, Khalti, Fonepay, or Stripe, invoices will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-slate-400 font-mono text-[11px]">
                  <th className="py-2">Invoice #</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2">Gateway</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Ref ID</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paymentHistory.map(tx => (
                  <tr key={tx.transactionId} className="hover:bg-slate-900/40 font-mono text-slate-300">
                    <td className="py-2 text-white font-bold">{tx.invoiceNumber}</td>
                    <td className="py-2 text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 uppercase text-cyan-400">{tx.planId}</td>
                    <td className="py-2">{tx.gateway}</td>
                    <td className="py-2 font-bold text-white">
                      {tx.currency === 'USD' ? `$${tx.amount}` : `Rs. ${tx.amount.toLocaleString()}`}
                    </td>
                    <td className="py-2 text-[10px] text-slate-400">{tx.gatewayRefId || 'N/A'}</td>
                    <td className="py-2">
                      <span className={tx.status === 'VERIFIED' ? 'badge-green' : 'badge-amber'}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GDPR Data Ownership & Tenant Archive Card */}
      <div className="glass-panel p-6 border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <FileText size={16} />
            Data Ownership & GDPR Portability Archive
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            You own 100% of your business data. Download an unencumbered, full self-contained JSON archive of all organization configurations, discovered feature maps, sync journals, and support tickets at any time.
          </p>
          {exportNotice && (
            <p className="text-xs text-emerald-400 font-medium pt-1 flex items-center gap-1.5">
              <CheckCircle2 size={13} />
              {exportNotice}
            </p>
          )}
        </div>

        <button
          onClick={handleExportDataArchive}
          disabled={exportingData}
          className="btn-secondary text-xs px-4 py-2.5 flex items-center gap-2 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 flex-shrink-0"
        >
          {exportingData ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
          Export Complete JSON Archive
        </button>
      </div>

      {/* Checkout Modal */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel border-cyan-500/40 p-6 max-w-lg w-full space-y-5 rounded-2xl shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard size={18} className="text-cyan-400" />
                  Upgrade to {selectedPlanForCheckout.name}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Workspace: <strong className="text-white">{currentOrgName}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanForCheckout(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            </div>

            {verificationSuccess ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-center text-xs">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400" />
                <h4 className="font-bold text-white text-sm">Transaction Confirmed!</h4>
                <p className="text-slate-300">{verificationSuccess}</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Cost summary */}
                <div className="p-3 bg-slate-900 rounded-xl border border-[var(--border-color)] flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Selected Plan & Cycle</span>
                    <strong className="text-white">{selectedPlanForCheckout.name} ({billingCycle.toLowerCase()})</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">Amount Due</span>
                    <strong className="text-cyan-400 font-mono text-base">
                      {currency === 'USD'
                        ? `$${billingCycle === 'MONTHLY' ? selectedPlanForCheckout.monthlyUsd : selectedPlanForCheckout.annualUsd}`
                        : `Rs. ${(billingCycle === 'MONTHLY' ? selectedPlanForCheckout.monthlyNpr : selectedPlanForCheckout.annualNpr).toLocaleString()}`}
                    </strong>
                  </div>
                </div>

                {/* Gateway Selection */}
                <div className="space-y-2">
                  <label className="block text-slate-300 font-semibold">Choose Payment Gateway</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGateway('ESEWA')}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between ${
                        selectedGateway === 'ESEWA'
                          ? 'bg-emerald-500/20 border-emerald-500 text-white'
                          : 'bg-slate-900 border-[var(--border-color)] text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-emerald-400">eSewa Nepal</div>
                        <div className="text-[10px] text-slate-400">Digital Wallet & eBanking</div>
                      </div>
                      <Wallet size={16} className="text-emerald-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedGateway('KHALTI')}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between ${
                        selectedGateway === 'KHALTI'
                          ? 'bg-purple-500/20 border-purple-500 text-white'
                          : 'bg-slate-900 border-[var(--border-color)] text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-purple-400">Khalti</div>
                        <div className="text-[10px] text-slate-400">Mobile & Bank Direct</div>
                      </div>
                      <Wallet size={16} className="text-purple-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedGateway('FONEPAY')}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between ${
                        selectedGateway === 'FONEPAY'
                          ? 'bg-rose-500/20 border-rose-500 text-white'
                          : 'bg-slate-900 border-[var(--border-color)] text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-rose-400">Fonepay QR</div>
                        <div className="text-[10px] text-slate-400">Interoperable Bank QR</div>
                      </div>
                      <Sparkles size={16} className="text-rose-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedGateway('STRIPE_INTL')}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between ${
                        selectedGateway === 'STRIPE_INTL'
                          ? 'bg-cyan-500/20 border-cyan-500 text-white'
                          : 'bg-slate-900 border-[var(--border-color)] text-slate-400'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-cyan-400">International Card</div>
                        <div className="text-[10px] text-slate-400">Visa / Mastercard / Amex</div>
                      </div>
                      <CreditCard size={16} className="text-cyan-400" />
                    </button>
                  </div>
                </div>

                {/* Step 1: Initiate or Step 2: Verify */}
                {!pendingTx ? (
                  <div className="pt-2">
                    <button
                      onClick={handleInitiatePayment}
                      disabled={initiatingPayment}
                      className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
                    >
                      {initiatingPayment ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                      Initiate Secure Checkout via {selectedGateway}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Invoice: {pendingTx.invoiceNumber}</span>
                      <span className="text-cyan-400 font-bold">Transaction: {pendingTx.transactionId}</span>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Gateway Verification Reference / Token
                      </label>
                      <input
                        type="text"
                        value={gatewayRefInput}
                        onChange={e => setGatewayRefInput(e.target.value)}
                        placeholder="Enter gateway transaction reference"
                        className="w-full p-2 bg-slate-900 border border-[var(--border-color)] rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Our server will perform cryptographic verification directly against {selectedGateway} API.
                      </span>
                    </div>

                    <button
                      onClick={handleVerifyPayment}
                      disabled={verifyingPayment || !gatewayRefInput.trim()}
                      className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                    >
                      {verifyingPayment ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />}
                      Verify & Activate Subscription
                    </button>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    {errorMsg}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
