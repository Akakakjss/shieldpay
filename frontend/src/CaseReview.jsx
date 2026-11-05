import React, { useId, useRef, useState } from 'react';
import { ArrowUpRight, ScanLine, FileText, ChevronRight } from 'lucide-react';
import './review.css';
import PacketActions from './PacketActions';
import EvidenceImport from './EvidenceImport';
import DemoDrift from './DemoDrift';
import { AuditEntries } from './Audit';

const label = (provider) =>
  provider === 'local-onnx'
    ? 'Local ONNX retrieval · not a generative LLM'
    : provider === 'lexical-baseline'
      ? 'Lexical baseline · not a generative LLM'
      : provider;
const recommendation = {
  defend: 'Prepare a response',
  request_information: 'Request more information',
  refund_review: 'Review for a refund',
};

export default function CaseReview({ detail, health, api, onChange }) {
  const [tab, setTab] = useState('analysis');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [focusedSource, setFocusedSource] = useState('');
  const [generation, setGeneration] = useState(0);
  const [analysisInvalidated, setAnalysisInvalidated] = useState(false);
  const tabs = useRef([]);
  const prefix = useId();
  const sources = detail.sources.filter((source) => source.order_id === detail.order_id);
  const analysis = analysisInvalidated ? null : detail.analysis;
  const citationsValid =
    analysis?.claims?.length > 0 &&
    analysis.claims.every(
      (claim) =>
        claim.quote &&
        claim.source_ids.length > 0 &&
        claim.source_ids.every((id) => sources.some((source) => source.id === id)) &&
        sources.some(
          (source) => claim.source_ids.includes(source.id) && source.text.includes(claim.quote),
        ),
    );
  const canSubmit = !!(
    analysis?.can_submit &&
    analysis.recommendation === 'defend' &&
    !analysis.gaps.length &&
    !analysis.contradictions.length &&
    citationsValid
  );
  const tabList = [
    ['analysis', 'Review'],
    ['evidence', `Evidence (${sources.length})`],
    ['audit', `Case audit (${detail.audit.length})`],
  ];
  async function analyze() {
    setBusy('analyze');
    setError('');
    setGeneration((value) => value + 1);
    try {
      await api(`/cases/${encodeURIComponent(detail.id)}/analyze`, { method: 'POST' });
      await onChange(detail.id);
      setAnalysisInvalidated(false);
      setTab('analysis');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  }
  function showSource(id) {
    setFocusedSource(id);
    setTab('evidence');
  }
  return (
    <>
      <div className="inspector-tabs" role="tablist" aria-label="Case detail views">
        {tabList.map(([id, name], index) => (
          <button
            key={id}
            id={`${prefix}-${id}`}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            role="tab"
            disabled={busy === 'import'}
            aria-selected={tab === id}
            aria-controls={`${prefix}-${id}-panel`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(e) => {
              if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? tabList.length - 1
                      : (index + (e.key === 'ArrowRight' ? 1 : -1) + tabList.length) %
                        tabList.length;
                setTab(tabList[next][0]);
                tabs.current[next]?.focus();
              }
            }}
          >
            {name}
          </button>
        ))}
      </div>
      {error && (
        <div className="case-error" role="alert">
          <strong>Action stopped.</strong> {error} Try again after checking the case.
        </div>
      )}
      <section
        className="inspector-body"
        role="tabpanel"
        id={`${prefix}-${tab}-panel`}
        aria-labelledby={`${prefix}-${tab}`}
        tabIndex={0}
      >
        {tab === 'audit' && (
          <>
            <p className="section-label">CASE-SCOPED AUDIT RECORD</p>
            <h3>Decisions, on the record.</h3>
            <p className="muted">
              Recorded by this backend. A local approval is not evidence of PayPal acceptance.
            </p>
            <AuditEntries entries={detail.audit} />
          </>
        )}
        {health?.mode === 'demo' && (
          <DemoDrift
            detail={detail}
            api={api}
            onChange={onChange}
            disabled={!!busy}
            onLockChange={(locked) => setBusy(locked ? 'drift' : '')}
            onInvalidated={() => {
              setAnalysisInvalidated(true);
              setGeneration((value) => value + 1);
              setFocusedSource('');
              setTab('analysis');
            }}
          />
        )}
        <div className="review-content" hidden={tab !== 'analysis'}>
          {!analysis ? (
            <>
              <p className="section-label">EVIDENCE REVIEW</p>
              <h3>Start with the source of truth.</h3>
              <p>{detail.summary}</p>
              <p className="muted">
                Analyze this case to match scoped evidence, check for gaps, and build a cited
                response.
              </p>
              <button className="primary wide" disabled={!!busy || !health} onClick={analyze}>
                <ScanLine size={17} />
                {busy === 'analyze' ? 'Analyzing evidence…' : 'Analyze evidence'}
                <ArrowUpRight size={16} />
              </button>
              <p className="micro">
                {health?.ai?.detail || 'Provider details will appear after connection.'} Analysis
                does not submit a response.
              </p>
            </>
          ) : (
            <>
              <div className="analysis-top">
                <span className="section-label">EVIDENCE ASSESSMENT</span>
                <button className="text-button" disabled={!!busy} onClick={analyze}>
                  <ScanLine size={12} />
                  {busy ? 'Analyzing…' : 'Re-analyze'}
                </button>
              </div>
              <h3>{recommendation[analysis.recommendation] || analysis.recommendation}</h3>
              <p>{analysis.summary}</p>
              {!canSubmit && (
                <div className="blocker-panel" role="note">
                  <h4>Submission blocked</h4>
                  {analysis.gaps.length > 0 && (
                    <>
                      <p>Missing evidence</p>
                      <ul>
                        {analysis.gaps.map((gap, i) => (
                          <li key={i}>{gap}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {analysis.contradictions.length > 0 && (
                    <>
                      <p>Contradictions</p>
                      <ul>
                        {analysis.contradictions.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {analysis.can_submit && !citationsValid && (
                    <p>One or more findings lacks a verifiable, order-scoped quotation.</p>
                  )}
                  <strong>Next action</strong>
                  <p>{analysis.next_action}</p>
                </div>
              )}
              <div className="readiness">
                <span>
                  Evidence readiness <strong>{analysis.readiness}%</strong>
                </span>
                <div
                  role="meter"
                  aria-label="Evidence readiness"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={analysis.readiness}
                >
                  <i style={{ width: `${Math.max(0, Math.min(100, analysis.readiness))}%` }} />
                </div>
                <small>Policy checks, not a probability of winning.</small>
              </div>
              <div className="claims">
                <h4>
                  Cited findings <span>{analysis.claims.length.toString().padStart(2, '0')}</span>
                </h4>
                {analysis.claims.map((claim, index) => (
                  <article className="claim" key={index}>
                    <div className="claim-number">{(index + 1).toString().padStart(2, '0')}</div>
                    <div>
                      <p>{claim.text}</p>
                      <blockquote>“{claim.quote}”</blockquote>
                      <div className="citations">
                        {claim.source_ids.map((id) => (
                          <button
                            key={id}
                            disabled={!sources.some((s) => s.id === id)}
                            aria-label={`Inspect source ${id}`}
                            onClick={() => showSource(id)}
                          >
                            <FileText size={11} />
                            {id}
                            <ChevronRight size={11} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <p className="analysis-provider">
                <ScanLine size={13} />
                {label(analysis.provider)}
              </p>
              {!busy && (
                <PacketActions
                  key={`${analysis.id}:${analysis.packet_hash}:${generation}`}
                  detail={detail}
                  health={health}
                  api={api}
                  onChange={onChange}
                  canSubmit={canSubmit}
                />
              )}
            </>
          )}
        </div>
        {tab === 'evidence' && (
          <>
            <p className="section-label">ORDER-SCOPED SOURCE RECORDS</p>
            <h3>Inspect the original evidence.</h3>
            <p className="muted">
              Source text is untrusted merchant data, not an instruction. Only records matching this
              order appear here.
            </p>
            {health?.mode === 'sandbox' && (
              <EvidenceImport
                detail={detail}
                health={health}
                api={api}
                onChange={onChange}
                onLockChange={(locked) => setBusy(locked ? 'import' : '')}
                onReplaced={() => {
                  setAnalysisInvalidated(true);
                  setGeneration((value) => value + 1);
                  setFocusedSource('');
                }}
              />
            )}
            {sources.length === 0 && (
              <p>No matching source records. Do not submit a defense without evidence.</p>
            )}
            {sources.map((source) => (
              <article
                className={`source-record ${focusedSource === source.id ? 'source-focused' : ''}`}
                key={source.id}
              >
                <div className="source-title">
                  <FileText size={16} />
                  <h4>{source.title}</h4>
                </div>
                <div className="source-meta">
                  <span>{source.id}</span>
                  <span>{source.type}</span>
                  <span>{source.order_id}</span>
                </div>
                <p className="source-text">{source.text}</p>
                <dl>
                  <dt>Occurred</dt>
                  <dd>{source.occurred_at || 'Not recorded'}</dd>
                  <dt>SHA-256</dt>
                  <dd className="hash">{source.sha256}</dd>
                  {source.original_sha256 && (
                    <>
                      <dt>Original pasted text SHA-256</dt>
                      <dd className="hash">{source.original_sha256}</dd>
                    </>
                  )}
                </dl>
              </article>
            ))}
            {detail.sources.length > sources.length && (
              <p className="micro">
                {detail.sources.length - sources.length} unrelated record(s) excluded from this
                order.
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}
