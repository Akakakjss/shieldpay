import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CaseReview from '../CaseReview';

const detail = {
  id: 'PP-101',
  order_id: 'ORD-101',
  summary: 'Sandbox case',
  sources: [],
  analysis: null,
  audit: [],
};
const health = { mode: 'sandbox', ai: {}, paypal: { configured: true } };
const source = {
  type: 'order',
  title: 'Synthetic order',
  text: 'Order: ORD-101\nTracking: TEST-101',
  occurred_at: '2025-01-01T12:00:00Z',
  order_id: 'ORD-101',
};
async function openImport(props = {}) {
  const api = vi.fn().mockResolvedValue({ case_id: detail.id, imported: 1, verified: false });
  const onChange = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  const view = render(
    <CaseReview detail={detail} health={health} api={api} onChange={onChange} {...props} />,
  );
  await user.click(screen.getByRole('tab', { name: 'Evidence (0)' }));
  await user.click(screen.getByText('Import sandbox evidence'));
  return { user, api, onChange, ...view };
}
function enterSources(sources = [source]) {
  fireEvent.change(screen.getByLabelText('Source records JSON'), {
    target: { value: JSON.stringify(sources) },
  });
}

async function readyReplacement(user) {
  enterSources();
  await user.type(screen.getByLabelText('Reviewed by'), '  Test Ops  ');
  await user.click(screen.getByRole('checkbox', { name: /I acknowledge/i }));
  await user.click(screen.getByRole('button', { name: 'Review replacement' }));
}

afterEach(() => vi.unstubAllGlobals());

