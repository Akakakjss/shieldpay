import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PacketActions from '../PacketActions';
import CaseReview from '../CaseReview';

const hash = 'a'.repeat(64);
const source = {
  id: 'SOURCE-1',
  order_id: 'ORDER-1',
  title: 'Delivery record',
  type: 'carrier',
  text: 'Delivery confirmed.',
  sha256: 'b'.repeat(64),
  occurred_at: '2027-01-01T12:00:00Z',
};
const detail = {
  id: 'DEMO-1',
  order_id: 'ORDER-1',
  sources: [source],
  audit: [],
  analysis: {
    id: 'DEMO-1',
    packet_hash: hash,
    can_submit: true,
    provider: 'lexical-baseline',
    recommendation: 'defend',
    readiness: 100,
    gaps: [],
    contradictions: [],
    claims: [
      { text: 'The carrier reports delivery.', quote: source.text, source_ids: ['SOURCE-1'] },
    ],
    summary: 'Human review required.',
  },
};
const health = {
  mode: 'demo',
  ai: { provider: 'lexical-baseline', ready: false },
  paypal: { configured: false },
};
let api;
let readback;
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:real-test-packet');
  URL.revokeObjectURL = vi.fn();
  readback = vi.fn(async () => {});
  api = vi.fn(async (path) =>
    path.endsWith('/packet.pdf')
      ? new Blob(['%PDF-1.4 test'])
      : path.endsWith('/approve')
        ? { approval_id: 'APP-1', packet_hash: hash, status: 'approved' }
        : path.endsWith('/submit')
          ? { status: 'simulated', receipt: 'SIM-1', verified: false, detail: 'No PayPal write.' }
          : detail.analysis,
  );
});
async function reviewAndApprove(user) {
  await user.click(screen.getByRole('button', { name: 'Generate PDF packet' }));
  await user.type(screen.getByRole('textbox', { name: 'Approved by' }), 'Reviewer');
  await user.click(screen.getByRole('checkbox', { name: /I reviewed the PDF/ }));
  await user.click(screen.getByRole('button', { name: 'Approve packet' }));
}

describe('packet safety and failure states', () => {
  it('keeps approval disabled when real PDF generation fails', async () => {
    const user = userEvent.setup();
    api.mockRejectedValue(new Error('Analyze this case before building a packet'));
    render(<PacketActions detail={detail} health={health} api={api} onChange={readback} />);
    await user.click(screen.getByRole('button', { name: 'Generate PDF packet' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Analyze this case before building a packet',
    );
    expect(screen.getByRole('button', { name: 'Approve packet' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Download evidence PDF' })).not.toBeInTheDocument();
  });
  it('does not imply approval or submission after a stale-hash rejection', async () => {
    const user = userEvent.setup();
    const normal = api.getMockImplementation();
    api.mockImplementation((path) =>
      path.endsWith('/approve')
        ? Promise.reject(new Error('Stale packet hash; review the current packet'))
        : normal(path),
    );
    render(<PacketActions detail={detail} health={health} api={api} onChange={readback} />);
    await reviewAndApprove(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Stale packet hash');
    expect(screen.getByRole('button', { name: 'Simulate submission' })).toBeDisabled();
    expect(screen.queryByText('Approved locally · not sent to PayPal')).not.toBeInTheDocument();
  });
  it('revokes local approval after a submission failure and makes no success claim', async () => {
    const user = userEvent.setup();
    const normal = api.getMockImplementation();
    api.mockImplementation((path) =>
      path.endsWith('/submit')
        ? Promise.reject(new Error('Submission outcome is uncertain. Reconcile before retrying.'))
        : normal(path),
    );
    render(<PacketActions detail={detail} health={health} api={api} onChange={readback} />);
    await reviewAndApprove(user);
    await user.click(screen.getByRole('button', { name: 'Simulate submission' }));
    await user.click(screen.getByRole('button', { name: 'Confirm simulation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Submission outcome is uncertain');
    expect(screen.getByRole('button', { name: 'Simulate submission' })).toBeDisabled();
    expect(screen.queryByText('Simulated · not submitted to PayPal')).not.toBeInTheDocument();
  });
  it('distinguishes sandbox acceptance from a verified submission', async () => {
    const user = userEvent.setup();
    const normal = api.getMockImplementation();
    api.mockImplementation((path) =>
      path.endsWith('/submit')
        ? Promise.resolve({
            status: 'accepted',
            verified: false,
            receipt: 'REMOTE-1',
            detail: 'Accepted but the readback did not verify attachment.',
          })
        : normal(path),
    );
    render(
      <PacketActions
        detail={detail}
        health={{ ...health, mode: 'sandbox', paypal: { configured: true } }}
        api={api}
        onChange={readback}
      />,
    );
    await reviewAndApprove(user);
    await user.click(screen.getByRole('button', { name: 'Submit to PayPal sandbox' }));
    await user.click(screen.getByRole('button', { name: 'Confirm sandbox submission' }));
    expect(await screen.findByText('Sandbox response · not verified')).toBeInTheDocument();
    expect(screen.getByText('No verified PayPal submission is claimed.')).toBeInTheDocument();
    expect(readback).toHaveBeenCalledTimes(2);
  });
  it('invalidates a downloaded packet and approval on re-analysis even if the hash is unchanged', async () => {
    const user = userEvent.setup();
    render(<CaseReview detail={detail} health={health} api={api} onChange={readback} />);
    await reviewAndApprove(user);
    expect(screen.getByRole('button', { name: 'Simulate submission' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Re-analyze' }));
    expect(await screen.findByRole('button', { name: 'Approve packet' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Simulate submission' })).toBeDisabled();
    expect(screen.queryByRole('link', { name: 'Download evidence PDF' })).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:real-test-packet');
  });
  it.each([
    ['contradiction', { contradictions: ['Conflicting delivery statuses.'] }],
    ['gap', { gaps: ['Missing carrier proof.'] }],
    [
      'cross-order citation',
      { claims: [{ text: 'Unrelated', quote: 'Other order', source_ids: ['OTHER-ORDER-SOURCE'] }] },
    ],
    [
      'invented quotation',
      {
        claims: [
          { text: 'Invented', quote: 'Not present in the source.', source_ids: ['SOURCE-1'] },
        ],
      },
    ],
  ])('fails closed for %s even when the response says can_submit=true', (_, changes) => {
    render(
      <CaseReview
        detail={{ ...detail, analysis: { ...detail.analysis, ...changes } }}
        health={health}
        api={api}
        onChange={readback}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Submission blocked' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve packet' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Simulate submission' })).toBeDisabled();
    expect(api).not.toHaveBeenCalled();
  });
});
