import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CaseReview from '../CaseReview';

const source = {
  id: 'SRC-1',
  type: 'order',
  order_id: 'ORDER-1042',
  title: 'Synthetic order',
  text: 'Order: ORDER-1042',
  sha256: 'c'.repeat(64),
};
const detail = {
  id: 'DEMO-1042',
  order_id: 'ORDER-1042',
  summary: 'Synthetic case',
  sources: [source],
  audit: [],
  analysis: {
    id: 'DEMO-1042',
    packet_hash: 'a'.repeat(64),
    provider: 'lexical-baseline',
    recommendation: 'defend',
    summary: 'Matching evidence.',
    gaps: [],
    contradictions: [],
    readiness: 100,
    can_submit: true,
    claims: [{ text: 'Matching order.', quote: source.text, source_ids: [source.id] }],
  },
};
const result = {
  simulated: true,
  invalidated_approvals: 1,
  previous_packet_hash: 'a'.repeat(64),
  detail: 'Synthetic message added. No PayPal request sent.',
};

describe('visible synthetic evidence drift', () => {
  it('confirms a demo-only late message and immediately clears the old review after acceptance', async () => {
    const user = userEvent.setup();
    const api = vi.fn().mockResolvedValue(result);
    const onChange = vi.fn().mockResolvedValue();
    render(<CaseReview detail={detail} health={{ mode: 'demo' }} api={api} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Simulate late buyer message' }));
    expect(api).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Add synthetic message' }),
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('DEMO-1042'));
    expect(api).toHaveBeenCalledWith('/demo/cases/DEMO-1042/late-message', { method: 'POST' });
    expect(screen.getByText(/Approval invalidated/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve packet' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyze evidence' })).toBeEnabled();
  });
  it('never offers synthetic drift controls in sandbox mode', () => {
    render(
      <CaseReview detail={detail} health={{ mode: 'sandbox' }} api={vi.fn()} onChange={vi.fn()} />,
    );
    expect(
      screen.queryByRole('button', { name: 'Simulate late buyer message' }),
    ).not.toBeInTheDocument();
  });
  it('locks on refresh failure and retries only the readback rather than injecting twice', async () => {
    const user = userEvent.setup();
    const api = vi.fn().mockResolvedValue(result);
    const onChange = vi
      .fn()
      .mockRejectedValueOnce(new Error('Readback unavailable'))
      .mockResolvedValue();
    render(<CaseReview detail={detail} health={{ mode: 'demo' }} api={api} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Simulate late buyer message' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Add synthetic message' }),
    );
    const retry = await screen.findByRole('button', { name: 'Retry drift readback' });
    expect(screen.getByRole('button', { name: 'Analyze evidence' })).toBeDisabled();
    await user.click(retry);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2));
    expect(api).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Analyze evidence' })).toBeEnabled();
  });
});
