import React, { useEffect, useState } from 'react';
import { PlugZap, ScanLine, LockKeyhole, RefreshCw, ArrowUpRight, Trash2 } from 'lucide-react';
import './settings.css';
import ConfirmDialog from './ConfirmDialog';

export default function Settings({ health, api, token, setToken, refresh }) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function reset() {
    if (health?.mode !== 'demo') return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/demo/reset', { method: 'POST' });
      await refresh({ throwOnError: true });
      await readStatus();
      setNotice('Synthetic workspace reset.');
      setConfirmReset(false);
    } catch (e) {
      setError(e.message);
      setConfirmReset(false);
    } finally {
      setBusy(false);
    }
  }
  async function readStatus() {
    setLoading(true);
    setError('');
    try {
      setStatus(await api('/paypal/status'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    readStatus();
  }, []);
  const isSandbox = health?.mode === 'sandbox';
  const canSync =
    isSandbox &&
    status?.configured &&
    status?.admin_configured &&
    !!token.trim() &&
    !busy &&
    !loading;
  async function sync() {
    if (!canSync) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api('/paypal/sync', { method: 'POST' });
      await refresh({ throwOnError: true });
      await readStatus();
      setNotice(result.detail || `${result.imported} sandbox cases imported.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-layout">
      <section className="settings-sheet">
        <div className="sheet-title">
          <PlugZap size={19} />
          <div>
            <p className="eyebrow">PAYPAL / SANDBOX ONLY</p>
            <h2>A credential check is not a connection.</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Refresh credential readiness"
            onClick={readStatus}
            disabled={loading}
          >
            <RefreshCw size={16} />
          </button>
        </div>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="settings-notice">
            {notice}
          </p>
        )}
        {!status ? (
          <p role="status" className="settings-loading">
            Checking safe credential status…
          </p>
        ) : (
          <>
            <dl className="connection-facts">
              <div>
                <dt>Environment</dt>
                <dd>PayPal sandbox</dd>
              </div>
              <div>
                <dt>Application mode</dt>
                <dd>{health?.mode || 'Unconfirmed'}</dd>
              </div>
              <div>
                <dt>Backend credentials</dt>
                <dd>
                  <span className={`connection-badge ${status.configured ? 'configured' : ''}`}>
                    {status.configured ? 'Configured · not verified' : 'Not configured'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Network verification</dt>
                <dd>{status.network_tested ? 'See server status details' : 'Not tested'}</dd>
              </div>
              <div>
                <dt>Server admin token</dt>
                <dd>{status.admin_configured ? 'Configured' : 'Not confirmed'}</dd>
              </div>
            </dl>
            <p className="settings-detail">{status.detail}</p>
          </>
        )}
        <div className="settings-inset">
          <h3>Connect on the server, not in the browser.</h3>
          <p>
            Set <code>PAYPAL_CLIENT_ID</code>, <code>PAYPAL_CLIENT_SECRET</code>,{' '}
            <code>SHIELDPAY_ADMIN_TOKEN</code> and sandbox mode on the backend. Enable Disputes in
            the PayPal app. This console never asks for your PayPal password or stores client
            secrets.
          </p>
          <a href="https://developer.paypal.com/docs/disputes/" target="_blank" rel="noreferrer">
            PayPal Disputes documentation
            <ArrowUpRight size={13} />
          </a>
        </div>
        {isSandbox && (
          <div className="token-form">
            <label className="form-label" htmlFor="admin-token">
              Session admin token
            </label>
            <input
              id="admin-token"
              className="text-input"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Required for sandbox records and actions"
            />
            <p className="micro">
              Memory only; cleared on reload. Never written to browser storage. Sent only to this
              backend for sandbox actions.
            </p>
            <button
              className="secondary"
              disabled={!token || busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await refresh({ throwOnError: true });
                  setNotice('Sandbox records unlocked for this session.');
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Unlock sandbox records
            </button>
            <button className="text-button" disabled={!token} onClick={() => setToken('')}>
              Clear session token
            </button>
          </div>
        )}
        <button className="secondary" disabled={!canSync} onClick={sync}>
          <RefreshCw size={14} />
          {busy && !confirmReset ? 'Syncing sandbox…' : 'Sync sandbox disputes'}
        </button>
        <p className="micro">
          {isSandbox
            ? 'Requires configured credentials and a session admin token. Imported cases need real scoped merchant evidence.'
            : 'Disabled in demo mode. Synthetic IDs are never sent to PayPal.'}
        </p>
      </section>
      <div className="settings-side">
        <section className="settings-sheet ai-sheet">
          <ScanLine size={21} strokeWidth={1.5} />
          <p className="eyebrow">ANALYSIS TRANSPARENCY</p>
          <h2>Retrieval, not a generative LLM</h2>
          <p className="provider-name">
            {health?.ai?.provider || 'Unknown provider'}{' '}
            <span className="connection-badge">
              {health?.ai?.ready
                ? 'Semantic model ready'
                : health?.ai?.provider === 'lexical-baseline'
                  ? 'Baseline active'
                  : 'Model not ready'}
            </span>
          </p>
          <p>{health?.ai?.detail || 'Connect to the backend to inspect the active provider.'}</p>
          <p>
            The local ONNX option performs semantic retrieval. The lexical baseline uses
            deterministic matching. Neither creates new evidence. Safety checks and source
            quotations are deterministic; there is no LLM-generated narrative or fake streaming.
          </p>
        </section>
        <section className="settings-sheet reset-sheet">
          <LockKeyhole size={19} />
          <p className="eyebrow">ISOLATED SYNTHETIC WORKSPACE</p>
          <h2>A safe place to rehearse.</h2>
          <p>
            Reset clears synthetic analysis, approvals and receipts, then reseeds the example cases.
            Sandbox cases are not touched.
          </p>
          <button
            className="secondary"
            disabled={isSandbox || !health || busy}
            onClick={() => setConfirmReset(true)}
          >
            <Trash2 size={14} />
            Reset synthetic demo
          </button>
          <p className="micro">
            {isSandbox
              ? 'Reset is disabled in sandbox mode.'
              : 'A confirmation is required before any data is cleared.'}
          </p>
        </section>
      </div>
      {confirmReset && (
        <ConfirmDialog
          title="Reset this synthetic workspace?"
          confirmLabel="Confirm reset"
          onConfirm={reset}
          onClose={() => setConfirmReset(false)}
          busy={busy}
        >
          <p>
            Synthetic analysis, approvals, audit entries and simulation receipts will be cleared.
            The backend will reseed its sample cases.
          </p>
          <p>No sandbox dispute will be changed.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
