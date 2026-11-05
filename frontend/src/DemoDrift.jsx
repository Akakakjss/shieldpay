import React, { useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';

export default function DemoDrift({
  detail,
  api,
  onChange,
  onInvalidated,
  onLockChange,
  disabled,
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(null);
  const [error, setError] = useState('');
  const applied = detail.sources.some((s) => s.demo_event === 'late_buyer_message');
  useEffect(() => {
    if (!detail.sources.some((s) => s.demo_event === 'late_buyer_message')) setAccepted(null);
  }, [detail.sources]);

  async function readback() {
    try {
      await onChange(detail.id);
      setPending(false);
      setError('');
      onLockChange(false);
    } catch (e) {
      setError(
        `Scenario accepted, but refresh failed: ${e.message}. The old review is invalid. Retry readback; do not inject again.`,
      );
    }
  }
  async function retry() {
    if (busy || !pending) return;
    setBusy(true);
    await readback();
    setBusy(false);
  }
  async function apply() {
    if (busy || pending || applied || disabled) return;
    setBusy(true);
    onLockChange(true);
    setError('');
    try {
      const response = await api(`/demo/cases/${encodeURIComponent(detail.id)}/late-message`, {
        method: 'POST',
      });
      setAccepted(response);
      setPending(true);
      setConfirm(false);
      onInvalidated();
      await readback();
    } catch (e) {
      setError(e.message);
      setConfirm(false);
      onLockChange(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="demo-drift" aria-label="Synthetic evidence drift scenario">
      <p className="section-label">SYNTHETIC SCENARIO · NO PAYPAL REQUEST</p>
      <p>Add a late buyer message to see why a changed record needs a new review.</p>
      <button
        className="secondary wide"
        disabled={disabled || busy || pending || applied || !!accepted}
        onClick={() => setConfirm(true)}
      >
        Simulate late buyer message
      </button>
      {accepted && (
        <div className="drift-warning" role="status">
          <strong>
            {accepted.invalidated_approvals > 0
              ? 'Approval invalidated'
              : 'Previous review invalidated'}
          </strong>
          <p>
            {accepted.invalidated_approvals} local approval(s) revoked. The previous PDF no longer
            authorizes a response. Analyze again to inspect the new contradiction.
          </p>
          {accepted.previous_packet_hash && (
            <code className="hash">Previous packet: {accepted.previous_packet_hash}</code>
          )}
        </div>
      )}
      {applied && !accepted && (
        <p className="micro">
          Late-message scenario applied. Reset the synthetic demo in Settings to repeat it.
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {pending && (
        <button className="secondary wide" disabled={busy} onClick={retry}>
          Retry drift readback
        </button>
      )}
      {confirm && (
        <ConfirmDialog
          title="Add a synthetic late buyer message?"
          confirmLabel="Add synthetic message"
          busy={busy}
          onConfirm={apply}
          onClose={() => setConfirm(false)}
        >
          <p>
            This changes only {detail.id}'s local synthetic evidence. Existing analysis and approval
            will be invalidated. No PayPal request will be sent.
          </p>
          <p>
            The new message contradicts the earlier receipt acknowledgment. Reset the demo in
            Settings to restore the original scenario.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
