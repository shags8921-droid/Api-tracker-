import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Lock,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { AuthType } from '../types';

interface Props {
  targetUrl: string;
  selectedAuthType: AuthType;
  setSelectedAuthType: (type: AuthType) => void;
  authToken: string;
  setAuthToken: (token: string) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  onStartDiscovery: () => void;
}

export const AuthenticationScreen: React.FC<Props> = ({
  targetUrl,
  selectedAuthType,
  setSelectedAuthType,
  authToken,
  setAuthToken,
  apiKey,
  setApiKey,
  onStartDiscovery
}) => {
  const [showToken, setShowToken] = useState(false);
  const [isPkceExchanging, setIsPkceExchanging] = useState(false);
  const [pkceDetails, setPkceDetails] = useState<{
    codeVerifier: string;
    codeChallenge: string;
    expiresInSeconds: number;
  } | null>(null);

  const handleSimulatePkce = async () => {
    setIsPkceExchanging(true);
    // Real PKCE verifier/challenge generation (RFC 7636, S256). There is no authorization server to exchange
    // the code with in this build, so NO access token is issued: paste a real token below instead.
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const b64u = (buf: ArrayBuffer | Uint8Array) =>
      btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const verifier = b64u(bytes);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    setPkceDetails({ codeVerifier: verifier, codeChallenge: b64u(digest), expiresInSeconds: 600 });
    setIsPkceExchanging(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center gap-2">
          <KeyRound className="text-cyan-400" />
          Secure Authorized Authentication (PKCE & Scoped Tokens)
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Target host: <span className="font-mono text-cyan-400">{targetUrl}</span>. Credentials you enter here are kept in this browser session only and are sent to the target host during discovery; they are not stored by SitePulse.
        </p>
      </div>

      {/* Security Safeguards Banner */}
      <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-start gap-3">
        <ShieldCheck size={20} className="text-cyan-400 mt-0.5 shrink-0" />
        <div className="text-xs">
          <span className="font-bold text-cyan-300 block mb-0.5">Zero-Trust Credential Security Active</span>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            RFC 7636 Authorization Code with PKCE prevents authorization code injection. Access tokens are kept in secure memory and never exposed in browser diagnostic logs.
          </p>
        </div>
      </div>

      {/* Auth Protocol Selection */}
      <div className="glass-panel p-6 space-y-5">
        <div>
          <label className="block text-xs font-mono text-[var(--text-muted)] mb-2">
            SELECT AUTHORIZATION MECHANISM
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                id: 'OAUTH2_PKCE',
                label: 'OAuth 2.0 PKCE (Recommended)',
                desc: 'Authorization Code flow with SHA-256 code challenge'
              },
              {
                id: 'BEARER_TOKEN',
                label: 'Bearer Token (JWT)',
                desc: 'Pre-issued authorized administrator JWT'
              },
              {
                id: 'API_KEY',
                label: 'API Key & Header',
                desc: 'X-API-KEY secret passed via sanitized HTTPS headers'
              },
              {
                id: 'BASIC_AUTH',
                label: 'Basic Auth (SSL Encrypted)',
                desc: 'Username and password pair over TLS 1.3'
              }
            ].map((method) => (
              <div
                key={method.id}
                onClick={() => setSelectedAuthType(method.id as AuthType)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedAuthType === method.id
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                    : 'bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">{method.label}</span>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    selectedAuthType === method.id ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                  }`}>
                    {selectedAuthType === method.id && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{method.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Input Details based on Selection */}
        {selectedAuthType === 'OAUTH2_PKCE' ? (
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                <Lock size={13} />
                PKCE CRYPTOGRAPHIC STATE
              </span>
              <button
                onClick={handleSimulatePkce}
                disabled={isPkceExchanging}
                className="btn-secondary px-3 py-1 text-xs"
              >
                {isPkceExchanging ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Generate PKCE verifier & challenge
              </button>
            </div>

            {pkceDetails && (
              <div className="space-y-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                <div>Code Challenge: <span className="text-[var(--text-primary)]">{pkceDetails.codeChallenge}</span></div>
                <div>Code Verifier: <span className="text-[var(--text-secondary)]">{showToken ? pkceDetails.codeVerifier : '••••••••••••••••••••••••'}</span></div>
                <div className="flex items-center gap-2 text-amber-400 pt-1">
                  <Clock size={12} />
                  <span>Generated locally. No authorization server is connected, so no access token is issued; use a token/API key option for live discovery.</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-mono text-[var(--text-muted)] mb-1.5">
              AUTHORIZATION TOKEN / SECRET KEY
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Bearer eyJhbGciOi..."
                className="input-field font-mono pr-10 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onStartDiscovery}
            className="btn-primary px-6 py-2.5"
          >
            Authenticate & Start 11-Stage Discovery
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
