import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PacketActions from '../PacketActions';

it('previews the generated PDF inline while keeping the download and approval gates', async () => {
  URL.createObjectURL = vi.fn(() => 'blob:reviewed-packet');
  URL.revokeObjectURL = vi.fn();
  const api = vi.fn().mockResolvedValue(new Blob(['%PDF-1.4 synthetic']));
  const user = userEvent.setup();
  const props = {
    detail: { id: 'DEMO-1042', analysis: { can_submit: true, packet_hash: 'a'.repeat(64) } },
    health: { mode: 'demo' },
    api,
    onChange: vi.fn(),
  };
  const view = render(<PacketActions {...props} />);
  expect(screen.queryByTitle('Evidence packet PDF preview')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Generate PDF packet' }));
  expect(await screen.findByTitle('Evidence packet PDF preview')).toHaveAttribute(
    'src',
    'blob:reviewed-packet',
  );
  expect(screen.getByRole('link', { name: 'Download evidence PDF' })).toHaveAttribute(
    'href',
    'blob:reviewed-packet',
  );
  expect(screen.getByRole('button', { name: 'Approve packet' })).toBeDisabled();
  expect(api).toHaveBeenCalledWith('/cases/DEMO-1042/packet.pdf', { responseType: 'blob' });
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reviewed-packet');
});

it('shows the server-generated multipart JSON preview without approving or submitting', async () => {
  const user = userEvent.setup();
  const input = {
    evidences: [
      {
        evidence_type: 'PROOF_OF_FULFILLMENT',
        evidence_info: { tracking_info: [{ carrier_name: 'UPS', tracking_number: 'SYNTH-1042' }] },
      },
    ],
  };
  const api = vi.fn().mockResolvedValue({
    preview_only: true,
    environment: 'sandbox',
    input,
    file: { name: 'shieldpay-evidence.pdf', media_type: 'application/pdf' },
    detail: 'Synthetic data preview. No PayPal request sent.',
  });
  render(
    <PacketActions
      detail={{ id: 'DEMO-1042', analysis: { can_submit: true, packet_hash: 'a'.repeat(64) } }}
      health={{ mode: 'demo' }}
      api={api}
      onChange={vi.fn()}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'Preview PayPal JSON + PDF parts' }));
  expect(await screen.findByText(/"tracking_number": "SYNTH-1042"/)).toBeInTheDocument();
  expect(screen.getByText(/application\/json/)).toBeInTheDocument();
  expect(api).toHaveBeenCalledExactlyOnceWith('/cases/DEMO-1042/payload-preview');
  expect(screen.getByRole('button', { name: 'Approve packet' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Simulate submission' })).toBeDisabled();
});
