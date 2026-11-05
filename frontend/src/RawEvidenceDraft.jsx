import React, { useId, useState } from 'react';
import { validateImport } from './importValidation';

export default function RawEvidenceDraft({ orderId, text, onAdd, disabled, rawDraftIndices }) {
  const id = useId();
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [target, setTarget] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const record = { type, title, text: body, occurred_at: timestamp, order_id: target };
  const change = (setter) => (event) => {
    setter(event.target.value);
    setPreview(false);
    setErrors([]);
  };
  function rawOffset(position) {
    let raw = 0;
    for (let displayed = 0; displayed < position && raw < body.length; displayed++, raw++) {
      if (body[raw] === '\r' && body[raw + 1] === '\n') raw++;
    }
    return raw;
  }
  function editBody(event) {
    const previous = body.replace(/\r\n|\r/g, '\n');
    const next = event.target.value;
    let start = 0;
    while (start < previous.length && start < next.length && previous[start] === next[start])
      start++;
    let end = 0;
    while (
      end < previous.length - start &&
      end < next.length - start &&
      previous[previous.length - 1 - end] === next[next.length - 1 - end]
    )
      end++;
    setBody(
      body.slice(0, rawOffset(start)) +
        next.slice(start, next.length - end) +
        body.slice(rawOffset(previous.length - end)),
    );
    setPreview(false);
    setErrors([]);
  }
  function pasteBody(event) {
    event.preventDefault();
    const start = rawOffset(event.currentTarget.selectionStart);
    const end = rawOffset(event.currentTarget.selectionEnd);
    setBody(body.slice(0, start) + event.clipboardData.getData('text/plain') + body.slice(end));
    setPreview(false);
    setErrors([]);
  }
  function check() {
    let batch;
    try {
      batch = text.trim() ? JSON.parse(text) : [];
    } catch {
      setErrors(['Fix the existing JSON batch before adding a draft.']);
      return;
    }
    if (!Array.isArray(batch)) {
      setErrors(['The existing batch must be a JSON array.']);
      return;
    }
    const validation = validateImport(
      JSON.stringify([...batch, record]),
      'Draft reviewer',
      orderId,
      { rawDraftIndices: [...rawDraftIndices, batch.length] },
    );
    const issues = validation.errors;
    if (issues.length) {
      setErrors(issues);
      return;
    }
    setErrors([]);
    setPreview(text);
  }
  function add() {
    const batch = text.trim() ? JSON.parse(text) : [];
    onAdd(JSON.stringify([...batch, record], null, 2), batch.length);
    setType('');
    setTitle('');
    setTimestamp('');
    setTarget('');
    setBody('');
    setPreview(false);
  }
  let count = 0;
  try {
    const batch = JSON.parse(text);
    if (Array.isArray(batch)) count = batch.length;
  } catch {
    /* Invalid JSON is handled on preview. */
  }
  return (
    <fieldset disabled={disabled} className="raw-draft">
      <legend>Raw paste record builder</legend>
      <p>
        Paste synthetic evidence unchanged. Choose the metadata and confirm the target order
        yourself; no buyer, tracking, or authenticity is inferred. Arbitrary prose is retained;
        deterministic analysis may require human interpretation and may be blocked by exact-field
        policy.
      </p>
      <p>
        {count} {count === 1 ? 'record' : 'records'} in batch
      </p>
      <label className="form-label" htmlFor={`${id}-type`}>
        Record type
      </label>
      <select id={`${id}-type`} className="text-input" value={type} onChange={change(setType)}>
        <option value="">Select type</option>
        <option value="order">Order</option>
        <option value="carrier">Carrier</option>
        <option value="buyer_message">Buyer message</option>
      </select>
      <label className="form-label">
        Record title
        <input className="text-input" value={title} onChange={change(setTitle)} />
      </label>
      <label className="form-label">
        Record timestamp
        <input
          className="text-input"
          value={timestamp}
          onChange={change(setTimestamp)}
          placeholder="2025-01-01T12:00:00Z"
        />
      </label>
      <label className="form-label">
        Confirm target order
        <input
          className="text-input"
          value={target}
          onChange={change(setTarget)}
          placeholder={orderId}
        />
      </label>
      <label className="form-label">
        Pasted evidence
        <textarea
          className="text-input import-json"
          value={body}
          onChange={editBody}
          onPaste={pasteBody}
        />
      </label>
      {errors.length > 0 && (
        <div className="inline-error" role="alert">
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="secondary wide" onClick={check}>
        Preview draft
      </button>
      {preview !== null && preview !== false && preview === text && (
        <>
          <div data-testid="raw-draft-preview">
            <p>
              Type: {type} · Title: {title} · Timestamp: {timestamp} · Target order: {target}
            </p>
            <pre>{body}</pre>
          </div>
          <button type="button" className="secondary wide" onClick={add}>
            Add to batch
          </button>
        </>
      )}
    </fieldset>
  );
}
