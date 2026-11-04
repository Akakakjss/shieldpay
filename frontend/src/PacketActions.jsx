import React, { useEffect, useId, useState } from 'react';
import { Download, FileCheck2, LockKeyhole, Check, ArrowUpRight } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import './actions.css';

export default function PacketActions({
  detail,
  health,
  api,
  onChange,
  canSubmit = detail.analysis.can_submit,
}) {
  const analysis = detail.analysis;
  const id = useId();
  const [pdf, setPdf] = useState('');
  const [name, setName] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [approval, setApproval] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const isDemo = health?.mode === 'demo';
  const path = `/cases/${encodeURIComponent(detail.id)}`;
  useEffect(
    () => () => {
      if (pdf) URL.revokeObjectURL(pdf);
    },
    [pdf],
  );
  async function generate() {
    setBusy('pdf');
    setError('');
    try {
      const blob = await api(path + '/packet.pdf', { responseType: 'blob' });
      setPdf(URL.createObjectURL(blob));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }
  async function approve() {
    if (!canSubmit || !pdf || !reviewed || !name.trim()) return;
    setBusy('approve');
    setError('');
    try {
      const response = await api(path + '/approve', {
        method: 'POST',
        body: JSON.stringify({ packet_hash: analysis.packet_hash, approved_by: name.trim() }),
      });
      if (response.packet_hash !== analysis.packet_hash || response.status !== 'approved')
        throw new Error('Approval did not match this packet. Analyze and review again.');
      await onChange(detail.id);
      setApproval(response);
    } catch (e) {
      setApproval(null);
      setError(e.message);
    } finally {
      setBusy('');
    }
  }
  async function submit() {
    if (!canSubmit || !approval) return;
    setBusy('submit');
    setError('');
    try {
      const response = await api(path + '/submit', {
        method: 'POST',
        body: JSON.stringify({
          approval_id: approval.approval_id,
          packet_hash: analysis.packet_hash,
        }),
      });
      await onChange(detail.id);
      setResult(response);
      setConfirm(false);
    } catch (e) {
      setApproval(null);
      setConfirm(false);
      setError(e.message);
    } finally {
      setBusy('');
    }
  }
  return (
    <section className="packet-actions" aria-label="Packet approval and submission">
      <div className="workflow-steps">
        <span className={pdf ? 'complete' : ''}>
          <i>{pdf ? <Check size={9} /> : '1'}</i>Packet
        </span>
        <b>—</b>
        <span className={approval ? 'complete' : ''}>
          <i>{approval ? <Check size={9} /> : '2'}</i>Approval
        </span>
        <b>—</b>
        <span className={result ? 'complete' : ''}>
          <i>{result ? <Check size={9} /> : '3'}</i>
          {isDemo ? 'Simulation' : 'Sandbox'}
        </span>
      </div>
      <h4>Review before you respond.</h4>
      <p className="micro">
        The PDF contains the evidence, citations and limitations. Generating a packet does not
        approve or submit it.
      </p>
      <button className="secondary wide" onClick={generate} disabled={!!busy}>
        <Download size={15} />
        {busy === 'pdf' ? 'Generating PDF…' : 'Generate PDF packet'}
      </button>
      {pdf && (
        <a className="pdf-link" href={pdf} download={`ShieldPay-${detail.id}-evidence.pdf`}>
          <FileCheck2 size={14} />
          Download evidence PDF
          <ArrowUpRight size={12} />
        </a>
      )}
      <div className="packet-fingerprint">
        <span>PACKET SHA-256</span>
        <code>{analysis.packet_hash}</code>
      </div>
      {!result && (
        <>
          <label className="form-label" htmlFor={`${id}-approver`}>
            Approved by
          </label>
          <input
            className="text-input"
            id={`${id}-approver`}
            placeholder="Your name or operator ID"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            disabled={!!busy || !!approval || !canSubmit}
            autoComplete="off"
          />
          <label className="review-checkbox">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
              disabled={!pdf || !!busy || !!approval || !canSubmit}
            />
            <span>I reviewed the PDF and its cited evidence. I approve this exact packet.</span>
          </label>
          <button
            className="primary wide"
            onClick={approve}
            disabled={!canSubmit || !pdf || !reviewed || !name.trim() || !!busy || !!approval}
          >
            <LockKeyhole size={14} />
            {busy === 'approve' ? 'Recording approval…' : 'Approve packet'}
          </button>
          {approval && (
            <div className="approval-confirmed" role="status">
              <Check size={14} />
              <span>
                Approved locally · not sent to PayPal<small>{approval.approval_id}</small>
              </span>
            </div>
          )}
          <button
            className="secondary wide submit-button"
            onClick={() => setConfirm(true)}
            disabled={!canSubmit || !approval || !!busy || (!isDemo && !health?.paypal?.configured)}
          >
            <ArrowUpRight size={15} />
            {isDemo ? 'Simulate submission' : 'Submit to PayPal sandbox'}
          </button>
          <p className="micro">
            {!canSubmit
              ? 'Submission is blocked by the evidence checks. Resolve every blocker and analyze again.'
              : isDemo
                ? 'Demo mode: this records a simulated receipt only. No PayPal network write.'
                : 'Sandbox only. A local approval is not PayPal acceptance. The server rechecks allowed actions.'}
          </p>
        </>
      )}
      {result && (
        <div className="submission-result" role="status">
          <span className="result-mark">
            <Check size={18} />
          </span>
          <h4>
            {result.status === 'simulated'
              ? 'Simulated · not submitted to PayPal'
              : result.verified
                ? 'Sandbox submission verified'
                : 'Sandbox response · not verified'}
          </h4>
          <p>{result.detail}</p>
          {result.receipt && (
            <dl>
              <dt>RECEIPT</dt>
              <dd>{result.receipt}</dd>
            </dl>
          )}
          <p className="micro">
            {result.verified
              ? 'The server re-read the sandbox dispute after the write.'
              : 'No verified PayPal submission is claimed.'}
          </p>
        </div>
      )}
      {error && (
        <div className="inline-error" role="alert">
          <strong>Action stopped.</strong> {error} No successful submission is claimed.
        </div>
      )}
      {confirm && (
        <ConfirmDialog
          title={isDemo ? 'Simulate this response?' : 'Send to PayPal sandbox?'}
          confirmLabel={isDemo ? 'Confirm simulation' : 'Confirm sandbox submission'}
          onConfirm={submit}
          onClose={() => setConfirm(false)}
          busy={busy === 'submit'}
        >
          <p>
            {isDemo
              ? 'This will record a synthetic receipt, not contact PayPal.'
              : 'This may send the approved PDF to PayPal sandbox. It does not affect live PayPal accounts.'}
          </p>
          <p>
            Case <strong>{detail.id}</strong> · approved by <strong>{name}</strong>.
          </p>
          <p className="micro">
            Only packet <code className="hash">{analysis.packet_hash}</code> is authorized. No
            automatic follow-up actions.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
