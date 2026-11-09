import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

/**
 * Real store connections (server-backed). Credentials are typed here, sent once to the backend over HTTPS,
 * verified against the store, stored encrypted on the server and cleared from this component's state immediately.
 * Nothing here talks to a store directly and no credential is ever kept in the browser.
 */
interface ServerSite {
  id: string;
  name: string;
  url: string;
  platform?: string;
  apiHealth?: string;
  hasCredentials: boolean;
  connection: { status: string; lastSyncAt?: number | null; lastError?: string | null; writeVerified?: boolean; siteName?: string | null };
}
interface Manifest {
  hubMode: string;
  replicationNote: string;
  capabilities: Array<{ id: string; label: string; hub: string; support: string; needs?: string }>;
  synced: { products: number; orders: number; lastSyncAt: number | null };
}

const badge = (status: string) =>
  status === 'CONNECTED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  : status === 'DISCONNECTED' ? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
  : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

export const ConnectedStoresPanel: React.FC<{ role: string }> = ({ role }) => {
  const isOwner = role === 'OWNER';
  const [sites, setSites] = useState<ServerSite[]>([]);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [ck, setCk] = useState('');
  const [cs, setCs] = useState('');
  const [manifests, setManifests] = useState<Record<string, Manifest>>({});
  const [webhookInfo, setWebhookInfo] = useState<{ path: string; secret: string | null } | null>(null);
  const [cmd, setCmd] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<ServerSite[]>('/api/v1/websites');
      setSites(data);
    } catch (e: any) {
      setMsg({ kind: 'err', text: e.message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setMsg(null);
    try { await fn(); } catch (e: any) { setMsg({ kind: 'err', text: e.message || 'Request failed' }); }
    setBusy(null);
  };

  const addSite = () => run('add', async () => {
    await api.post('/api/v1/websites', { url: newUrl, name: newName || undefined });
    setNewUrl(''); setNewName(''); await load();
    setMsg({ kind: 'ok', text: 'Website added. Next, connect it with its WooCommerce API key.' });
  });

  const connect = (id: string) => run(`c${id}`, async () => {
    const { data } = await api.put<any>(`/api/v1/websites/${id}/credentials`, { platform: 'woocommerce', consumerKey: ck, consumerSecret: cs });
    setCk(''); setCs(''); setOpen(null);
    setWebhookInfo(data.inboundWebhook);
    await load();
    setMsg({ kind: 'ok', text: 'Connected. Read access was verified with the store. Write permission is only confirmed on the first change.' });
  });

  const sync = (id: string) => run(`s${id}`, async () => {
    const { data } = await api.post<any>(`/api/v1/websites/${id}/sync`, {});
    await load(); await loadManifest(id);
    setMsg({ kind: 'ok', text: `Synchronised: ${data.products} products, ${data.orders} orders${data.truncated ? ' (stopped at the page limit)' : ''}.` });
  });

  const disconnect = (id: string) => {
    if (!window.confirm('Disconnect this website? Stored credentials are destroyed and SitePulse can no longer read or change the store. Synced records are kept.')) return;
    run(`d${id}`, async () => { await api.delete(`/api/v1/websites/${id}`); await load(); setMsg({ kind: 'ok', text: 'Disconnected. Credentials destroyed.' }); });
  };

  const loadManifest = async (id: string) => {
    try { const { data } = await api.get<Manifest>(`/api/v1/websites/${id}/manifest`); setManifests((m) => ({ ...m, [id]: data })); } catch { /* shown via msg elsewhere */ }
  };

  const ask = () => run('ai', async () => {
    const { data } = await api.post<any>('/api/v1/ai/command', { text: cmd });
    setAiResult(data);
  });
  const confirmProposal = () => run('aic', async () => {
    const { data } = await api.post<any>(`/api/v1/ai/command/${aiResult.proposalId}/confirm`, {});
    setAiResult(null); setCmd('');
    setMsg({ kind: 'ok', text: data.remoteConfirmed ? 'Price changed and confirmed on the website.' : 'Price changed in the SitePulse workspace only (no connected website for this product).' });
  });

  return (
    <section className="glass-panel p-4 sm:p-6 space-y-4" aria-label="Connected stores">
      <div>
        <h3 className="text-sm font-extrabold text-[var(--text-primary)]">Connected stores (live)</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          Currently supported: WooCommerce (REST API key). Shopify and custom APIs are not available yet. A website address alone is never enough: the owner must provide authorisation.
        </p>
      </div>

      {msg && <div role="status" className={`text-xs p-2 rounded-lg border ${msg.kind === 'ok' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'}`}>{msg.text}</div>}

      {webhookInfo && (
        <div className="text-xs p-3 rounded-lg border border-cyan-500/30 space-y-1">
          <div className="font-bold text-cyan-400">Optional: real-time updates</div>
          <div>In WooCommerce add webhooks (order.created, order.updated, product.updated) to <code className="font-mono break-all">{window.location.origin}{webhookInfo.path}</code></div>
          {webhookInfo.secret ? <div>Secret (shown once): <code className="font-mono break-all">{webhookInfo.secret}</code></div> : <div>The secret was issued earlier and cannot be shown again.</div>}
          <button className="btn-secondary px-2 py-1 text-[11px]" onClick={() => setWebhookInfo(null)}>I saved it</button>
        </div>
      )}

      {isOwner && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="input-field font-mono flex-1" placeholder="https://yourstore.com" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          <input className="input-field flex-1" placeholder="Name (optional)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn-primary px-4 text-xs" disabled={!newUrl || busy === 'add'} onClick={addSite}>Add website</button>
        </div>
      )}

      <div className="space-y-3">
        {sites.length === 0 && <p className="text-xs text-[var(--text-muted)]">No websites registered on the server yet.</p>}
        {sites.map((s) => {
          const m = manifests[s.id];
          return (
            <div key={s.id} className="p-3 rounded-xl border border-[var(--border-color)] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[var(--text-primary)] truncate">{s.name}</div>
                  <div className="text-xs font-mono text-[var(--text-muted)] break-all">{s.url}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold ${badge(s.connection.status)}`}>{s.connection.status}</span>
              </div>
              {s.connection.status === 'CONNECTED' && (
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Health: {s.apiHealth} · Last sync: {s.connection.lastSyncAt ? new Date(s.connection.lastSyncAt).toLocaleString() : 'never'}
                  {s.connection.lastError ? <span className="text-red-400"> · Last error: {s.connection.lastError}</span> : null}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {s.connection.status === 'CONNECTED' ? (
                  <>
                    <button className="btn-primary px-3 py-1.5 text-xs" disabled={busy === `s${s.id}`} onClick={() => sync(s.id)}>{busy === `s${s.id}` ? 'Syncing…' : 'Sync now'}</button>
                    <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => loadManifest(s.id)}>What can SitePulse do here?</button>
                    {isOwner && <button className="btn-secondary px-3 py-1.5 text-xs text-red-400" onClick={() => disconnect(s.id)}>Disconnect</button>}
                  </>
                ) : isOwner ? (
                  <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => setOpen(open === s.id ? null : s.id)}>Connect WooCommerce</button>
                ) : null}
              </div>
              {open === s.id && (
                <form className="space-y-2" autoComplete="off" onSubmit={(e) => { e.preventDefault(); connect(s.id); }}>
                  <p className="text-[11px] text-[var(--text-muted)]">Create a key in WooCommerce → Settings → Advanced → REST API. Use Read for viewing only, Read/Write to let SitePulse change prices, stock and orders. It is encrypted on the server and never shown again.</p>
                  <input className="input-field font-mono" placeholder="Consumer key (ck_…)" value={ck} onChange={(e) => setCk(e.target.value)} autoComplete="off" />
                  <input className="input-field font-mono" type="password" placeholder="Consumer secret (cs_…)" value={cs} onChange={(e) => setCs(e.target.value)} autoComplete="new-password" />
                  <button className="btn-primary px-3 py-1.5 text-xs" disabled={busy === `c${s.id}`} type="submit">{busy === `c${s.id}` ? 'Verifying with store…' : 'Verify & connect'}</button>
                </form>
              )}
              {m && (
                <div className="text-[11px] space-y-1">
                  <div className="text-[var(--text-secondary)]">{m.replicationNote}</div>
                  <div>Synced: {m.synced.products} products, {m.synced.orders} orders</div>
                  <ul className="space-y-0.5">
                    {m.capabilities.map((c) => (
                      <li key={c.id} className="flex justify-between gap-2">
                        <span>{c.label}</span>
                        <span className={c.support === 'SUPPORTED' ? 'text-emerald-400' : 'text-amber-400'}>{c.support === 'SUPPORTED' ? 'Supported' : c.support === 'NOT_IMPLEMENTED' ? 'Not built yet' : 'Not possible'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
        <h4 className="text-xs font-bold text-[var(--text-primary)]">Ask SitePulse</h4>
        <p className="text-[11px] text-[var(--text-muted)]">Examples: “Which products are low in stock?”, “Show today's orders”, “Change Shirt price to 999”. Changes are only proposed; nothing happens until you confirm.</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="input-field flex-1" value={cmd} onChange={(e) => setCmd(e.target.value)} placeholder="Type a request" onKeyDown={(e) => { if (e.key === 'Enter' && cmd) ask(); }} />
          <button className="btn-secondary px-4 text-xs" disabled={!cmd || busy === 'ai'} onClick={ask}>Ask</button>
        </div>
        {aiResult && (
          <div className="text-xs p-3 rounded-lg border border-[var(--border-color)] space-y-2">
            <div>{aiResult.summary || aiResult.message}</div>
            {Array.isArray(aiResult.data) && aiResult.data.length > 0 && (
              <ul className="font-mono text-[11px] space-y-0.5">{aiResult.data.map((r: any) => <li key={r.id}>{r.name || r.customer} {r.stock !== undefined ? `· stock ${r.stock}` : ''} {r.status ? `· ${r.status}` : ''}</li>)}</ul>
            )}
            {aiResult.kind === 'PROPOSAL' && (
              <div className="flex gap-2">
                <button className="btn-primary px-3 py-1.5 text-xs" disabled={busy === 'aic'} onClick={confirmProposal}>Confirm change</button>
                <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setAiResult(null)}>Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
