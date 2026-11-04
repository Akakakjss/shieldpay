import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community';
import {
  ShieldCheck,
  Layers3,
  ListChecks,
  SlidersHorizontal,
  ArrowUpRight,
  RefreshCw,
  Search,
  ChevronRight,
  FileText,
  ScanLine,
  LockKeyhole,
  CircleHelp,
} from 'lucide-react';
import './styles.css';
import CaseReview from './CaseReview';
import Settings from './Settings';
import Audit from './Audit';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';

ModuleRegistry.registerModules([AllCommunityModule]);
const gridTheme = themeQuartz.withParams({
  backgroundColor: '#fcfbf7',
  foregroundColor: '#233733',
  borderColor: '#e0e1d8',
  accentColor: '#08796e',
  fontFamily: 'DM Sans, Segoe UI, sans-serif',
  fontSize: 13,
  headerBackgroundColor: '#f4f3ed',
  headerTextColor: '#65716c',
  headerFontSize: 11,
  rowHoverColor: '#f0f4ee',
  selectedRowBackgroundColor: '#e6f1eb',
  cellHorizontalPadding: 18,
  wrapperBorder: false,
  borderRadius: 0,
  rowBorder: { color: '#e7e7de' },
});
const money = (value, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
const date = (value) =>
  value
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
        new Date(value),
      )
    : 'Not provided';
const riskLabel = { ready: 'Ready to review', review: 'Needs review', blocked: 'Evidence blocked' };
const reasonLabel = (value) =>
  ({
    MERCHANDISE_OR_SERVICE_NOT_RECEIVED: 'Item not received',
    MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: 'Item not as described',
  })[value] || value;
const providerLabel = (value) =>
  value === 'local-onnx'
    ? 'Local ONNX retrieval'
    : value === 'lexical-baseline'
      ? 'Lexical baseline'
      : value || 'Unavailable';
async function request(path, options = {}, token = '') {
  const { responseType, ...init } = options;
  const response = await fetch('/api' + path, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'X-Admin-Token': token } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const detail =
      typeof error.detail === 'string'
        ? error.detail
        : Array.isArray(error.detail)
          ? error.detail
              .map(
                (item) =>
                  `${Array.isArray(item.loc) ? item.loc.join('.') : 'Input'}: ${typeof item.msg === 'string' ? item.msg : 'Invalid value'}`,
              )
              .join('; ')
          : '';
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return responseType === 'blob' ? response.blob() : response.json();
}
function Risk({ value }) {
  return (
    <span className={`risk risk-${value}`}>
      <i />
      {riskLabel[value] || value}
    </span>
  );
}

