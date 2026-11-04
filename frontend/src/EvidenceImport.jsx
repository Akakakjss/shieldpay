import React, { useId, useState } from 'react';
import './import.css';
import { validateImport } from './importValidation';
import ConfirmDialog from './ConfirmDialog';

export default function EvidenceImport({
  detail,
  health,
  api,
  onChange,
  onReplaced,
  onLockChange,
}) {
  const id = useId();
  const [text, setText] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const validation = validateImport(text, reviewer, detail.order_id);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  async function refreshReplacement(response) {
    try {
      await onChange(detail.id);
      setResult(response);
      setPending(null);
      setText('');
      setReviewer('');
      setAcknowledged(false);
      setError('');
      onLockChange(false);
    } catch (e) {
      setError(
        `Replacement accepted, but case refresh failed: ${e.message} Displayed source records may be stale. Retry the refresh before any further action.`,
      );
    }
  }
  async function retryRefresh() {
    if (busy || !pending) return;
    setBusy(true);
    await refreshReplacement(pending);
    setBusy(false);
  }
  async function replace() {
    if (health?.mode !== 'sandbox' || !validation.valid || !acknowledged || busy) return;
    setBusy(true);
    onLockChange(true);
    setError('');
    setResult(null);
    try {
      const response = await api(`/cases/${encodeURIComponent(detail.id)}/sources/import`, {
        method: 'POST',
        body: JSON.stringify({
          sources: validation.sources,
          reviewed_by: reviewer.trim(),
          acknowledged_unverified: true,
        }),
      });
      onReplaced();
      setPending(response);
      await refreshReplacement(response);
      setConfirm(false);
    } catch (e) {
      setError(e.message);
      onLockChange(false);
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  }
  const example = [
    {
      type: 'order',
      title: 'Synthetic order record',
      text: `Order: ${detail.order_id}\nTracking: TEST-101`,
      occurred_at: '2025-01-01T12:00:00Z',
      order_id: detail.order_id,
    },
    {
      type: 'carrier',
      title: 'Synthetic delivery record',
      text: `Order: ${detail.order_id}\nTracking: TEST-101\nDelivery status: DELIVERED\nDelivered at: 2025-01-02T12:00:00Z`,
      occurred_at: '2025-01-02T12:00:00Z',
      order_id: detail.order_id,
    },
    {
      type: 'buyer_message',
      title: 'Synthetic buyer message',
      text: `Order: ${detail.order_id}\nBuyer statement: I received the parcel. Thank you.`,
      occurred_at: '2025-01-03T12:00:00Z',
      order_id: detail.order_id,
    },
  ];
  return (
    <details className="evidence-import">
      <summary>Import sandbox evidence</summary>
      <div className="import-body">
        <p className="section-label">LOCAL REPLACEMENT · SANDBOX ONLY</p>
        <h4>Bring records into this case.</h4>
        <p>
          No real personal data. Use synthetic sandbox records only; do not paste credentials,
          addresses or real buyer messages. This changes local evidence, not PayPal.
        </p>
        <p>
          Human-provided records remain unverified, NOT carrier authenticated. Importing does not
          establish authenticity or approve a response.
        </p>
        <p className="micro">
          Requires the session admin token from Settings. It stays in React memory and is sent only
          with protected sandbox reads and actions. Reviewer: a nonblank, single-line name or
          operator ID, at most 100 characters.
        </p>
        <details className="import-help">
          <summary>JSON schema and text format examples</summary>
          <p>
            Paste a JSON array of 1–20 records, not the API envelope. Every record requires exactly
            these five string fields; no extra fields:
          </p>
          <dl>
            <dt>type</dt>
            <dd>order, carrier or buyer_message (exact values).</dd>
            <dt>title</dt>
            <dd>1–200 characters, nonblank, single line.</dd>
            <dt>text</dt>
            <dd>
              Nonblank; at most 16,384 UTF-8 bytes. Newlines and tabs allowed, other control
              characters forbidden.
            </dd>
            <dt>occurred_at</dt>
            <dd>
              Nonfuture ISO-8601 timestamp with timezone, at most 64 characters; e.g.
              2025-01-02T12:00:00Z.
            </dd>
            <dt>order_id</dt>
            <dd>1–255 characters, single line; must equal {detail.order_id}.</dd>
          </dl>
          <p>
            Text fields are case-sensitive: each line uses a colon and a space. Include exactly one
            matching Order field in every record. Order and carrier Tracking values must match.
            Delivery proof needs Delivery status: DELIVERED and a nonfuture, timezone-bearing
            Delivered at timestamp. Arbitrary prose is not parsed as proof.
          </p>
          <p>
            Buyer receipt text supported by the deterministic parser is shown below. To report a
            problem, use Issue: WRONG_ITEM, NOT_AS_DESCRIBED or NOT_RECEIVED and preserve the buyer
            statement. Never rewrite a contradiction into a receipt.
          </p>
          <pre data-testid="import-example">{JSON.stringify(example, null, 2)}</pre>
          <p>
            Examples only, not evidence. Copy only if these synthetic facts are appropriate. The
            form sends sources plus reviewed_by and acknowledged_unverified: true after explicit
            confirmation; it does not send IDs or hashes.
          </p>
        </details>
        {error && (
          <div className="inline-error" role="alert">
            <strong>Import stopped.</strong> {error} No successful replacement is claimed. Check the
            case before retrying.
          </div>
        )}
        {pending && (
          <button className="secondary wide" onClick={retryRefresh} disabled={busy}>
            {busy ? 'Refreshing case…' : 'Retry case refresh'}
          </button>
        )}
        {result && (
          <div className="import-result" role="status">
            {result.imported} record(s) replaced · unverified. Case refreshed. Analyze again,
            generate a new PDF and approve it before responding.
          </div>
        )}
        <label className="form-label" htmlFor={`${id}-json`}>
          Source records JSON
        </label>
        <textarea
          disabled={busy || !!pending}
          id={`${id}-json`}
          className="text-input import-json"
          rows={10}
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          autoComplete="off"
          placeholder="Paste a JSON array of source records…"
        />
        <label className="form-label" htmlFor={`${id}-reviewer`}>
          Reviewed by
        </label>
        <input
          disabled={busy || !!pending}
          id={`${id}-reviewer`}
          className="text-input"
          value={reviewer}
          onChange={(event) => setReviewer(event.target.value)}
          maxLength={100}
          autoComplete="off"
          placeholder="Sandbox operator name or ID"
        />
        <label className="review-checkbox">
          <input
            disabled={busy || !!pending}
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>
            I acknowledge these records are unverified human-provided evidence, NOT carrier
            authenticated, and contain no real personal data.
          </span>
        </label>
        {validation.errors.length > 0 && (
          <div className="inline-error" role="alert" id={`${id}-validation`}>
            <strong>Import not ready.</strong>
            <ul>
              {validation.errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          className="primary wide"
          disabled={!validation.valid || !acknowledged || busy || !!pending}
          onClick={() => setConfirm(true)}
        >
          Review replacement
        </button>
        {confirm && (
          <ConfirmDialog
            title="Replace this case’s evidence?"
            confirmLabel="Confirm replacement"
            busy={busy}
            onConfirm={replace}
            onClose={() => setConfirm(false)}
          >
            <p>
              Case <strong>{detail.id}</strong> · order <strong>{detail.order_id}</strong>.
            </p>
            <p>
              This will replace all {detail.sources.length} existing records with{' '}
              {validation.sources.length} human-provided record(s). This is replacement, not append.
            </p>
            <p>
              Existing analysis, generated PDF and local approval will be invalidated. Analyze and
              review a new packet before any response.
            </p>
            <p>
              Reviewed by <strong>{reviewer.trim()}</strong>. Records remain unverified, NOT carrier
              authenticated. No PayPal request is sent by this import.
            </p>
          </ConfirmDialog>
        )}
      </div>
    </details>
  );
}
