import React, { useEffect, useState } from 'react';
import { RefreshCw, ListChecks, Search } from 'lucide-react';
import './audit.css';

export function AuditEntries({ entries }) {
  if (!entries.length)
    return (
      <div className="audit-empty">
        <ListChecks size={25} strokeWidth={1.5} />
        <h3>No recorded events yet.</h3>
        <p>Analyze a case to begin its evidence and approval trail.</p>
      </div>
    );
  return (
    <ol className="audit-entries">
      {entries.map((entry) => (
        <li key={entry.id}>
          <div className="audit-marker" />
          <div className="audit-event">
            <div className="audit-event-title">
              <h3>{entry.action.replaceAll('_', ' ')}</h3>
              <time dateTime={entry.at}>
                {new Intl.DateTimeFormat('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short',
                }).format(new Date(entry.at))}
              </time>
            </div>
            <p>{typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail)}</p>
            <div className="audit-meta">
              <span>{entry.id}</span>
              {entry.case_id && <span>{entry.case_id}</span>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
export default function Audit({ api }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  async function load() {
    setLoading(true);
    setError('');
    try {
      setEntries(await api('/audit'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  const filtered = entries.filter((entry) =>
    `${entry.id} ${entry.case_id || ''} ${entry.action} ${typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail)}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section className="audit-sheet">
      <div className="audit-header">
        <div>
          <p className="eyebrow">BACKEND EVENT RECORD</p>
          <h2>Every action leaves a trace.</h2>
          <p>Local audit records are not a PayPal receipt or a tamper-proof ledger.</p>
        </div>
        <button
          className="secondary"
          onClick={load}
          disabled={loading}
          aria-label="Refresh audit log"
        >
          <RefreshCw size={15} />
          Refresh log
        </button>
      </div>
      <div className="audit-toolbar">
        <label className="search-field">
          <Search size={16} />
          <input
            aria-label="Search audit events"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search action, case or event…"
          />
        </label>
        <span className="mono">{filtered.length} events</span>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="audit-loading" role="status">
          Loading recorded events…
        </p>
      ) : (
        <AuditEntries entries={filtered} />
      )}
    </section>
  );
}