export default function App() {
  const [health, setHealth] = useState(null);
  const [cases, setCases] = useState([]);
  const [selected, setSelected] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('queue');
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [adminToken, setAdminToken] = useState('');
  const [revision, setRevision] = useState(0);
  const sessionEpoch = useRef(0);
  const grid = useRef(null);
  function syncSelection(api) {
    api.forEachNode((node) => {
      const shouldSelect = node.id === selected;
      if (node.isSelected() !== shouldSelect) node.setSelected(shouldSelect);
    });
  }
  useEffect(() => {
    if (grid.current && !grid.current.isDestroyed()) syncSelection(grid.current);
  }, [selected]);
  async function api(path, options = {}) {
    const epoch = sessionEpoch.current;
    const result = await request(path, options, health?.mode === 'sandbox' ? adminToken : '');
    if (epoch !== sessionEpoch.current)
      throw new Error('Session changed; stale response discarded.');
    return result;
  }
  async function refreshCase(id) {
    const epoch = sessionEpoch.current;
    const [record, rows, h] = await Promise.all([
      api(`/cases/${encodeURIComponent(id)}`),
      api('/cases'),
      request('/health'),
    ]);
    if (epoch !== sessionEpoch.current)
      throw new Error('Session changed; stale response discarded.');
    setDetail((current) => (current?.id === id ? record : current));
    setCases(rows);
    setHealth(h);
  }
  async function load(options = {}) {
    const epoch = sessionEpoch.current;
    setLoading(true);
    setError('');
    try {
      const h = await request('/health');
      if (epoch !== sessionEpoch.current)
        throw new Error('Session changed; stale response discarded.');
      setHealth(h);
      const rows = await request('/cases', {}, h.mode === 'sandbox' ? adminToken : '');
      if (epoch !== sessionEpoch.current)
        throw new Error('Session changed; stale response discarded.');
      setCases(rows);
      setSelected((current) => (rows.some((c) => c.id === current) ? current : rows[0]?.id || ''));
      setRevision((value) => value + 1);
    } catch (e) {
      if (epoch === sessionEpoch.current) setError(e.message);
      if (options.throwOnError) throw e;
    } finally {
      if (epoch === sessionEpoch.current) setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    let active = true;
    setDetail(null);
    api(`/cases/${encodeURIComponent(selected)}`)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [selected, revision]);
  const exposure = useMemo(
    () =>
      Object.entries(
        cases.reduce(
          (totals, c) => ({ ...totals, [c.currency]: (totals[c.currency] || 0) + c.amount }),
          {},
        ),
      ),
    [cases],
  );
  const columns = useMemo(
    () => [
      {
        field: 'buyer',
        headerName: 'CASE / CUSTOMER',
        flex: 1.45,
        minWidth: 180,
        cellRenderer: (p) => (
          <button
            className="case-cell"
            onClick={() => setSelected(p.data.id)}
            aria-label={`Open ${p.value} ${p.data.id}`}
          >
            <strong>{p.value}</strong> <span>{p.data.id}</span>
          </button>
        ),
      },
      {
        field: 'amount',
        headerName: 'EXPOSURE',
        width: 115,
        valueFormatter: (p) => money(p.value, p.data.currency),
        cellClass: 'amount-cell',
      },
      {
        field: 'risk',
        headerName: 'EVIDENCE',
        flex: 1.2,
        minWidth: 165,
        cellRenderer: (p) => <Risk value={p.value} />,
      },
      {
        field: 'response_due',
        headerName: 'RESPOND BY',
        width: 115,
        valueFormatter: (p) => date(p.value).replace(/, \d{4}$/, ''),
      },
    ],
    [],
  );
  const filtered = cases.filter(
    (c) =>
      (riskFilter === 'all' || c.risk === riskFilter) &&
      `${c.id} ${c.buyer} ${c.order_id} ${c.reason}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to workspace
      </a>
      <nav className="rail" aria-label="Main navigation">
        <a className="brand-mark" href="#main" aria-label="ShieldPay home">
          <ShieldCheck size={27} strokeWidth={1.6} />
        </a>
        <div className="rail-links">
          {[
            ['queue', Layers3, 'Queue'],
            ['audit', ListChecks, 'Audit trail'],
            ['settings', SlidersHorizontal, 'Settings'],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              className={view === key ? 'active' : ''}
              aria-current={view === key ? 'page' : undefined}
              onClick={() => setView(key)}
              title={label}
            >
              <Icon size={20} strokeWidth={1.6} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="rail-bottom">
          <span className="operator-avatar" aria-label="Local operator">
            OP
          </span>
          <span>Operator</span>
        </div>
      </nav>
      <div className="workspace">
        <header className="topbar">
          <a href="#main" className="wordmark">
            shieldpay<span> / </span>
            <small>DISPUTE OPERATIONS</small>
          </a>
          <div className="top-status">
            <span className={`status-dot ${health ? 'online' : ''}`} />
            {health ? 'Local workspace' : 'Connecting…'}
            <span className="top-divider" /> <span className="mono">HUMAN IN THE LOOP</span>
          </div>
        </header>
        <div
          role="region"
          aria-label="Environment and provider"
          className={`environment-strip ${health?.mode === 'sandbox' ? 'sandbox' : ''}`}
        >
          <span>
            <span className="mode-tag">
              {health?.mode === 'demo'
                ? 'Synthetic demo'
                : health?.mode === 'sandbox'
                  ? 'PayPal sandbox'
                  : 'Status unconfirmed'}
            </span>
            <span>
              {health?.mode === 'demo'
                ? 'Sample disputes only. Submissions are simulated; no PayPal writes.'
                : health?.mode === 'sandbox'
                  ? 'Sandbox only. Approved actions may write to PayPal sandbox.'
                  : 'No action is available until the backend is reachable.'}
            </span>
          </span>
          <span className="provider-tag">
            <ScanLine size={14} />
            {providerLabel(health?.ai?.provider)}
          </span>
        </div>
        <main id="main" tabIndex={-1}>
          {error && (
            <div className="error-banner" role="alert">
              <strong>Could not complete the request.</strong> {error}
              <button onClick={load}>Retry connection</button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                WORKSPACE / {view === 'queue' ? 'DISPUTES' : view.toUpperCase()}
              </p>
              <h1>
                {view === 'queue'
                  ? 'Dispute queue'
                  : view === 'audit'
                    ? 'Audit trail'
                    : 'Workspace settings'}
              </h1>
              <p>
                {view === 'queue'
                  ? 'Build a defensible response. Keep a human in charge.'
                  : view === 'audit'
                    ? 'A record of decisions, evidence and approval.'
                    : 'Connection readiness and explicit environment boundaries.'}
              </p>
            </div>
            <button className="secondary" onClick={load} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'spinning' : ''} />
              Refresh
            </button>
          </div>
          {view === 'queue' && (
            <>
              <section className="summary-strip" aria-label="Queue summary">
                <div>
                  <span>DISPUTED EXPOSURE</span>
                  <strong>
                    {exposure.length
                      ? exposure.map(([currency, amount]) => (
                          <span key={currency}>{money(amount, currency)}</span>
                        ))
                      : '—'}
                  </strong>
                  <small>
                    Across {cases.length} loaded {cases.length === 1 ? 'case' : 'cases'} · not
                    recovered funds
                  </small>
                </div>
                <div>
                  <span>READY TO REVIEW</span>
                  <strong>
                    {cases.filter((c) => c.risk === 'ready').length}
                    <small> / {cases.length}</small>
                  </strong>
                  <small>Evidence still requires approval</small>
                </div>
                <div>
                  <span>EVIDENCE BLOCKED</span>
                  <strong>{cases.filter((c) => c.risk === 'blocked').length}</strong>
                  <small>No submission without sufficient proof</small>
                </div>
                <div className="policy-note">
                  <LockKeyhole size={20} strokeWidth={1.4} />
                  <p>
                    Evidence first.
                    <br />
                    <strong>Nothing sent automatically.</strong>
                  </p>
                </div>
              </section>
              <div className="workbench">
                <section className="queue-panel" aria-label="Dispute queue">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        All disputes <span className="count-badge">{cases.length}</span>
                      </h2>
                      <p>Select a case to inspect its evidence.</p>
                    </div>
                    <span className="mono small">01 / QUEUE</span>
                  </div>
                  <div className="queue-tools">
                    <label className="search-field">
                      <Search size={16} />
                      <input
                        aria-label="Search cases"
                        placeholder="Search case, customer or order…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filter evidence status"
                      value={riskFilter}
                      onChange={(e) => setRiskFilter(e.target.value)}
                    >
                      <option value="all">All evidence</option>
                      <option value="ready">Ready to review</option>
                      <option value="review">Needs review</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                  <div className="case-grid">
                    <AgGridReact
                      theme={gridTheme}
                      onGridReady={(e) => {
                        grid.current = e.api;
                        syncSelection(e.api);
                      }}
                      onRowDataUpdated={(e) => syncSelection(e.api)}
                      onSelectionChanged={(e) => {
                        const row = e.api.getSelectedRows()[0];
                        if (row) setSelected(row.id);
                      }}
                      rowData={filtered}
                      columnDefs={columns}
                      defaultColDef={{ sortable: true, resizable: true }}
                      getRowId={(p) => p.data.id}
                      rowHeight={82}
                      headerHeight={40}
                      loading={loading}
                      rowSelection={{
                        mode: 'singleRow',
                        checkboxes: false,
                        enableClickSelection: true,
                      }}
                      onRowClicked={(e) => setSelected(e.data.id)}
                      getRowClass={(p) => (p.data.id === selected ? 'selected-case' : '')}
                      context={{ selected }}
                      overlayNoRowsTemplate="<span>No matching disputes. Clear your filters or refresh the queue.</span>"
                    />
                  </div>
                  <div className="queue-footer">
                    <span>
                      {filtered.length} of {cases.length} cases
                    </span>
                    <span>
                      AG Grid Community <ArrowUpRight size={12} />
                    </span>
                  </div>
                  <div className="queue-note">
                    <CircleHelp size={17} />
                    <p>
                      <strong>A response is not a resolution.</strong> Evidence readiness is not a
                      win prediction, a guarantee of fund release, or legal advice.
                    </p>
                  </div>
                </section>
                <aside className="inspector" aria-label="Case inspector">
                  {!selected && !loading ? (
                    <div className="empty-state">
                      <FileText size={32} />
                      <h2>No disputes to review</h2>
                      <p>Refresh the queue or use settings to reset the synthetic demo.</p>
                    </div>
                  ) : !detail ? (
                    <div className="empty-state" role="status">
                      <ScanLine size={28} />
                      <p>Loading case evidence…</p>
                    </div>
                  ) : (
                    <>
                      <div className="inspector-topline">
                        <span className="mono">02 / CASE INSPECTOR</span>
                        <Risk value={detail.risk} />
                      </div>
                      <div className="case-heading">
                        <p className="mono">
                          {detail.id} <ChevronRight size={12} /> {detail.order_id}
                        </p>
                        <h2>{detail.buyer}</h2>
                        <div>
                          <span title={detail.reason}>{reasonLabel(detail.reason)}</span>
                          <strong>{money(detail.amount, detail.currency)}</strong>
                        </div>
                      </div>
                      <div className="case-facts">
                        <div>
                          <span>RESPOND BY</span>
                          <strong>{date(detail.response_due)}</strong>
                        </div>
                        <div>
                          <span>SOURCE RECORDS</span>
                          <strong>{detail.evidence_count} attached</strong>
                        </div>
                        <div>
                          <span>CASE STATUS</span>
                          <strong>{detail.status.replaceAll('_', ' ')}</strong>
                        </div>
                      </div>
                      <CaseReview
                        key={detail.id}
                        detail={detail}
                        health={health}
                        api={api}
                        onChange={refreshCase}
                      />
                      <div className="inspector-bottom">
                        <ShieldCheck size={15} />
                        <span>Scoped sources. Explicit approval. No automatic defense.</span>
                      </div>
                    </>
                  )}
                </aside>
              </div>
            </>
          )}
          {view === 'settings' && (
            <Settings
              health={health}
              api={api}
              token={adminToken}
              setToken={(value) => {
                sessionEpoch.current += 1;
                setAdminToken(value);
                if (!value && health?.mode === 'sandbox') {
                  setCases([]);
                  setDetail(null);
                  setSelected('');
                  setLoading(false);
                }
              }}
              refresh={load}
            />
          )}
          {view === 'audit' && <Audit api={api} />}
        </main>
        <footer className="workspace-footer">
          <span>
            SHIELDPAY <span className="footer-slash">/</span> EVIDENCE BEFORE ACTION
          </span>
          <span>PayPal integration · sandbox only</span>
        </footer>
      </div>
    </div>
  );
}
