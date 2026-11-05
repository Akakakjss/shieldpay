import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EvidenceImport from '../EvidenceImport';

const detail = { id: 'PP-101', order_id: 'ORD-101', sources: [] };
const setup = () => {
  const api = vi.fn().mockResolvedValue({ imported: 1 });
  render(
    <EvidenceImport
      detail={detail}
      health={{ mode: 'sandbox' }}
      api={api}
      onChange={vi.fn().mockResolvedValue()}
      onReplaced={vi.fn()}
      onLockChange={vi.fn()}
    />,
  );
  return { api };
};

describe('raw evidence builder', () => {
  it('revokes raw opt-in when the JSON batch is edited', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Import sandbox evidence'));
    await user.click(screen.getByLabelText('Raw paste builder'));
    await user.selectOptions(screen.getByLabelText('Record type'), 'order');
    fireEvent.change(screen.getByLabelText('Record title'), { target: { value: 'Pasted' } });
    fireEvent.change(screen.getByLabelText('Record timestamp'), {
      target: { value: '2025-01-01T12:00:00Z' },
    });
    fireEvent.change(screen.getByLabelText('Confirm target order'), {
      target: { value: 'ORD-101' },
    });
    fireEvent.change(screen.getByLabelText('Pasted evidence'), {
      target: { value: 'Unstructured text' },
    });
    await user.click(screen.getByRole('button', { name: 'Preview draft' }));
    await user.click(screen.getByRole('button', { name: 'Add to batch' }));
    await user.click(screen.getByLabelText('JSON'));
    const json = screen.getByLabelText('Source records JSON');
    fireEvent.change(json, { target: { value: json.value + ' ' } });
    expect(screen.getByRole('alert')).toHaveTextContent(/exactly one line Order: ORD-101/i);
  });
  it('imports explicitly targeted unstructured prose unchanged with a policy warning', async () => {
    const { api } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Import sandbox evidence'));
    await user.click(screen.getByLabelText('Raw paste builder'));
    await user.selectOptions(screen.getByLabelText('Record type'), 'buyer_message');
    fireEvent.change(screen.getByLabelText('Record title'), { target: { value: 'Message' } });
    fireEvent.change(screen.getByLabelText('Record timestamp'), {
      target: { value: '2025-01-01T12:00:00Z' },
    });
    fireEvent.change(screen.getByLabelText('Confirm target order'), {
      target: { value: 'ORD-101' },
    });
    fireEvent.change(screen.getByLabelText('Pasted evidence'), {
      target: { value: 'Unstructured synthetic message' },
    });
    await user.click(screen.getByRole('button', { name: 'Preview draft' }));
    await user.click(screen.getByRole('button', { name: 'Add to batch' }));
    expect(screen.getByText(/^Deterministic analysis uses exact fields/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Reviewed by'), 'Operator');
    await user.click(screen.getByRole('checkbox', { name: /I acknowledge/i }));
    await user.click(screen.getByRole('button', { name: 'Review replacement' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm replacement' }),
    );
    expect(JSON.parse(api.mock.calls[0][1].body).sources[0].text).toBe(
      'Unstructured synthetic message',
    );
  });
  it('preserves original CRLF line endings when a pasted record is edited', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Import sandbox evidence'));
    await user.click(screen.getByLabelText('Raw paste builder'));
    await user.selectOptions(screen.getByLabelText('Record type'), 'order');
    fireEvent.change(screen.getByLabelText('Record title'), { target: { value: 'Pasted' } });
    fireEvent.change(screen.getByLabelText('Record timestamp'), {
      target: { value: '2025-01-01T12:00:00Z' },
    });
    fireEvent.change(screen.getByLabelText('Confirm target order'), {
      target: { value: 'ORD-101' },
    });
    const field = screen.getByLabelText('Pasted evidence');
    fireEvent.paste(field, { clipboardData: { getData: () => 'Order: ORD-101\r\nTracking: X' } });
    fireEvent.change(field, { target: { value: 'Order: ORD-101\nTracking: XY' } });
    await user.click(screen.getByRole('button', { name: 'Preview draft' }));
    expect(screen.getByTestId('raw-draft-preview').textContent).toContain(
      'Order: ORD-101\r\nTracking: XY',
    );
  });
  it('preserves CRLF clipboard text in the draft and replacement payload', async () => {
    const { api } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Import sandbox evidence'));
    await user.click(screen.getByLabelText('Raw paste builder'));
    await user.selectOptions(screen.getByLabelText('Record type'), 'order');
    fireEvent.change(screen.getByLabelText('Record title'), { target: { value: 'Pasted' } });
    fireEvent.change(screen.getByLabelText('Record timestamp'), {
      target: { value: '2025-01-01T12:00:00Z' },
    });
    fireEvent.change(screen.getByLabelText('Confirm target order'), {
      target: { value: 'ORD-101' },
    });
    const original = 'Order: ORD-101\r\nTracking: TEST-101\r\n';
    fireEvent.paste(screen.getByLabelText('Pasted evidence'), {
      clipboardData: { getData: () => original },
    });
    await user.click(screen.getByRole('button', { name: 'Preview draft' }));
    expect(screen.getByTestId('raw-draft-preview').textContent).toContain(original);
    await user.click(screen.getByRole('button', { name: 'Add to batch' }));
    await user.type(screen.getByLabelText('Reviewed by'), 'Operator');
    await user.click(screen.getByRole('checkbox', { name: /I acknowledge/i }));
    await user.click(screen.getByRole('button', { name: 'Review replacement' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm replacement' }),
    );
    expect(JSON.parse(api.mock.calls[0][1].body).sources[0].text).toBe(original);
  });
  it('locks raw and JSON editors until a failed case refresh is retried', async () => {
    const api = vi.fn().mockResolvedValue({ imported: 1 });
    const onChange = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce();
    render(
      <EvidenceImport
        detail={detail}
        health={{ mode: 'sandbox' }}
        api={api}
        onChange={onChange}
        onReplaced={vi.fn()}
        onLockChange={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByText('Import sandbox evidence'));
    const record = {
      type: 'order',
      title: 'Order',
      text: 'Order: ORD-101',
      occurred_at: '2025-01-01T12:00:00Z',
      order_id: 'ORD-101',
    };
    fireEvent.change(screen.getByLabelText('Source records JSON'), {
      target: { value: JSON.stringify([record]) },
    });
    await user.click(screen.getByLabelText('Raw paste builder'));
    fireEvent.change(screen.getByLabelText('Record title'), { target: { value: 'Unsaved' } });
    await user.type(screen.getByLabelText('Reviewed by'), 'Operator');
    await user.click(screen.getByRole('checkbox', { name: /I acknowledge/i }));
    await user.click(screen.getByRole('button', { name: 'Review replacement' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm replacement' }),
    );
    expect(
      await screen.findByText(/replacement accepted, but case refresh failed/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Record title')).toBeDisabled();
    expect(screen.getByLabelText('Pasted evidence')).toBeDisabled();
    expect(screen.getByLabelText('JSON')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset import draft' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Retry case refresh' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Case refreshed');
    expect(screen.getByLabelText('Record title')).toHaveValue('');
    expect(api).toHaveBeenCalledTimes(1);
  });
  it('requires explicit valid metadata, matching target and enforces UTF-8 limits', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Import sandbox evidence'));
    await user.click(screen.getByLabelText('Raw paste builder'));
    await user.click(screen.getByRole('button', { name: 'Preview draft' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      /type.*title.*text.*order_id.*occurred_at/i,
    );
    await user.selectOptions(screen.getByLabelText('Record type'), 'carrier');
    fireEvent.change(screen.getByLabelText('Record title'), { target: { value: 'Carrier' } });
    fireEvent.change(screen.getByLabelText('Record timestamp'), {
      target: { value: '2025-01-01T12:00:00Z' },
    });
    fireEvent.change(screen.getByLabelText('Confirm target order'), {
      target: { value: 'ORD-OTHER' },
    });
    fireEvent.change(screen.getByLabelText('Pasted evidence'), {
      target: { value: 'é'.repeat(8193) },
    });
    await user.click(screen.getByRole('button', { name: 'Preview draft' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/16,384 UTF-8 bytes/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/order_id must exactly match ORD-101/i);
    expect(screen.queryByRole('button', { name: 'Add to batch' })).not.toBeInTheDocument();
  });
  it.each(['Order: ORD-OTHER', 'Order: ORD-101\nOrder: ORD-101', 'Order:ORD-OTHER'])(
    'retains ambiguous or foreign prose without making it importable: %s',
    async (body) => {
      const { api } = setup();
      const user = userEvent.setup();
      await user.click(screen.getByText('Import sandbox evidence'));
      await user.click(screen.getByLabelText('Raw paste builder'));
      await user.selectOptions(screen.getByLabelText('Record type'), 'buyer_message');
      fireEvent.change(screen.getByLabelText('Record title'), { target: { value: 'Message' } });
      fireEvent.change(screen.getByLabelText('Record timestamp'), {
        target: { value: '2025-01-01T12:00:00Z' },
      });
      fireEvent.change(screen.getByLabelText('Confirm target order'), {
        target: { value: 'ORD-101' },
      });
      fireEvent.change(screen.getByLabelText('Pasted evidence'), { target: { value: body } });
      await user.click(screen.getByRole('button', { name: 'Preview draft' }));
      expect(screen.getByRole('alert')).toHaveTextContent(/exactly one line Order: ORD-101/i);
      expect(screen.getByLabelText('Pasted evidence')).toHaveValue(body);
      expect(screen.queryByRole('button', { name: 'Add to batch' })).not.toBeInTheDocument();
      await user.type(screen.getByLabelText('Reviewed by'), 'Operator');
      await user.click(screen.getByRole('checkbox', { name: /I acknowledge/i }));
      expect(screen.getByRole('button', { name: 'Review replacement' })).toBeDisabled();

      expect(api).not.toHaveBeenCalled();
    },
  );
  it('prevents adding more than 20 records to the batch', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Import sandbox evidence'));
    const record = {
      type: 'order',
      title: 'Order',
      text: 'Order: ORD-101',
      occurred_at: '2025-01-01T12:00:00Z',
      order_id: 'ORD-101',
    };
    fireEvent.change(screen.getByLabelText('Source records JSON'), {
      target: { value: JSON.stringify(Array(20).fill(record)) },
    });
    await user.click(screen.getByLabelText('Raw paste builder'));
    await user.selectOptions(screen.getByLabelText('Record type'), 'order');
    fireEvent.change(screen.getByLabelText('Record title'), { target: { value: 'Order' } });
    fireEvent.change(screen.getByLabelText('Record timestamp'), {
      target: { value: record.occurred_at },
    });
    fireEvent.change(screen.getByLabelText('Confirm target order'), {
      target: { value: 'ORD-101' },
    });
    fireEvent.change(screen.getByLabelText('Pasted evidence'), { target: { value: record.text } });
    await user.click(screen.getByRole('button', { name: 'Preview draft' }));
    expect(screen.getByRole('alert')).toHaveTextContent('1–20 records');
    expect(screen.queryByRole('button', { name: 'Add to batch' })).not.toBeInTheDocument();
  });
  it('resets the draft and batch without retaining stale reviewer or acknowledgement', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Import sandbox evidence'));
    await user.click(screen.getByLabelText('Raw paste builder'));
    fireEvent.change(screen.getByLabelText('Record title'), { target: { value: 'Stale title' } });
    fireEvent.change(screen.getByLabelText('Pasted evidence'), { target: { value: 'Stale text' } });
    await user.type(screen.getByLabelText('Reviewed by'), 'Operator');
    await user.click(screen.getByRole('checkbox', { name: /I acknowledge/i }));
    await user.click(screen.getByRole('button', { name: 'Reset import draft' }));
    expect(screen.getByLabelText('Record title')).toHaveValue('');
    expect(screen.getByLabelText('Pasted evidence')).toHaveValue('');
    expect(screen.getByLabelText('Reviewed by')).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: /I acknowledge/i })).not.toBeChecked();
  });
  it('requires a fresh preview if the batch changes in JSON mode', async () => {
    setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Import sandbox evidence'));
    await user.click(screen.getByLabelText('Raw paste builder'));
    await user.selectOptions(screen.getByLabelText('Record type'), 'order');
    fireEvent.change(screen.getByLabelText('Record title'), { target: { value: 'Order' } });
    fireEvent.change(screen.getByLabelText('Record timestamp'), {
      target: { value: '2025-01-01T12:00:00Z' },
    });
    fireEvent.change(screen.getByLabelText('Confirm target order'), {
      target: { value: 'ORD-101' },
    });
    fireEvent.change(screen.getByLabelText('Pasted evidence'), {
      target: { value: 'Order: ORD-101' },
    });
    await user.click(screen.getByRole('button', { name: 'Preview draft' }));
    await user.click(screen.getByLabelText('JSON'));
    fireEvent.change(screen.getByLabelText('Source records JSON'), { target: { value: '{' } });
    await user.click(screen.getByLabelText('Raw paste builder'));
    expect(screen.queryByRole('button', { name: 'Add to batch' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Preview draft' }));
    expect(screen.getByText(/Fix the existing JSON batch/)).toBeInTheDocument();
  });
  it('previews and adds an explicitly described record verbatim to the protected replacement', async () => {
    const { api } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByText('Import sandbox evidence'));
    expect(screen.getByLabelText('Source records JSON')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Raw paste builder'));
    await user.selectOptions(screen.getByLabelText('Record type'), 'order');
    await user.type(screen.getByLabelText('Record title'), 'Pasted order');
    await user.type(screen.getByLabelText('Record timestamp'), '2025-01-01T12:00:00Z');
    await user.type(screen.getByLabelText('Confirm target order'), 'ORD-101');
    const original = 'Order: ORD-101\nTracking: TEST-101\n  quoted prose  ';
    fireEvent.change(screen.getByLabelText('Pasted evidence'), { target: { value: original } });
    await user.click(screen.getByRole('button', { name: 'Preview draft' }));
    expect(screen.getByTestId('raw-draft-preview').textContent).toContain(original);
    await user.click(screen.getByRole('button', { name: 'Add to batch' }));
    expect(screen.getByText('1 record in batch')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Reviewed by'), 'Operator');
    await user.click(screen.getByRole('checkbox', { name: /I acknowledge/i }));
    await user.click(screen.getByRole('button', { name: 'Review replacement' }));
    expect(api).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm replacement' }),
    );
    expect(JSON.parse(api.mock.calls[0][1].body).sources).toEqual([
      {
        type: 'order',
        title: 'Pasted order',
        text: original,
        occurred_at: '2025-01-01T12:00:00Z',
        order_id: 'ORD-101',
      },
    ]);
    expect(await screen.findByRole('status')).toHaveTextContent('Case refreshed');
    expect(screen.getByLabelText('Pasted evidence')).toHaveValue('');
    expect(screen.getByText('0 records in batch')).toBeInTheDocument();
  });
});
