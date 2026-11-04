import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

const cases = [
  {
    id: 'DEMO-101',
    order_id: 'ORD-101',
    buyer: 'Alex Morgan',
    reason: 'Item not received',
    amount: 248,
    currency: 'USD',
    status: 'open',
    response_due: '2027-02-10T18:00:00Z',
    evidence_count: 3,
    risk: 'ready',
    summary: 'Delivery confirmation available.',
  },
  {
    id: 'DEMO-102',
    order_id: 'ORD-102',
    buyer: 'Sam Rivera',
    reason: 'Item not received',
    amount: 92,
    currency: 'USD',
    status: 'open',
    response_due: '2027-02-11T18:00:00Z',
    evidence_count: 1,
    risk: 'blocked',
    summary: 'Shipment is still in transit.',
  },
];
const source = {
  id: 'SRC-1',
  type: 'delivery',
  title: 'Carrier delivery record',
  text: 'Delivered to the address on order ORD-101.',
  occurred_at: '2027-02-01T12:00:00Z',
  sha256: 'a'.repeat(64),
  order_id: 'ORD-101',
};
const analysis = {
  id: 'AN-1',
  provider: 'lexical-baseline',
  generated_at: '2027-02-03T12:00:00Z',
  recommendation: 'defend',
  summary: 'Matched delivery evidence supports a response.',
  claims: [
    { text: 'Delivery address matches the order.', source_ids: ['SRC-1'], quote: source.text },
  ],
  gaps: [],
  contradictions: [],
  readiness: 100,
  can_submit: true,
  packet_hash: 'b'.repeat(64),
  next_action: 'Review the packet and approve.',
};
let saved;
let requests;
let health;
let handler;
function reply(data, status = 200) {
  return {
    ok: status < 400,
    status,
    json: async () => data,
    blob: async () => new Blob(['%PDF-1.4 synthetic'], { type: 'application/pdf' }),
  };
}
beforeEach(() => {
  saved = {};
  requests = [];
  health = {
    status: 'ok',
    mode: 'demo',
    ai: {
      provider: 'lexical-baseline',
      ready: true,
      detail: 'Deterministic lexical fallback; not a generative LLM.',
    },
    paypal: { configured: false, environment: 'sandbox' },
  };
  handler = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path, options = {}) => {
      requests.push({ path, ...options });
      const custom = handler && handler(path, options);
      if (custom) return custom;
      if (path === '/api/health') return reply(health);
      if (path === '/api/cases') return reply(cases);
      const row = cases.find((c) => path === `/api/cases/${c.id}`);
      if (row)
        return reply({
          ...row,
          sources: row.id === 'DEMO-101' ? [source] : [],
          analysis: saved[row.id] || null,
          audit: [],
        });
      if (path.endsWith('/analyze')) {
        const id = path.split('/')[3];
        saved[id] = analysis;
        return reply(analysis);
      }
      if (path.endsWith('/packet.pdf')) return reply({});
      if (path.endsWith('/approve'))
        return reply({
          approval_id: 'APP-1',
          packet_hash: analysis.packet_hash,
          status: 'approved',
        });
      if (path.endsWith('/submit'))
        return reply({
          status: 'simulated',
          receipt: 'SIM-1',
          verified: false,
          detail: 'No request was sent to PayPal.',
        });
      if (path === '/api/audit')
        return reply([
          {
            id: 'AUD-1',
            at: '2027-02-03T12:00:00Z',
            action: 'analysis_completed',
            detail: 'Analysis generated for DEMO-101',
          },
        ]);
      if (path === '/api/paypal/status')
        return reply({
          configured: false,
          environment: 'sandbox',
          detail: 'Sandbox credentials are not configured.',
        });
      return reply({ detail: 'Unexpected request: ' + path }, 404);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('operator console', () => {
  it('does not restore protected records when a pending unlock resolves after token clearing', async () => {
    const user = userEvent.setup();
    health = { ...health, mode: 'sandbox' };
    let delay = false;
    let releaseCases;
    handler = (path) =>
      path === '/api/cases' && delay
        ? new Promise((resolve) => {
            releaseCases = resolve;
          })
        : null;
    render(<App />);
    await screen.findByRole('heading', { name: 'Alex Morgan' });
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.type(await screen.findByLabelText('Session admin token'), 'test-only-admin');
    delay = true;
    await user.click(screen.getByRole('button', { name: 'Unlock sandbox records' }));
    await waitFor(() => expect(releaseCases).toBeTypeOf('function'));
    await user.click(screen.getByRole('button', { name: 'Clear session token' }));
    await act(async () => {
      releaseCases(reply(cases));
    });
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    expect(
      screen.queryByRole('button', { name: 'Open Alex Morgan DEMO-101' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Alex Morgan' })).not.toBeInTheDocument();
  });
  it('unlocks protected sandbox reads with a memory-only token and clears records on lock', async () => {
    const user = userEvent.setup();
    health = { ...health, mode: 'sandbox' };
    handler = (path, options) => {
      if (
        (path === '/api/cases' || path.startsWith('/api/cases/') || path === '/api/audit') &&
        options.headers?.['X-Admin-Token'] !== 'test-only-admin'
      ) {
        return reply({ detail: 'A valid X-Admin-Token is required for sandbox records' }, 401);
      }
      return null;
    };
    render(<App />);
    await screen.findByText(/A valid X-Admin-Token is required for sandbox records/);
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.type(await screen.findByLabelText('Session admin token'), 'test-only-admin');
    await user.click(screen.getByRole('button', { name: 'Unlock sandbox records' }));
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    await screen.findByRole('heading', { name: 'Alex Morgan' });
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(await screen.findByRole('button', { name: 'Clear session token' }));
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    expect(screen.queryByRole('heading', { name: 'Alex Morgan' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open Alex Morgan DEMO-101' }),
    ).not.toBeInTheDocument();
  });
  it('uses session authentication for import and renders structured server validation without echoing raw input', async () => {
    const user = userEvent.setup();
    health = { ...health, mode: 'sandbox' };
    handler = (path) =>
      path.endsWith('/sources/import')
        ? reply(
            {
              detail: [
                {
                  loc: ['body', 'sources', 0, 'occurred_at'],
                  msg: 'Timestamp rejected by server',
                  input: 'DO-NOT-ECHO-RAW-INPUT',
                },
              ],
            },
            422,
          )
        : null;
    render(<App />);
    await screen.findByRole('heading', { name: 'Alex Morgan' });
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.type(await screen.findByLabelText('Session admin token'), 'test-only-admin');
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    await user.click(await screen.findByRole('tab', { name: 'Evidence (1)' }));
    await user.click(screen.getByText('Import sandbox evidence'));
    fireEvent.change(screen.getByLabelText('Source records JSON'), {
      target: {
        value: JSON.stringify([
          {
            type: 'order',
            title: 'Synthetic order',
            text: 'Order: ORD-101\nTracking: TEST-101',
            order_id: 'ORD-101',
            occurred_at: '2025-01-01T12:00:00Z',
          },
        ]),
      },
    });
    await user.type(screen.getByLabelText('Reviewed by'), 'Test Ops');
    await user.click(screen.getByRole('checkbox', { name: /I acknowledge/i }));
    await user.click(screen.getByRole('button', { name: 'Review replacement' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm replacement' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'body.sources.0.occurred_at: Timestamp rejected by server',
    );
    expect(screen.queryByText(/DO-NOT-ECHO-RAW-INPUT/)).not.toBeInTheDocument();
    expect(requests.find((r) => r.path.endsWith('/sources/import')).headers['X-Admin-Token']).toBe(
      'test-only-admin',
    );
    expect(requests.filter((r) => !r.method).every((r) => !r.headers['X-Admin-Token'])).toBe(true);
  });
  it('does not claim a successful sandbox sync when the case readback fails', async () => {
    const user = userEvent.setup();
    let failReadback = false;
    health = { ...health, mode: 'sandbox', paypal: { configured: true, environment: 'sandbox' } };
    handler = (path) => {
      if (path === '/api/cases')
        return failReadback ? reply({ detail: 'Case readback unavailable.' }, 503) : reply([]);
      if (path === '/api/paypal/status')
        return reply({
          configured: true,
          admin_configured: true,
          network_tested: false,
          detail: 'Configured, not verified.',
        });
      if (path === '/api/paypal/sync') {
        failReadback = true;
        return reply({ imported: 1, detail: 'Sandbox sync completed.' });
      }
    };
    render(<App />);
    await screen.findByText('No disputes to review');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.type(await screen.findByLabelText('Session admin token'), 'test-only-token');
    await user.click(screen.getByRole('button', { name: 'Sync sandbox disputes' }));
    await screen.findAllByText(/Case readback unavailable/);
    expect(screen.queryByText('Sandbox sync completed.')).not.toBeInTheDocument();
  });
  it('keeps AG Grid accessible selection synchronized with the inspected case', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Alex Morgan' });
    const alex = screen
      .getByRole('button', { name: 'Open Alex Morgan DEMO-101' })
      .closest('[role="row"]');
    expect(alex).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: 'Open Sam Rivera DEMO-102' }));
    await screen.findByRole('heading', { name: 'Sam Rivera' });
    expect(
      screen.getByRole('button', { name: 'Open Sam Rivera DEMO-102' }).closest('[role="row"]'),
    ).toHaveAttribute('aria-selected', 'true');
    expect(alex).toHaveAttribute('aria-selected', 'false');
  });
  it('supports keyboard navigation to the selected case audit records', async () => {
    const user = userEvent.setup();
    handler = (path) =>
      path === '/api/cases/DEMO-101'
        ? reply({
            ...cases[0],
            sources: [source],
            analysis: null,
            audit: [
              {
                id: 'CASE-AUD-1',
                at: '2027-02-03T12:00:00Z',
                action: 'demo_seeded',
                detail: 'Synthetic case seeded.',
              },
            ],
          })
        : null;
    render(<App />);
    const review = await screen.findByRole('tab', { name: 'Review' });
    review.focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Case audit (1)' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Case audit (1)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByText('Synthetic case seeded.')).toBeInTheDocument();
    expect(screen.getByText('CASE-AUD-1')).toBeInTheDocument();
  });
  it('uses the session admin header for sandbox case mutations and protected readback', async () => {
    const user = userEvent.setup();
    health = { ...health, mode: 'sandbox', paypal: { configured: true, environment: 'sandbox' } };
    const row = { ...cases[0], id: 'PP-101' };
    let analyzed = null;
    handler = (path, options) =>
      path === '/api/cases'
        ? reply([row])
        : path === '/api/cases/PP-101'
          ? reply({ ...row, sources: [source], analysis: analyzed, audit: [] })
          : path === '/api/cases/PP-101/analyze'
            ? ((analyzed = analysis), reply(analysis))
            : null;
    render(<App />);
    await screen.findByRole('heading', { name: 'Alex Morgan' });
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.type(await screen.findByLabelText('Session admin token'), 'test-only-admin');
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    await user.click(await screen.findByRole('button', { name: 'Analyze evidence' }));
    await screen.findByText('Matched delivery evidence supports a response.');
    expect(
      requests.find((r) => r.path === '/api/cases/PP-101/analyze').headers['X-Admin-Token'],
    ).toBe('test-only-admin');
    expect(
      requests.filter((r) => r.path === '/api/cases/PP-101').at(-1).headers['X-Admin-Token'],
    ).toBe('test-only-admin');
  });
  it('syncs only a configured sandbox using a memory-only admin token and re-reads cases', async () => {
    const user = userEvent.setup();
    health = { ...health, mode: 'sandbox', paypal: { configured: true, environment: 'sandbox' } };
    handler = (path) =>
      path === '/api/paypal/status'
        ? reply({
            configured: true,
            environment: 'sandbox',
            admin_configured: true,
            network_tested: false,
            detail: 'Configured, not verified.',
          })
        : path === '/api/paypal/sync'
          ? reply({ imported: 0, detail: 'No eligible sandbox disputes were returned.' })
          : path === '/api/cases'
            ? reply([])
            : null;
    const store = vi.spyOn(Storage.prototype, 'setItem');
    render(<App />);
    await screen.findByText('No disputes to review');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const sync = await screen.findByRole('button', { name: 'Sync sandbox disputes' });
    expect(sync).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset synthetic demo' })).toBeDisabled();
    await user.type(screen.getByLabelText('Session admin token'), 'test-only-token');
    expect(sync).toBeEnabled();
    await user.click(sync);
    expect(
      await screen.findByText('No eligible sandbox disputes were returned.'),
    ).toBeInTheDocument();
    expect(requests.find((r) => r.path === '/api/paypal/sync').headers['X-Admin-Token']).toBe(
      'test-only-token',
    );
    expect(requests.filter((r) => r.path === '/api/cases').length).toBeGreaterThan(1);
    expect(store).not.toHaveBeenCalled();
    store.mockRestore();
    await user.click(screen.getByRole('button', { name: 'Clear session token' }));
    expect(screen.getByLabelText('Session admin token')).toHaveValue('');
    expect(sync).toBeDisabled();
  });
  it('loads the audit log from the backend and refreshes its event readback', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Alex Morgan' });
    await user.click(screen.getByRole('button', { name: 'Audit trail' }));
    expect(await screen.findByText('Analysis generated for DEMO-101')).toBeInTheDocument();
    expect(screen.getByText('analysis completed')).toBeInTheDocument();
    expect(screen.getByText('AUD-1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh audit log' }));
    await waitFor(() =>
      expect(requests.filter((r) => r.path === '/api/audit').length).toBeGreaterThan(1),
    );
  });
  it('resets synthetic data only after confirmation and re-fetches the selected case', async () => {
    const user = userEvent.setup();
    handler = (path) => {
      if (path === '/api/demo/reset') {
        saved = {};
        return reply({ ok: true });
      }
    };
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Analyze evidence' }));
    await screen.findByText('Matched delivery evidence supports a response.');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(await screen.findByRole('button', { name: 'Reset synthetic demo' }));
    expect(requests.some((r) => r.path === '/api/demo/reset')).toBe(false);
    await user.click(
      within(screen.getByRole('dialog', { name: 'Reset this synthetic workspace?' })).getByRole(
        'button',
        { name: 'Confirm reset' },
      ),
    );
    expect(await screen.findByText('Synthetic workspace reset.')).toBeInTheDocument();
    expect(requests.find((r) => r.path === '/api/demo/reset').method).toBe('POST');
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    expect(await screen.findByRole('button', { name: 'Analyze evidence' })).toBeInTheDocument();
    expect(
      screen.queryByText('Matched delivery evidence supports a response.'),
    ).not.toBeInTheDocument();
  });
  it('shows fetched sandbox credential readiness without implying a live connection', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { name: 'Alex Morgan' });
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByText('Sandbox credentials are not configured.')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Retrieval, not a generative LLM' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync sandbox disputes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset synthetic demo' })).toBeEnabled();
    expect(requests.some((r) => r.path === '/api/paypal/status')).toBe(true);
  });
  it('opens a blocked case and exposes the missing proof and contradiction without enabling submission', async () => {
    const user = userEvent.setup();
    handler = (path) => {
      if (path === '/api/cases/DEMO-102/analyze') {
        saved['DEMO-102'] = {
          ...analysis,
          id: 'AN-2',
          recommendation: 'request_information',
          can_submit: false,
          readiness: 20,
          claims: [],
          gaps: ['Proof of delivery is missing.'],
          contradictions: ['Shipment is in transit, not delivered.'],
          next_action: 'Request a final carrier delivery record.',
        };
        return reply(saved['DEMO-102']);
      }
    };
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Open Sam Rivera DEMO-102' }));
    await screen.findByRole('heading', { name: 'Sam Rivera' });
    await user.click(screen.getByRole('button', { name: 'Analyze evidence' }));
    expect(await screen.findByRole('heading', { name: 'Submission blocked' })).toBeInTheDocument();
    expect(screen.getByText('Proof of delivery is missing.')).toBeInTheDocument();
    expect(screen.getByText('Shipment is in transit, not delivered.')).toBeInTheDocument();
    expect(screen.getByText('Request a final carrier delivery record.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve packet' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Simulate submission' })).toBeDisabled();
    expect(requests.some((r) => r.path.endsWith('/submit'))).toBe(false);
  });
  it('requires a generated PDF and explicit human approval before a confirmed simulated submission', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:packet'), revokeObjectURL: vi.fn() }),
    );
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Analyze evidence' }));
    const approve = await screen.findByRole('button', { name: 'Approve packet' });
    expect(approve).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Simulate submission' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Generate PDF packet' }));
    expect(await screen.findByRole('link', { name: 'Download evidence PDF' })).toHaveAttribute(
      'href',
      'blob:packet',
    );
    expect(requests.some((r) => r.path === '/api/cases/DEMO-101/packet.pdf')).toBe(true);
    await user.type(screen.getByRole('textbox', { name: 'Approved by' }), 'Jamie Ops');
    await user.click(screen.getByRole('checkbox', { name: /I reviewed the PDF/ }));
    await user.click(approve);
    expect(await screen.findByText('Approved locally · not sent to PayPal')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Evidence (1)' }));
    await user.click(screen.getByRole('tab', { name: 'Review' }));
    expect(screen.getByRole('button', { name: 'Simulate submission' })).toBeEnabled();
    expect(JSON.parse(requests.find((r) => r.path.endsWith('/approve')).body)).toEqual({
      packet_hash: analysis.packet_hash,
      approved_by: 'Jamie Ops',
    });
    await user.click(screen.getByRole('button', { name: 'Simulate submission' }));
    expect(requests.some((r) => r.path.endsWith('/submit'))).toBe(false);
    await user.click(
      within(screen.getByRole('dialog', { name: 'Simulate this response?' })).getByRole('button', {
        name: 'Confirm simulation',
      }),
    );
    expect(await screen.findByText('Simulated · not submitted to PayPal')).toBeInTheDocument();
    expect(screen.getByText('SIM-1')).toBeInTheDocument();
    expect(screen.getByText('No request was sent to PayPal.')).toBeInTheDocument();
    expect(JSON.parse(requests.find((r) => r.path.endsWith('/submit')).body)).toEqual({
      approval_id: 'APP-1',
      packet_hash: analysis.packet_hash,
    });
    expect(requests.filter((r) => r.path === '/api/cases/DEMO-101').length).toBeGreaterThanOrEqual(
      4,
    );
  });
  it('analyzes via the backend and opens the exact cited source with its hash', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Analyze evidence' }));
    expect(
      await screen.findByText('Matched delivery evidence supports a response.'),
    ).toBeInTheDocument();
    expect(requests.find((r) => r.path === '/api/cases/DEMO-101/analyze').method).toBe('POST');
    expect(requests.filter((r) => r.path === '/api/cases/DEMO-101').length).toBeGreaterThan(1);
    await user.click(screen.getByRole('button', { name: 'Inspect source SRC-1' }));
    const evidence = screen.getByRole('tabpanel', { name: 'Evidence (1)' });
    expect(within(evidence).getByText(source.text)).toBeInTheDocument();
    expect(within(evidence).getByText(source.sha256)).toBeInTheDocument();
    expect(within(evidence).getByText('ORD-101')).toBeInTheDocument();
  });
  it('loads the actual API queue, derives exposure, identifies provider and opens the selected case', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Dispute queue' })).toBeInTheDocument();
    expect(await screen.findByText('$340.00')).toBeInTheDocument();
    expect(screen.getByText('Synthetic demo')).toBeInTheDocument();
    expect(screen.getByText(/Lexical baseline/)).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Alex Morgan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze evidence' })).toBeEnabled();
    expect(requests.some((r) => r.path === '/api/cases/DEMO-101')).toBe(true);
  });
});
