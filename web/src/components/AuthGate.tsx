import React, { useState } from 'react';
import { api, SessionUser } from '../services/api';

interface Props {
  onAuthenticated: (user: SessionUser) => void;
  sessionExpired?: boolean;
}

export const AuthGate: React.FC<Props> = ({ onAuthenticated, sessionExpired }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = mode === 'login' ? await api.login(email, password) : await api.register({ orgName, email, password, name });
      onAuthenticated(user);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] outline-none focus:border-cyan-500/60';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">SitePulse AI</h1>
          <p className="text-xs text-[var(--text-secondary)]">{mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace (free plan)'}</p>
        </div>
        {sessionExpired && <p className="text-xs text-amber-400">Your session ended. Please sign in again.</p>}
        {mode === 'register' && (
          <>
            <input className={input} placeholder="Organisation name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required minLength={2} />
            <input className={input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          </>
        )}
        <input className={input} type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          className={input}
          type="password"
          placeholder={mode === 'register' ? 'Password (10+ characters)' : 'Password'}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
        <button disabled={busy} className="w-full py-2 rounded-lg bg-cyan-500 text-black text-sm font-bold disabled:opacity-50">
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }} className="w-full text-xs text-[var(--text-secondary)] hover:text-white">
          {mode === 'login' ? 'New here? Create a workspace' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  );
};