describe('sandbox evidence import', () => {
  it.each(['demo', 'production', undefined])('never exposes import in %s mode', async (mode) => {
    const api = vi.fn();
    const user = userEvent.setup();
    render(
      <CaseReview detail={detail} health={{ ...health, mode }} api={api} onChange={vi.fn()} />,
    );
    await user.click(screen.getByRole('tab', { name: 'Evidence (0)' }));
    expect(screen.queryByText('Import sandbox evidence')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Source records JSON')).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
  it('does not claim success after failed readback and retries only the refresh, not the replacement', async () => {
    const onChange = vi
      .fn()
      .mockRejectedValueOnce(new Error('Case readback unavailable.'))
      .mockResolvedValue(undefined);
    const { user, api } = await openImport({ onChange });
    await readyReplacement(user);
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm replacement' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /replacement accepted.*refresh failed/i,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Case readback unavailable.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review replacement' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Review' })).toBeDisabled();
    expect(screen.getByLabelText('Source records JSON')).toBeDisabled();
    expect(screen.getByLabelText('Source records JSON')).toHaveValue(JSON.stringify([source]));
    await user.click(screen.getByRole('button', { name: 'Retry case refresh' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/replaced.*unverified/i);
    expect(api).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Source records JSON')).toHaveValue('');
  });
  it('shows a rejected import without losing the draft or claiming success', async () => {
    const api = vi.fn().mockRejectedValue(new Error('Admin token required (401).'));
    const { user, onChange } = await openImport({ api });
    await readyReplacement(user);
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm replacement' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Admin token required (401).');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Source records JSON')).toHaveValue(JSON.stringify([source]));
    expect(screen.getByLabelText('Reviewed by')).toHaveValue('  Test Ops  ');
    expect(screen.getByRole('checkbox', { name: /I acknowledge/i })).toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });
  it('clears imported form state and invalidates analysis, PDF and approval even before fresh detail arrives', async () => {
    const user = userEvent.setup();
    const revoke = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:old-packet'),
      revokeObjectURL: revoke,
    });
    const analysis = {
      id: 'AN-1',
      packet_hash: 'old-hash',
      recommendation: 'defend',
      summary: 'Old analysis',
      gaps: [],
      contradictions: [],
      readiness: 100,
      can_submit: true,
      claims: [{ text: 'Old finding', quote: source.text, source_ids: ['SRC-OLD'] }],
    };
    const analyzed = {
      ...detail,
      analysis,
      sources: [{ ...source, id: 'SRC-OLD', sha256: 'test-hash' }],
    };
    const api = vi.fn(async (path) =>
      path.endsWith('/packet.pdf')
        ? new Blob(['%PDF-test'])
        : path.endsWith('/approve')
          ? { status: 'approved', packet_hash: 'old-hash', approval_id: 'APP-OLD' }
          : { case_id: detail.id, imported: 1, verified: false },
    );
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(<CaseReview detail={analyzed} health={health} api={api} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Generate PDF packet' }));
    await user.type(screen.getByLabelText('Approved by'), 'Test Ops');
    await user.click(screen.getByRole('checkbox', { name: /I reviewed the PDF/i }));
    await user.click(screen.getByRole('button', { name: 'Approve packet' }));
    await screen.findByText('Approved locally · not sent to PayPal');
    await user.click(screen.getByRole('tab', { name: 'Evidence (1)' }));
    await user.click(screen.getByText('Import sandbox evidence'));
    await readyReplacement(user);
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm replacement' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/1 record.*replaced.*unverified/i);
    expect(screen.getByLabelText('Source records JSON')).toHaveValue('');
    expect(screen.getByLabelText('Reviewed by')).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: /I acknowledge/i })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Review replacement' })).toBeDisabled();
    expect(revoke).toHaveBeenCalledWith('blob:old-packet');
    await user.click(screen.getByRole('tab', { name: 'Review' }));
    expect(screen.queryByText('Old analysis')).not.toBeInTheDocument();
    expect(screen.queryByText('APP-OLD')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Download evidence PDF' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze evidence' })).toBeEnabled();
  });
  it('confirms destructive replacement before sending the exact API payload and refreshing the case', async () => {
    const { user, api, onChange } = await openImport();
    await readyReplacement(user);
    let dialog = screen.getByRole('dialog', { name: 'Replace this case’s evidence?' });
    expect(dialog).toHaveTextContent('PP-101');
    expect(dialog).toHaveTextContent('ORD-101');
    expect(dialog).toHaveTextContent(/replace all 0 existing records with 1/i);
    expect(dialog).toHaveTextContent(/analysis.*PDF.*approval/i);
    expect(api).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(api).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Source records JSON')).toHaveValue(JSON.stringify([source]));
    await user.click(screen.getByRole('button', { name: 'Review replacement' }));
    dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm replacement' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('PP-101'));
    expect(api).toHaveBeenCalledTimes(1);
    const [path, options] = api.mock.calls[0];
    expect(path).toBe('/cases/PP-101/sources/import');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      sources: [source],
      reviewed_by: 'Test Ops',
      acknowledged_unverified: true,
    });
  });
  it.each([
    ['{', /valid JSON/i],
    ['{}', /JSON array/i],
    ['[]', /1–20 records/i],
    [JSON.stringify(Array(21).fill(source)), /1–20 records/i],
    [JSON.stringify([null]), /Record 1.*object/i],
    [JSON.stringify([{ ...source, type: 'delivery' }]), /Record 1.*type/i],
    [JSON.stringify([{ ...source, id: 'invented' }]), /Record 1.*extra fields/i],
    [JSON.stringify([{ ...source, title: '' }]), /Record 1.*title/i],
    [JSON.stringify([{ ...source, title: 'bad\nline' }]), /Record 1.*title/i],
    [JSON.stringify([{ ...source, text: 123 }]), /Record 1.*text/i],
    [JSON.stringify([{ ...source, text: ' ' }]), /Record 1.*text/i],
    [
      JSON.stringify([{ ...source, text: 'Order: ORD-101\n' + 'é'.repeat(8192) }]),
      /Record 1.*16,384 UTF-8 bytes/i,
    ],
    [JSON.stringify([{ ...source, text: 'Order: ORD-101\n\u0000' }]), /Record 1.*text/i],
    [JSON.stringify([{ ...source, order_id: 'ORD-OTHER' }]), /Record 1.*order_id.*ORD-101/i],
    [JSON.stringify([{ ...source, text: 'Order: ORD-OTHER' }]), /Record 1.*Order: ORD-101/i],
    [JSON.stringify([{ ...source, occurred_at: '2025-01-01T12:00:00' }]), /Record 1.*occurred_at/i],
    [
      JSON.stringify([{ ...source, occurred_at: '2999-01-01T12:00:00Z' }]),
      /Record 1.*occurred_at/i,
    ],
    [
      JSON.stringify([{ ...source, occurred_at: '2025-02-30T12:00:00Z' }]),
      /Record 1.*occurred_at/i,
    ],
  ])('blocks invalid source input %# before any request', async (input, message) => {
    const { api } = await openImport();
    fireEvent.change(screen.getByLabelText('Source records JSON'), { target: { value: input } });
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Review replacement' })).toBeDisabled();
    expect(api).not.toHaveBeenCalled();
  });
  it('requires a single-line reviewer and explicit acknowledgment even with valid JSON', async () => {
    const { user, api } = await openImport();
    enterSources();
    const review = screen.getByRole('button', { name: 'Review replacement' });
    expect(review).toBeDisabled();
    await user.type(screen.getByLabelText('Reviewed by'), '   ');
    await user.click(screen.getByRole('checkbox', { name: /I acknowledge/i }));
    expect(review).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reviewed by'), { target: { value: 'Ops\u0001' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/reviewer.*single.line/i);
    expect(review).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Reviewed by'), { target: { value: 'Test Ops' } });
    expect(review).toBeEnabled();
    await user.click(screen.getByRole('checkbox', { name: /I acknowledge/i }));
    expect(review).toBeDisabled();
    expect(api).not.toHaveBeenCalled();
  });
  it('explains the exact schema, parser text format and provenance before collecting records', async () => {
    await openImport();
    expect(screen.getByLabelText('Source records JSON')).toHaveValue('');
    expect(screen.getByLabelText('Reviewed by')).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: /I acknowledge.*unverified/i })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Review replacement' })).toBeDisabled();
    expect(screen.getByText(/^No real personal data/i)).toBeInTheDocument();
    expect(screen.getByText(/session admin token from Settings/i)).toBeInTheDocument();
    await userEvent.click(screen.getByText('JSON schema and text format examples'));
    expect(screen.getByText(/1–20 records/)).toBeInTheDocument();
    const example = JSON.parse(screen.getByTestId('import-example').textContent);
    expect(example.map((record) => record.type)).toEqual(['order', 'carrier', 'buyer_message']);
    expect(
      example.every(
        (record) => Object.keys(record).sort().join(',') === 'occurred_at,order_id,text,title,type',
      ),
    ).toBe(true);
    expect(
      example.every(
        (record) =>
          record.order_id === detail.order_id && record.text.startsWith('Order: ORD-101\n'),
      ),
    ).toBe(true);
    expect(example[1].text).toContain(
      'Delivery status: DELIVERED\nDelivered at: 2025-01-02T12:00:00Z',
    );
    expect(example[2].text).toContain('Buyer statement: I received the parcel. Thank you.');
    expect(screen.getByText(/case-sensitive.*colon and a space/i)).toBeInTheDocument();
  });
});
